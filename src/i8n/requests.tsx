import {getRequestConfig} from "next-intl/server";
import {hasLocale} from 'next-intl';
import {routing} from './routing';
 
export default getRequestConfig(async ({requestLocale}) => {
    //static for now
    //const locale = 'en';
    // Typically corresponds to the `[locale]` segment
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested)
        ? requested
        : routing.defaultLocale;

    // Load messages for the current locale.
    const messages = (await import(`../app/messages/${locale}.json`)).default;
    
    return {
        locale,
        messages,
    };
})



