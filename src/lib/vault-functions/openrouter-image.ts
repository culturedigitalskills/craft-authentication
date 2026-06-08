import type { VaultFunction } from './types'

export interface FluxImageArgs {
    prompt: string
    width?: number
    height?: number
}

export interface FluxImageResult {
    url: string
}

export const generateFluxImage: VaultFunction<FluxImageArgs, FluxImageResult> = {
    name: 'GENERATE_FLUX_IMAGE',
    description: 'Generate an image using black-forest-labs/flux.2-pro via OpenRouter',
    requiredSecretType: 'OPENROUTER_API_KEY',

    async execute(apiKey: string, args: FluxImageArgs): Promise<FluxImageResult> {
        if (!args.prompt?.trim()) {
            throw new Error('prompt is required')
        }

        const width = args.width ?? 1024
        const height = args.height ?? 1024

        const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'black-forest-labs/flux.2-pro',
                prompt: args.prompt,
                n: 1,
                size: `${width}x${height}`,
            }),
        })

        if (!response.ok) {
            // Avoid including the response body in the error — it may echo request data
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json() as { data?: { url: string }[] }
        const url = data?.data?.[0]?.url
        if (!url) throw new Error('No image URL in OpenRouter response')

        return { url }
    },
}
