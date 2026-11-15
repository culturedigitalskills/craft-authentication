import { afterEach, describe, expect, it, vi } from 'vitest'
import { publicContacts } from '@/lib/public-contacts'

afterEach(() => vi.unstubAllEnvs())
describe('public correspondence configuration', () => {
    it('uses verified contact pages when deployment emails are not supplied', () => {
        vi.stubEnv('PRIVACY_CONTACT_EMAIL', '')
        vi.stubEnv('LEGAL_CONTACT_EMAIL', '')
        const contacts = publicContacts()
        expect(new URL(contacts.privacy.href).hostname).toBe('www.brighton.ac.uk')
        expect(new URL(contacts.legal.href).hostname).toBe('craftingsustainablejawaja.org')
    })
    it('renders approved deployment values as mail links', () => {
        vi.stubEnv('PRIVACY_CONTACT_EMAIL', 'privacy@example.org')
        vi.stubEnv('LEGAL_CONTACT_EMAIL', 'terms@example.org')
        expect(publicContacts().privacy).toEqual({
            href: 'mailto:privacy@example.org',
            label: 'privacy@example.org',
        })
        expect(publicContacts().legal.href).toBe('mailto:terms@example.org')
    })
    it.each(['not an email', 'privacy@PLACEHOLDER.invalid'])(
        'rejects an invalid or placeholder contact %s',
        (value) => {
            vi.stubEnv('PRIVACY_CONTACT_EMAIL', value)
            expect(() => publicContacts()).toThrow(
                'PRIVACY_CONTACT_EMAIL must be a valid public contact email',
            )
        },
    )
})
