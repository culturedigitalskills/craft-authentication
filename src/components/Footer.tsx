import { Instagram, Twitter, Facebook, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl'

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="bg-primary py-16 text-white">
      <div className="container mx-auto px-4">
        <div className="mb-8 grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                <span className="text-sm font-bold text-primary">SC</span>
              </div>
              <span className="text-lg font-bold">{t('footer.companyName')}</span>
            </div>
            <p className="mb-4 leading-relaxed text-white/80">{t('footer.description')}</p>
            <div className="flex space-x-4">
              <Instagram className="h-5 w-5 cursor-pointer text-white/60 transition-colors hover:text-white" />
              <Twitter className="h-5 w-5 cursor-pointer text-white/60 transition-colors hover:text-white" />
              <Facebook className="h-5 w-5 cursor-pointer text-white/60 transition-colors hover:text-white" />
              <Mail className="h-5 w-5 cursor-pointer text-white/60 transition-colors hover:text-white" />
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-bold">{t('footer.sections.platform.title')}</h4>
            <ul className="space-y-2 text-white/80">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.platform.howItWorks')}
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.platform.verification')}
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.platform.mobileApp')}
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.platform.api')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold">{t('footer.sections.artisans.title')}</h4>
            <ul className="space-y-2 text-white/80">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.artisans.joinPlatform')}
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.artisans.uploadCrafts')}
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.artisans.successStories')}
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.artisans.support')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-bold">{t('footer.sections.company.title')}</h4>
            <ul className="space-y-2 text-white/80">
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.company.aboutUs')}
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.company.ourMission')}
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.company.privacyPolicy')}
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-white">
                  {t('footer.sections.company.contact')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-t border-white/20 pt-8 md:flex-row">
          <p className="text-sm text-white/60">{t('footer.copyright')}</p>
          <p className="mt-4 text-sm text-white/60 md:mt-0">{t('footer.madeWith')}</p>
        </div>
      </div>
    </footer>
  );
}
