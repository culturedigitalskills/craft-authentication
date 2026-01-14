'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Instagram, Twitter, Facebook, Mail } from 'lucide-react'

export function Footer() {
    const locale = useLocale()
    const t = useTranslations('footer')

    return (
        <footer className="bg-primary text-primary-foreground">
            <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="grid gap-8 md:grid-cols-4">
                    {/* Info Column */}
                    <div className="space-y-4 md:col-span-1">
                        <Link href={`/${locale}`} className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground text-primary font-bold text-sm">
                                SC
                            </div>
                            <span className="text-lg font-bold">SustainableCrafting</span>
                        </Link>
                        <p className="text-sm text-primary-foreground/80 leading-relaxed">
                            {t('description')}
                        </p>

                        {/* Social Icons */}
                        <div className="flex items-center gap-4 pt-2">
                            <Link
                                href="#"
                                className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                            >
                                <Instagram className="h-5 w-5" />
                                <span className="sr-only">Instagram</span>
                            </Link>
                            <Link
                                href="#"
                                className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                            >
                                <Twitter className="h-5 w-5" />
                                <span className="sr-only">Twitter</span>
                            </Link>
                            <Link
                                href="#"
                                className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                            >
                                <Facebook className="h-5 w-5" />
                                <span className="sr-only">Facebook</span>
                            </Link>
                            <Link
                                href="#"
                                className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                            >
                                <Mail className="h-5 w-5" />
                                <span className="sr-only">Email</span>
                            </Link>
                        </div>
                    </div>

                    {/* Platform Column */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">{t('platform.title')}</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('platform.howItWorks')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('platform.verification')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('platform.mobileApp')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('platform.api')}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Artisans Column */}
                    <div className="space-y-4">
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
                    </div>

                    {/* Project Column */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">{t('project.title')}</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('project.about')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('project.mission')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('project.privacyPolicy')}
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="#"
                                    className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                                >
                                    {t('project.contact')}
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-primary-foreground/60">
                        {t('copyright')}
                    </p>
                    <p className="text-sm text-primary-foreground/80">
                        {t('madeWith')}
                    </p>
                </div>
            </div>
        </footer>
    )
}
