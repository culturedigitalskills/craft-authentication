import Link from 'next/link'
import { buttonVariants } from './ui/button'
import { useTranslations } from 'next-intl'

export function Navbar() {
    const t = useTranslations();
    return (   
    <nav className="w-full flex justify-end gap-10 md:flex">
      <div className="flex justify-end gap-8">    
        <h3 className="text-1xl font-bold py-3"> <Link href="/" className="text-foreground hover:text-primary transition-colors">{t('navigation.home')}</Link></h3>
        <h3 className="text-1xl font-bold py-3"> <Link href="/about" className="text-foreground hover:text-primary transition-colors">{t('navigation.about')}</Link></h3>
        
       </div>
       <div className="flex justify-end gap-8">  
       <h3 className={buttonVariants(   {variant: 'default'} )}> 
        <Link href="/auth/login" className="#white hover:text-primary transition-colors">{t('navigation.login')}</Link>
        </h3>
      </div>
    </nav>   
    );
}