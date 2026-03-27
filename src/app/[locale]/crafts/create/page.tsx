import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CraftForm } from '@/components/craft/CraftForm'

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CraftCreatePage(
  { searchParams }:
   { searchParams: { id?: string } }) {

  const params = await searchParams
    const id = params.id
    console.log('Craft ID from URL in Create Page:', id)

    const session = await auth()
     if (!session?.user) {
        redirect('/login')
    }

    console.log(session.user)
    let craft: any = null
    if (id) {
        craft = await prisma.dataRecord.findUnique({
            where: { id: id },
            select: {
                id: true,
                name: true,
                description: true,
                data: true
            },
        })  
        // console.log('Craft from DB:', craft)  
    }
    // console.log('***Craft from DB:', craft)  


    return (
        <div className="container mx-auto px-4 py-10">
            <CraftForm user={session.user?.email ?? null} craft={craft} />
        </div>
    )


}
