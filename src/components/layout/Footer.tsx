import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Instagram, Twitter, Facebook, Mail } from 'lucide-react'
import { Container } from './Container';

export function Footer() {
  const t = useTranslations('');

    return (
        <footer className="bg-primary text-primary-foreground">
            <Container>
                <div className="flex items-start gap-8 md:grid-cols-3 align-top">
                    
                    {/* Info Column */}
                    <div className="space-y-4 md:col-span-1">

                        <span className="text-sm font-bold">{t('copyright')}</span>
                  </div>
                    {/* Description*/}
                    <div>
                        <p className="text-xs text-primary-foreground/80 leading-relaxed">
                            {t('footer.description')}
                        </p>
                    </div>
                    {/* Description  */}

                    <div className="flex items-center gap-6 md:justify-end 
">
                        <Link
                            href="#"
                            className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                        >
                            <Instagram className="h-5 w-5" />
                            <span className="sr-only">{t('socialmedia.instagram')}</span>
                        </Link>
                        <Link
                            href="#"
                            className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                        >
                            <Twitter className="h-5 w-5" />
                            <span className="sr-only">{t('socialmedia.twitter')}</span>
                        </Link>
                        <Link
                            href="#"
                            className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                        >
                            <Facebook className="h-5 w-5" />
                            <span className="sr-only">{t('socialmedia.facebook')}</span>
                        </Link>
                        <Link
                            href="#"
                            className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                        >
                            <Mail className="h-5 w-5" />
                            <span className="sr-only">{t('socialmedia.email')}</span>                            
                        </Link>                         
                    </div>
                </div>
                </Container>
                    {/* Social Icons */}
                    {/* <div className="flex items-center gap-4 pt-2 align-end md:justify-end md:col-span-1">
                       
                        {/* <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                            
                            <p className="text-sm text-primary-foreground/60">

                                {t('copyright')}
                            </p>
                            <p className="text-sm text-primary-foreground/80">
                                {t('madeWith')}
                            </p>
                        </div>                         
                    </div>

                </div>   */}

                    {/* Artisans Column */}
                    {/* <div className="space-y-4">
                        <h3 className="font-bold text-lg">{t('artisans.title')}</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('artisans.joinPlatform')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('artisans.uploadCrafts')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('artisans.successStories')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('artisans.support')}
                                </Link>
                            </li>
                        </ul>
                    </div> */}

                    {/* Project Column */}                                
            {/* </div> */}
        </footer>
    )
}

