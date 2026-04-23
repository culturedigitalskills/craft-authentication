import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Container } from '@/components/layout/Container'
import { CardTitle, CardContent, CardDescription, CardHeader, Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/dist/client/link'
import Image from 'next/image'
import { Calendar, Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import { formatDateTime } from '@/components/shared/formatDateTime'
import PaginationControls from '@/components/craft/PaginationControls'
import { cookies } from 'next/dist/server/request/cookies'
import { prisma } from '@/lib/prisma'

export default async function MyCraftsPage(
    { searchParams }: { searchParams: { page?: string } }
) {
    const session = await auth()
    if (!session) redirect('/login')

    const params = await searchParams
    const page = params.page ? parseInt(params.page) : 1
    const currentPageUrl = `${process.env.AUTH_URL}/crafts/mycrafts`
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()

    try {
        const res = await fetch(`${process.env.AUTH_URL}/api/data/?page=${page}&limit=21`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader,
            },
        })
        if (!res.ok) throw new Error('Request failed')
        const data = await res.json()

        const allCrafts = data.data
        const pagination = data.pagination

        const crafts = await Promise.all(
            allCrafts
                .filter((record: any) => record.data.artisan === session.user.email)
                .map(async (record: any) => {
                    const mediaIds = record.data['mediaIds']?.filter((id: any) => id !== null) ?? []
                    let imageUrl = null
                    if (mediaIds.length > 0) {
                        const imageRes = await fetch(`${process.env.AUTH_URL}/api/media/${mediaIds[0]}`, {
                            method: 'GET',
                            headers: { 'Cookie': cookieHeader },
                        })
                        imageUrl = imageRes.url
                    }
                    return {
                        id: record.id,
                        title: record.name,
                        createdOn: record.data.createdOn,
                        isPublic: record.data.isPublic,
                        mediaIds,
                        imageUrl,
                    }
                })
        )

        // Look up own artisan name
        const artisan = await prisma.artisan.findFirst({
            where: { user: { email: session.user.email! } },
            select: { firstName: true, lastName: true },
        })
        const artisanName = artisan ? `${artisan.firstName} ${artisan.lastName}` : session.user.name ?? session.user.email

        return <RenderMyCraftsPage crafts={crafts} pagination={pagination} currentPage={page} currentPageUrl={currentPageUrl} artisanName={artisanName} />
    } catch (error) {
        console.error('Error loading my crafts:', error)
    }
}

function RenderMyCraftsPage({ crafts, pagination, currentPage, currentPageUrl, artisanName }: {
    crafts: any[]
    pagination: any
    currentPage: number
    currentPageUrl: string
    artisanName: any
}) {
    const t = useTranslations()

    return (
        <Container>
            <div className="mb-10 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">{t('navbar.myitems')}</h1>
                    <p className="mt-3 text-lg text-muted-foreground">{artisanName}</p>
                </div>
                <Button asChild className="shrink-0">
                    <Link href="/crafts/create">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('navbar.addcraft')}
                    </Link>
                </Button>
            </div>

            {crafts.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {crafts.map((craft) => {
                        const editUrl = `/crafts/create?id=${craft.id}`
                        return (
                            <Card key={craft.id} className="group relative transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
                                <Link href={`/crafts/${craft.id}?from=mycrafts`} className="block">
                                    {/* Image */}
                                    <div className="relative aspect-square overflow-hidden rounded-t-lg">
                                        {craft.imageUrl ? (
                                            <Image
                                                src={craft.imageUrl}
                                                alt={craft.title}
                                                fill
                                                unoptimized
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-200 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-muted">
                                                <p className="text-muted-foreground">{t('crafts.explore.noImageAvailable')}</p>
                                            </div>
                                        )}

                                        {/* Public/private badge */}
                                        <div className="absolute left-2 top-2">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                                                craft.isPublic
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {craft.isPublic
                                                    ? <><Eye className="h-3 w-3" />{t('crafts.details.visible')}</>
                                                    : <><EyeOff className="h-3 w-3" />{t('crafts.details.notvisible')}</>
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <CardHeader className="pb-2">
                                        <CardTitle className="line-clamp-1 transition-colors group-hover:text-primary">
                                            {craft.title}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2">{craft.description}</CardDescription>
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>{formatDateTime(craft.createdOn)}</span>
                                        </div>
                                    </CardContent>
                                </Link>

                                {/* Edit button — outside the Link to avoid nesting */}
                                <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                    <Button size="sm" variant="secondary" asChild>
                                        <Link href={editUrl}>
                                            <Pencil className="mr-1 h-3 w-3" />
                                            Edit
                                        </Link>
                                    </Button>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="rounded-lg border border-dashed border-border p-12 text-center">
                    <Plus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="mb-4 text-muted-foreground">You haven't added any crafts yet.</p>
                    <Button asChild>
                        <Link href="/crafts/create">{t('navbar.addcraft')}</Link>
                    </Button>
                </div>
            )}

            <PaginationControls
                currentPage={currentPage}
                pagination={pagination}
                currentPageUrl={currentPageUrl}
            />
        </Container>
    )
}
