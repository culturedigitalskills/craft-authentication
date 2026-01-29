import Link from 'next/link'
import { Button, buttonVariants } from './ui/button'
import { useTranslations } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { LanguageSelect } from './LanguageSelect';


export function Navbar() {
  const t = useTranslations('');
    return (   
    <nav className="flex justify-end gap-4 md:flex">
      <div className="flex justify-end gap-8">    
        <h3 className="text-1xl font-bold py-3"> <Link href="/" className="text-foreground hover:text-primary transition-colors">{t('navbar.home')}</Link></h3>
        <h3 className="text-1xl font-bold py-3"> <Link href="/about" className="text-foreground hover:text-primary transition-colors">{t('navbar.about')}</Link></h3>
       </div>
       <div className="flex justify-end gap-8">  
       <h3 className={buttonVariants( {variant: 'default'} )}> 
        <Link href="/auth/login" className="text-1xl font-bold text-inherit hover:text-neutral-400">{t('navbar.login')}</Link>
        </h3>
        <LanguageSelect isMobile={false} jsonlan={t('locale')}/>

      </div>
    </nav>   
    );
}