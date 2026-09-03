/**
 * The site's public base URL, without a trailing slash.
 *
 * Interpolating process.env.AUTH_URL directly produces "undefined/..." when the
 * variable is unset, which is merely ugly in a meta tag but permanent in a QR
 * code somebody has printed and attached to their work.
 */
export function siteBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_SERVER_URL || process.env.AUTH_URL
    return (configured || 'https://www.sustainablecrafting.org').replace(/\/+$/, '')
}
