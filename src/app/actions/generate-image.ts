'use server'
import { z } from 'zod'
import { getVaultSecret } from '@/lib/vault-server'

const GenerateImageArgsSchema = z.object({
    prompt: z.string().min(1),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
})

export type GenerateImageArgs = z.infer<typeof GenerateImageArgsSchema>

export async function generateImageAction(args: GenerateImageArgs): Promise<{ url: string }> {
    const { prompt, width = 1024, height = 1024 } = GenerateImageArgsSchema.parse(args)

    const apiKey = await getVaultSecret('OPENROUTER_API_KEY')

    const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'black-forest-labs/flux.2-pro',
            prompt,
            n: 1,
            size: `${width}x${height}`,
        }),
    })

    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as { data?: { url: string }[] }
    const url = data?.data?.[0]?.url
    if (!url) throw new Error('No image URL in OpenRouter response')

    return { url }
}
