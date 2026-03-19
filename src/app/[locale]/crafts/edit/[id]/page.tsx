import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CraftForm } from '@/components/craft/CraftForm'

type CraftEditPageProps = {
  id: string;
};

export default async function CraftEditPage({ id }: { id: string }) {

     const session = await auth()
    
     if (!session?.user) {
        redirect('/login')
    }

    const craft = await prisma.dataRecord.findUnique({
        where: { id: '0' },
        select: {
            id: true,
            name: true,
            description: true,
            data: true,
        },
    })

    return <CraftForm craft={craft} />


}
