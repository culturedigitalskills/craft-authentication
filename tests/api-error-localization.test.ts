import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createTranslator } from 'next-intl'
import messages from '../messages/tr.json'
import { handleValidationError } from '@/lib/validations/types'
import { parseApiError, httpErrorMessage, fieldIssueMessage } from '@/lib/api-error'

const t = createTranslator({ locale: 'tr', messages, namespace: 'interface' })

describe('localized API errors', () => {
    it('preserves validation codes and limits without requiring English message matching', async () => {
        const result = z.object({ title: z.string().min(3) }).safeParse({ title: 'a' })
        if (result.success) throw new Error('Expected invalid input')
        const parsed = await parseApiError(handleValidationError(result.error))
        expect(parsed.status).toBe(400)
        expect(parsed.issues[0]).toMatchObject({
            path: 'title',
            code: 'too_small',
            origin: 'string',
            minimum: 3,
        })
        expect(fieldIssueMessage(parsed.issues[0], t)).toBe('En az 3 karakter girin.')
    })
    it('returns a local-language service message instead of exposing arbitrary server text', async () => {
        const parsed = await parseApiError(
            Response.json({ error: 'Internal database detail' }, { status: 500 }),
        )
        expect(httpErrorMessage(parsed.status, t)).toBe(
            'İstek tamamlanamadı. Lütfen tekrar deneyin.',
        )
        expect(httpErrorMessage(401, t)).toBe('Devam etmek için giriş yapın.')
        expect(httpErrorMessage(429, t)).toContain('bekleyip')
    })
    it('handles non-JSON responses and malformed detail arrays', async () => {
        expect(await parseApiError(new Response('gateway error', { status: 502 }))).toEqual({
            status: 502,
            error: '',
            issues: [],
        })
        const parsed = await parseApiError(
            Response.json(
                {
                    details: [
                        null,
                        'bad',
                        { path: 1 },
                        { path: 'field', message: 'raw', code: 'unknown' },
                    ],
                },
                { status: 400 },
            ),
        )
        expect(parsed.issues).toHaveLength(1)
        expect(fieldIssueMessage(parsed.issues[0], t)).toBe('Lütfen bu değeri kontrol edin.')
    })
})
