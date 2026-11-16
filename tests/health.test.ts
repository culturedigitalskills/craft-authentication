import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from '@/app/health/route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

describe('readiness response', () => {
    it('confirms the application can reach its database', async () => {
        vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }])
        const response = await GET()
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ status: 'healthy' })
        expect(response.headers.get('cache-control')).toBe('no-store')
        expect(response.headers.get('x-robots-tag')).toContain('noindex')
    })
    it('fails without exposing database errors when the database is unavailable', async () => {
        vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('private connection detail'))
        const response = await GET()
        expect(response.status).toBe(503)
        expect(await response.json()).toEqual({ status: 'unavailable' })
    })
})
