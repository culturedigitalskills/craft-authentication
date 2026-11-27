import { headers } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { betterAuthInstance } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deletionCredentials, REAUTH_WINDOW_MS } from '@/lib/account-deletion-auth'
import { redirect } from '@/i8n/navigation'
import { HideProfile } from '@/components/account/HideProfile'
import { DeleteAccountForm } from '@/components/account/DeleteAccountForm'
import { publicContacts } from '@/lib/public-contacts'

export default async function AccountPage() {
    const session = await betterAuthInstance.api.getSession({
        headers: await headers(),
        query: { disableCookieCache: true },
    })
    if (!session) return redirect({ href: '/login', locale: await getLocale() })
    const t = await getTranslations('accountDeletion')
    const userId = session.user.id
    const [credentials, crafts, media, stories, artisan] = await Promise.all([
        deletionCredentials(userId),
        prisma.craft.count({ where: { artisan: { userId } } }),
        prisma.mediaFile.count({ where: { uploaderId: userId } }),
        prisma.craftStory.count({ where: { artisan: { userId } } }),
        prisma.artisan.findUnique({ where: { userId }, select: { id: true, deletedAt: true } }),
    ])
    return (
        <div className="sc-container max-w-2xl space-y-6 py-12">
            <h1 className="sc-h2">{t('settings')}</h1>
            {artisan && <HideProfile id={artisan.id} hidden={!!artisan.deletedAt} />}
            <section className="space-y-4 rounded-xl border border-border p-6">
                <h2 className="text-xl font-semibold">{t('title')}</h2>
                <p>{t('scope')}</p>
                <p>{t('inventory', { crafts, media, stories })}</p>
                <p className="text-sm text-muted-foreground">
                    {t('limits')}{' '}
                    <a className="underline" href={publicContacts().privacy.href}>
                        {t('contact')}
                    </a>
                </p>
                <DeleteAccountForm
                    userId={userId}
                    email={session.user.email}
                    passwordAccount={!!credentials.password}
                    google={credentials.google}
                    fresh={
                        Date.now() - new Date(session.session.createdAt).getTime() <=
                        REAUTH_WINDOW_MS
                    }
                />
            </section>
        </div>
    )
}
