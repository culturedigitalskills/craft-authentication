import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Navbar } from './Navbar';

export function Header() {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center space-x-3 transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-white">SC</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary">{t('header.companyName')}</h1>
            <p className="text-xs text-muted-foreground">{t('header.tagline')}</p>
          </div>
        </Link>
        <Navbar/>
        
        
      </div>
    </header>
  );
}
