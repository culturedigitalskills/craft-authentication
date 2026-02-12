"use client";
//code adapted from https://stackoverflow.com/questions/78998749/language-selector-component-to-re-route-to-correct-language-page-in-nextjs-with

import React, { useState, useEffect } from "react";
import { ChevronDown, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routing } from "@/i8n/routing";
//using router as shown here: https://nextjs.org/docs/app/api-reference/functions/use-router
import { useRouter } from 'next/navigation'
//using pathname as shown here: https://nextjs.org/docs/app/api-reference/functions/use-pathname
import { usePathname } from 'next/navigation'
import path from "path";



export interface Language {
  code: (typeof routing.locales)[number];
  name: string;
}

export const languages: Language[] = routing.locales.map((locale) => ({
  code: locale,
  name: locale.toUpperCase(),
}));

interface LanguageSelectProps {
    isMobile: boolean;
    jsonlan: string
}

export function LanguageSelect({ isMobile, jsonlan }: LanguageSelectProps) {
    const router = useRouter();
    const pathname = usePathname()
    const lang = jsonlan;
    
    //this gets us the client pathname- although the configuration has the same value as server and client, this ensures we have the client value
    const [clientPathname, setClientPathname] = useState('')
    useEffect(() => {
        setClientPathname(pathname)
    }, [pathname])
    
    //get current language based on pathname
    const [currentLanguage, setCurrentLanguage] = useState<Language>(
        languages[0]
    );

    
  const handleLanguageChange = (lang: Language) => {
    setCurrentLanguage(lang);
    router.push(`/${lang.code}`+clientPathname, { scroll: false });
  };

  return (
    <div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center space-x-1 primary-foreground focus:ring-0 ${
            isMobile ? "border border-gray-600" : ""
          }`}
        >
            {jsonlan.toUpperCase()}
          {/* <span>{currentLanguage.name}</span> */}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex flex-col columns-4xs primary-foreground border-gray-200 text-center">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang)}
            className="text-1xl text-inherit hover:text-neutral-400 text-center" 
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    </div>




  );
}