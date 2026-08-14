import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-guard'
import { errorResponse } from '@/lib/validations/types'
import { summaryDraftLimiter } from '@/lib/rate-limiter'
import { ANSWER_KEYS } from '@/lib/validations/craftStory'
import type { TranscriptSegment } from '@/lib/vtt'
import enMessages from '../../../../../../../../messages/en.json'

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_TIMEOUT_MS = 30_000
// Keep each answer block bounded so a long story can't blow the context window.
const MAX_BLOCK_CHARS = 1500

function chatModel(): string {
    return process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile'
}

function englishTitle(index: number): string {
    const craftStory = (enMessages as unknown as { craftStory: Record<string, { title?: string }> })
        .craftStory
    return craftStory[`step${index + 1}`]?.title ?? `Question ${index + 1}`
}

function clip(text: string): string {
    return text.length > MAX_BLOCK_CHARS ? `${text.slice(0, MAX_BLOCK_CHARS)}…` : text
}

export async function POST() {
    const { session, unauthorized } = await requireAuth()
    if (unauthorized) return unauthorized

    try {
        await summaryDraftLimiter.consume(`user:${session!.user.id}`, 1)
    } catch {
        return errorResponse('Too many summary requests. Please try again later.', 429)
    }

    try {
        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) return errorResponse('Summary drafting is not configured', 503)

        const artisan = await prisma.artisan.findUnique({
            where: { userId: session!.user.id },
            select: { id: true },
        })
        if (!artisan) return errorResponse('Artisan profile required', 409)

        const story = await prisma.craftStory.findUnique({ where: { artisanId: artisan.id } })
        if (!story) return errorResponse('No story to summarize', 404)

        // Transcript text for any spoken answers, so the summary can draw on what
        // the artisan actually said, not only what they typed.
        const answerMediaIds = ANSWER_KEYS.map(k => story[`answer${k}MediaId` as const]).filter(
            (v): v is string => typeof v === 'string',
        )
        const transcripts = await prisma.mediaTranscript.findMany({
            where: { mediaId: { in: answerMediaIds }, status: 'READY' },
            select: { mediaId: true, segments: true },
        })
        const transcriptText = new Map(
            transcripts.map(t => {
                const segs = (t.segments as unknown as TranscriptSegment[]) ?? []
                return [t.mediaId, segs.map(s => s.text).join(' ').trim()]
            }),
        )

        const blocks: string[] = []
        ANSWER_KEYS.forEach((key, i) => {
            const typed = (story[`answer${key}Text` as const] ?? '').toString().trim()
            const mediaId = story[`answer${key}MediaId` as const]
            const spoken = mediaId ? transcriptText.get(mediaId) ?? '' : ''
            if (!typed && !spoken) return
            const parts = [`Q: ${englishTitle(i)}`]
            if (typed) parts.push(`Written: ${typed}`)
            if (spoken) parts.push(`Spoken: ${spoken}`)
            blocks.push(clip(parts.join('\n')))
        })

        if (blocks.length === 0) {
            return NextResponse.json(
                { error: 'EMPTY_STORY', message: 'Add some answers before drafting a summary.' },
                { status: 400 },
            )
        }

        const systemPrompt =
            'You write a warm, first-person summary of an artisan\'s craft story in about 100 words. ' +
            'Use only facts present in the material. Plain prose in English, no headings, no markdown, ' +
            'no invented details. Write as the artisan ("I").'

        const res = await fetch(GROQ_CHAT_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: chatModel(),
                temperature: 0.5,
                max_tokens: 300,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: blocks.join('\n\n') },
                ],
            }),
            signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
        })
        if (!res.ok) {
            const body = await res.text().catch(() => '')
            console.error(`Groq summary failed (${res.status}): ${body.slice(0, 300)}`)
            return errorResponse('Could not draft a summary right now. Please try again.', 502)
        }

        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
        const draft = data.choices?.[0]?.message?.content?.trim()
        if (!draft) return errorResponse('Could not draft a summary right now. Please try again.', 502)

        return NextResponse.json({ draft })
    } catch (error) {
        console.error('Error drafting story summary:', error)
        return errorResponse('Failed to draft summary', 500)
    }
}
