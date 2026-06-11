import { 
    generateVaultSetup, 
    unwrapVaultKeyWithRecoveryToken, 
    encryptPayload, 
    decryptPayload, 
    generateVerificationToken, 
    asymmetricWrapMasterKey 
} from '../src/lib/crypto-vault'
import { KMS } from '../src/lib/kms'
import { decryptPayloadServer } from '../src/lib/user-secrets-service'
import crypto from 'crypto'

async function runTests() {
    console.log('--- Starting Cryptographic Vault Integration Tests ---')
    const userId = 'test-user-id-uuid-12345'
    const testSecretPlaintext = 'my-super-secret-openai-api-key-12345'

    try {
        // 1. Generate vault setup (client-side)
        console.log('1. Generating client-side vault setup...')
        const { rawMasterKey, recoveryToken, wrappedKeyPayload } = await generateVaultSetup()
        console.log(`   Recovery Token: ${recoveryToken}`)
        console.log(`   Wrapped Key Payload (length): ${wrappedKeyPayload.length}`)

        // 2. Unwrap vault key using Recovery Token (client-side)
        console.log('2. Verifying Recovery Token unwrapping...')
        const unwrappedMasterKey = await unwrapVaultKeyWithRecoveryToken(recoveryToken, wrappedKeyPayload)
        
        const keysMatch = Buffer.compare(Buffer.from(rawMasterKey), Buffer.from(unwrappedMasterKey)) === 0
        if (!keysMatch) {
            throw new Error('FAILED: Unwrapped master key does not match original master key')
        }
        console.log('   SUCCESS: Unwrapped master key matches original')

        // 3. Encrypt and decrypt a payload (client-side)
        console.log('3. Verifying client-side encryption and decryption of secrets...')
        const encryptedSecret = await encryptPayload(testSecretPlaintext, rawMasterKey)
        console.log(`   Ciphertext JSON: ${encryptedSecret}`)
        
        const decryptedSecret = await decryptPayload(encryptedSecret, rawMasterKey)
        if (decryptedSecret !== testSecretPlaintext) {
            throw new Error(`FAILED: Decrypted secret (${decryptedSecret}) does not match original (${testSecretPlaintext})`)
        }
        console.log('   SUCCESS: Decrypted secret matches original')

        // 4. Verification Token generation & Server-side hashing
        console.log('4. Verifying Verification Token generation and validation...')
        const verificationToken = await generateVerificationToken(rawMasterKey, userId)
        
        // Server hashes verificationToken using SHA-256
        const serverStoredHash = crypto
            .createHash('sha256')
            .update(Buffer.from(verificationToken, 'base64'))
            .digest('base64')

        // Simulate client presenting verificationToken during re-escrow
        const presentedToken = verificationToken
        const verificationHash = crypto
            .createHash('sha256')
            .update(Buffer.from(presentedToken, 'base64'))
            .digest('base64')

        if (verificationHash !== serverStoredHash) {
            throw new Error('FAILED: Verification hashes do not match')
        }
        console.log('   SUCCESS: Verification hashes match perfectly')

        // 5. KMS Public Key retrieval
        console.log('5. Retrieving KMS Public Key...')
        const kmsPublicKey = KMS.getPublicWrappingKey()
        console.log('   KMS Public Key retrieved successfully')

        // 6. Client asymmetrically wraps the MasterVaultKey
        console.log('6. Asymmetrically wrapping MasterVaultKey with KMS public key...')
        const asymmetricallyWrapped = await asymmetricWrapMasterKey(rawMasterKey, kmsPublicKey)
        console.log(`   Asymmetrically Wrapped Key length: ${asymmetricallyWrapped.length}`)

        // 7. Server KMS wraps the key symmetrically
        console.log('7. Simulating server-side KMS wrap...')
        const symmetricallyWrapped = await KMS.wrapMasterKey(asymmetricallyWrapped)
        console.log(`   Symmetrically Wrapped (database field): ${symmetricallyWrapped}`)

        // 8. Server KMS unwraps the key
        console.log('8. Simulating server-side KMS unwrap...')
        const kmsUnwrappedMasterKey = await KMS.unwrapMasterKey(symmetricallyWrapped)
        
        const kmsKeysMatch = Buffer.compare(Buffer.from(rawMasterKey), Buffer.from(kmsUnwrappedMasterKey)) === 0
        if (!kmsKeysMatch) {
            throw new Error('FAILED: KMS unwrapped key does not match original')
        }
        console.log('   SUCCESS: KMS unwrapped key matches original')

        // 9. Server-side Secret Decryption Service
        console.log('9. Verifying server-side secrets decryption helper...')
        const decryptedSecretServer = decryptPayloadServer(encryptedSecret, kmsUnwrappedMasterKey)
        if (decryptedSecretServer !== testSecretPlaintext) {
            throw new Error(`FAILED: Server decrypted secret (${decryptedSecretServer}) does not match original`)
        }
        console.log('   SUCCESS: Server-side decryption helper matches perfectly')

        console.log('\n==================================================')
        console.log('🎉 ALL CRYPTOGRAPHIC VAULT TESTS PASSED SUCCESSFULLY! 🎉')
        console.log('==================================================')
    } catch (err: any) {
        console.error('\n❌ TEST SUITE FAILED with error:', err)
        process.exit(1)
    }
}

runTests()
