import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Globe, Mail } from 'lucide-react'
import { FaBluesky } from 'react-icons/fa6'

function InstagramIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
    )
}

function FacebookIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    )
}

export function Footer() {
    const t = useTranslations('')

    return (
        <footer className="sc-dark" style={{ background: 'var(--sc-ink-deep)' }}>
            <div className="sc-container py-8">
                {/* Stack on mobile, row on desktop */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Copyright & description */}
                    <div className="min-w-0 space-y-1">
                        <span
                            className="text-base font-semibold"
                            style={{ fontFamily: 'var(--sc-font-display)', color: 'var(--sc-text-on-dark)' }}
                        >
                            {t('copyright')}
                        </span>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--sc-text-on-dark-muted)' }}>
                            {t('footer.description')}
                        </p>
                    </div>

                    {/* Social icons */}
                    <div className="flex shrink-0 items-center gap-4">
                        <Link href="https://craftingsustainablejawaja.org/" className="transition-opacity hover:opacity-100" style={{ color: 'var(--sc-text-on-dark-muted)' }}>
                            <Globe className="h-5 w-5" />
                            <span className="sr-only">{t('socialmedia.website')}</span>
                        </Link>
                        <Link href="https://bsky.app/profile/cultinformatics.bsky.social" className="transition-opacity hover:opacity-100" style={{ color: 'var(--sc-text-on-dark-muted)' }}>
                            <FaBluesky className="h-5 w-5" />
                            <span className="sr-only">{t('socialmedia.bluesky')}</span>
                        </Link>
                        <Link href="mailto:info@culturedigitalskills.org?subject=Enquiry%20Sustainable%20Crafting" className="transition-opacity hover:opacity-100" style={{ color: 'var(--sc-text-on-dark-muted)' }}>
                            <Mail className="h-5 w-5" />
                            <span className="sr-only">{t('socialmedia.email')}</span>
                        </Link>
                    </div>
                </div>

                {/* Policy links */}
                <div
                    className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-xs"
                    style={{ borderColor: 'var(--sc-text-on-dark-muted)', color: 'var(--sc-text-on-dark-muted)' }}
                >
                    <Link href="/terms" className="transition-opacity hover:opacity-100 hover:underline">
                        {t('footer.terms')}
                    </Link>
                    <Link href="/privacy" className="transition-opacity hover:opacity-100 hover:underline">
                        {t('footer.privacy')}
                    </Link>
                </div>
            </div>
        </footer>
    )
}
