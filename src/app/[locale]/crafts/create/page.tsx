import { getLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from '@/i8n/navigation'
import { CraftWizard } from '@/components/craft/CraftWizard'
import { getCraftMediaItems } from '@/lib/craft'

export default async function CraftCreatePage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const { id } = await searchParams

    const session = await auth()
    if (!session?.user) {
        return redirect({ href: '/login', locale: await getLocale() })
    }

    // Crafts belong to an artisan profile, so send anyone without one to
    // onboarding rather than letting them fill in the whole wizard and hit a
    // 409 at the end.
    const artisan = await prisma.artisan.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (!artisan) {
        return redirect({ href: '/onboarding/artisan', locale: await getLocale() })
    }

    let craft = null
    if (id) {
        const record = await prisma.craft.findFirst({
            where: { id, deletedAt: null },
            include: { artisan: { select: { userId: true } } },
        })

        // Only the owner (or a site admin) may open a craft for editing.
        if (!record) return redirect({ href: '/crafts', locale: await getLocale() })
        if (record.artisan.userId !== session.user.id && session.user.role !== 'ADMIN') {
            return redirect({ href: '/crafts', locale: await getLocale() })
        }

        const media = await getCraftMediaItems(record.id)
        craft = {
            id: record.id,
            title: record.title,
            description: record.description,
            materials: record.materials,
            technique: record.technique,
            timeToMake: record.timeToMake,
            width: record.width,
            height: record.height,
            depth: record.depth,
            dimensionUnit: record.dimensionUnit,
            weight: record.weight,
            weightUnit: record.weightUnit,
            inspiration: record.inspiration,
            careInstructions: record.careInstructions,
            isPublic: record.isPublic,
            isSharedLocation: record.isSharedLocation,
            latitude: record.latitude,
            longitude: record.longitude,
            place: record.place,
            videos: record.videos,
            media,
        }
    }

    return (
        <div className="container mx-auto px-4 py-10">
            <CraftWizard craft={craft} />
        </div>
    )
}
