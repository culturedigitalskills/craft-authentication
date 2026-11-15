import 'server-only'
import { z } from 'zod'

const emailSchema = z.email().refine((value) => !value.toLowerCase().endsWith('.invalid'))

function contact(
    key: 'PRIVACY_CONTACT_EMAIL' | 'LEGAL_CONTACT_EMAIL',
    fallback: string,
    label: string,
) {
    const value = process.env[key]?.trim()
    if (!value) return { href: fallback, label }
    const parsed = emailSchema.safeParse(value)
    if (!parsed.success) throw new Error(key + ' must be a valid public contact email')
    return { href: 'mailto:' + parsed.data, label: parsed.data }
}

export function publicContacts() {
    return {
        privacy: contact(
            'PRIVACY_CONTACT_EMAIL',
            'https://www.brighton.ac.uk/about-us/statistics-and-legal/requesting-information/index.aspx',
            'the University of Brighton data protection contact page',
        ),
        legal: contact(
            'LEGAL_CONTACT_EMAIL',
            'https://craftingsustainablejawaja.org/contact/',
            'the project contact page',
        ),
    }
}
