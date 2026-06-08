import type { VaultFunction } from './types'
import { generateFluxImage } from './openrouter-image'

export const VAULT_FUNCTIONS: Record<string, VaultFunction<any, any>> = {
    [generateFluxImage.name]: generateFluxImage,
}

export type { VaultFunction }
