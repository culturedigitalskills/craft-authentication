import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { generateCraftVC } from '@/lib/did/vc'
import { DOMAIN } from '@/lib/did/config'

// Import route handlers directly to execute in-memory
import { GET as signingTestGet } from '@/app/api/vc/signing-test/route'
import { POST as verifyPost } from '@/app/api/vc/verify/route'
import { GET as craftIdGet } from '@/app/api/vc/[craftId]/route'

describe('Verifiable Credentials (VC) API Integration Tests', () => {
    let createdVc: any
    const testCraftId = `craft-${crypto.randomUUID()}`

    beforeAll(async () => {
        // Generate a valid Verifiable Credential using our VC library
        createdVc = await generateCraftVC(
            testCraftId,
            'Handcrafted Mug',
            'Beautiful clay mug fired in wood kiln',
            'artisan-uuid-12345',
            new Date().toISOString(),
            'https://example.com/mug.png'
        )
    })

    afterAll(async () => {
        // Clean up database records
        const credentialId = `${DOMAIN}/credentials/crafts/${testCraftId}`
        await prisma.verifiableCredential.deleteMany({
            where: { credentialId }
        })
    })

    it('should pass the self-signing test route', async () => {
        const req = new NextRequest('http://localhost/api/vc/signing-test')
        const res = await signingTestGet(req)
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.ok).toBe(true)
        expect(body.signed).toBe(true)
        expect(body.verified).toBe(true)
    })

    it('should verify a valid credential successfully', async () => {
        const req = new NextRequest('http://localhost/api/vc/verify', {
            method: 'POST',
            body: JSON.stringify(createdVc)
        })
        const res = await verifyPost(req)
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.verified).toBe(true)
        expect(body.error).toBeNull()
        expect(body.credential.id).toBeNull()
    })

    it('should reject invalid or missing fields during verification', async () => {
        // Missing proof
        const invalidVc = { ...createdVc }
        delete invalidVc.proof

        const req = new NextRequest('http://localhost/api/vc/verify', {
            method: 'POST',
            body: JSON.stringify(invalidVc)
        })
        const res = await verifyPost(req)
        const body = await res.json()

        expect(res.status).toBe(400)
        expect(body.error).toContain('Missing required credential fields')
    })

    it('should retrieve a stored credential via GET /api/vc/[craftId]', async () => {
        // Step 1: Pre-populate database with the credential record
        const credentialId = `${DOMAIN}/credentials/crafts/${testCraftId}`
        await prisma.verifiableCredential.create({
            data: {
                credentialId,
                issuerDid: createdVc.issuer.id,
                holderDid: createdVc.credentialSubject.ownerId,
                credentialType: 'CraftCredential',
                credentialSubject: createdVc.credentialSubject,
                proof: createdVc.proof,
                issuanceDate: new Date(createdVc.proof.created),
            }
        })

        // Step 2: Query the GET route
        const req = new NextRequest(`http://localhost/api/vc/${testCraftId}`)
        const res = await craftIdGet(req, {
            params: Promise.resolve({ craftId: testCraftId })
        })
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.id).toBe(credentialId)
        expect(body.proof.signature).toBe(createdVc.proof.signature)
        expect(res.headers.get('Content-Disposition')).toContain(`attachment; filename="credential-${testCraftId}.json"`)
    })

    it('should return 404 for a non-existent credential ID', async () => {
        const req = new NextRequest(`http://localhost/api/vc/non-existent-id`)
        const res = await craftIdGet(req, {
            params: Promise.resolve({ craftId: 'non-existent-id' })
        })
        const body = await res.json()

        expect(res.status).toBe(404)
        expect(body.error).toBe('Credential not found')
    })
})
