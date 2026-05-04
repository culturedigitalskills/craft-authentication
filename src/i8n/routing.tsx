//https://next-intl.dev/docs/routing/setup
import {defineRouting} from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales:   ['en', 'hi','es', 'ar','de','tr'],
 
  // Used when no locale matches
  defaultLocale: 'en',
  localePrefix: 'never',
}
);

