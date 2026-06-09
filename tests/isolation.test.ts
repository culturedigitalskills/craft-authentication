import { describe, it, expect } from 'vitest'
import { verifyClientDecodedKeyAction, verifyDecryptedSecretAction } from '@/app/actions/vault'

describe('Server Actions Environment Isolation Tests', () => {
    it('should block development-only server actions in non-development environments', async () => {
        const originalNodeEnv = process.env.NODE_ENV
        
        try {
            // Simulate production mode
            process.env.NODE_ENV = 'production'

            await expect(
                verifyClientDecodedKeyAction('test-user-id', 'some-key')
            ).rejects.toThrow('only available in development mode')

            await expect(
                verifyDecryptedSecretAction('test-user-id', 'OPENAI_API_KEY')
            ).rejects.toThrow('only available in development mode')
        } finally {
            // Restore environment to original state
            process.env.NODE_ENV = originalNodeEnv
        }
    })
})
