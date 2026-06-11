import { z } from 'zod'

export const SecretTypeSchema = z.enum(['OPENROUTER_API_KEY', 'C2PA_PUB', 'C2PA_PRIV'])
export type SecretType = z.infer<typeof SecretTypeSchema>

export const StoreSecretBodySchema = z.object({
    type: SecretTypeSchema,
    ciphertext_data: z.string().min(1),
})

export const InitializeVaultBodySchema = z.object({
    user_id: z.string().min(1),
    recovery_token_wrapped_key: z.string().min(1),
    sse_kms_asymmetrically_wrapped_key: z.string().min(1).optional(),
    verification_token: z.string().min(1),
})

export const RotateKeyBodySchema = z.object({
    new_recovery_token_wrapped_key: z.string().min(1),
    new_sse_kms_asymmetrically_wrapped_key: z.string().min(1).optional(),
    re_encrypted_secrets: z.array(z.object({
        type: SecretTypeSchema,
        ciphertext_data: z.string().min(1),
    })).optional(),
    verification_token: z.string().min(1),
    new_verification_token: z.string().min(1).optional(),
})
