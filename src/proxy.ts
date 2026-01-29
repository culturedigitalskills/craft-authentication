import createMiddleware from 'next-intl/middleware';
import {routing} from './i8n/routing';
 
// export default createMiddleware({
//   locales: routing.locales,
//   defaultLocale: routing.defaultLocale,
//   localePrefix: "as-needed",
// });
export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: [
      '/((?!api|_next|_vercel|.*\\..*).*)',
 
          // However, match all pathnames within `/users`, optionally with a locale prefix
        '/([\\w-]+)?/users/(.+)'
  ]
  
};

