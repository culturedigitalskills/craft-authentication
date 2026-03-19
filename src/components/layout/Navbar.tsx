'use client';
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LanguageSelect } from '../LanguageSelect';
import { NavbarAuth } from './NavbarAuth';
import { useSession } from 'next-auth/react';
import { auth } from '@/lib/auth';
import { FileText, Folder, Image, Music, Plus, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { is } from 'zod/v4/locales';


export function Navbar() {
    const { data: session, status } = useSession()
    const t = useTranslations('')
    // My user is authenticated, show the full navbar with all links and the user menu
  //   if (session?.user) {
  //   return (
  //     <div className="flex justify-end gap-8">
  //     {/* Home navigation links */}
  //     <h3 className="text-1xl font-bold py-3"> 
  //       <Link href="/" className="text-foreground hover:text-primary transition-colors">
  //       {t('navbar.home')}
  //       </Link>
  //     </h3>      
  //     {/* About navigation links */}
  //     <h3 className="text-1xl font-bold py-3"> 
  //       <Link href="/about" className="text-foreground hover:text-primary transition-colors">
  //       {t('navbar.about')}
  //     </Link>
  //     </h3>
  //     <DropdownMenu>
  //       <DropdownMenuTrigger asChild>
  //       <h3 className="text-1xl font-bold py-3"> 
  //       <Link href="/crafts" className="text-foreground hover:text-primary transition-colors">{t('navbar.crafts')}</Link></h3>
  //       </DropdownMenuTrigger>
  //     <DropdownMenuContent className="w-56">
  //     <DropdownMenuItem asChild>
  //       <Link href="/crafts">
  //         {t('navbar.seecrafts')}
  //       </Link>
  //     </DropdownMenuItem>
  //     <DropdownMenuItem asChild>
  //     <Link href="/crafts/create">{t('navbar.addcraft')}</Link>
  //     </DropdownMenuItem>
  //     {/* …etc… */}
  //     </DropdownMenuContent>
  //     </DropdownMenu>
  //     <NavbarAuth />
  //     <LanguageSelect isMobile={false} jsonlan={t('locale')}/>
  //     </div>
  //    );      
  //   // My user is not authenticated, so can only see craft products and artisans, and the login button
  //  }else{
    return (
    <nav className="flex justify-end gap-4 md:flex">
      <div className="flex justify-end gap-8">
        <h3 className="text-1xl font-bold py-3"> 
          <Link href="/" className="text-foreground hover:text-primary transition-colors">
          {t('navbar.home')}
          </Link>
        </h3>
        <h3 className="text-1xl font-bold py-3"> 
          <Link href="/about" className="text-foreground hover:text-primary transition-colors">
          {t('navbar.about')}
          </Link>
        </h3>
        <h3 className="text-1xl font-bold py-3"> 
          <Link href="/crafts" className="text-foreground hover:text-primary transition-colors">
          {t('navbar.crafts')}
        </Link>
        </h3>
        <h3 className="text-1xl font-bold py-3"> 
          <Link href="/create" className="text-foreground hover:text-primary transition-colors">
          {t('navbar.addcraft')}
        </Link>
        </h3>        
       </div>
       <div className="flex items-center justify-end gap-8">
        <NavbarAuth />
        <LanguageSelect isMobile={false} jsonlan={t('locale')}/>
      </div>
    </nav>
    );      
    // }

    
}