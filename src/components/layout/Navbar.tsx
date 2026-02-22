import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LanguageSelect } from '../LanguageSelect';
import { NavbarAuth } from './NavbarAuth';


export function Navbar() {
  const t = useTranslations('');
    return (
    <nav className="flex justify-end gap-4 md:flex">
      <div className="flex justify-end gap-8">
        <h3 className="text-1xl font-bold py-3"> <Link href="/" className="text-foreground hover:text-primary transition-colors">{t('navbar.home')}</Link></h3>
        <h3 className="text-1xl font-bold py-3"> <Link href="/about" className="text-foreground hover:text-primary transition-colors">{t('navbar.about')}</Link></h3>
        <h3 className="text-1xl font-bold py-3"> <Link href="/crafts" className="text-foreground hover:text-primary transition-colors">{t('navbar.crafts')}</Link></h3>
       </div>
       <div className="flex items-center justify-end gap-8">
        <NavbarAuth />
        <LanguageSelect isMobile={false} jsonlan={t('locale')}/>
      </div>
    </nav>
    );
}