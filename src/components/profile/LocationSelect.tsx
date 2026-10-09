'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { countries, countryLabel, suggestedCountryCodes } from '@/data/locations'

interface LocationSelectProps {
    initialCountry?: string
    initialRegion?: string
    onLocationChange: (country: string | null, region: string | null) => void
}

export function LocationSelect({
    initialCountry,
    initialRegion,
    onLocationChange,
}: LocationSelectProps) {
    const t = useTranslations('profile')
    const locale = useLocale()
    const [selectedCountry, setSelectedCountry] = useState(initialCountry ?? '')
    const [selectedRegion, setSelectedRegion] = useState(initialRegion ?? '')

    // The stored value stays the English name; only the label is localised.
    // Search matches the value too, so typing the English name works in any language.
    const countryOptions = useMemo(
        () =>
            countries
                .map(country => ({
                    value: country.name,
                    label: countryLabel(country, locale),
                    keywords: [country.isoCode],
                }))
                .sort((a, b) => a.label.localeCompare(b.label, locale)),
        [locale],
    )

    const suggestedCountries = useMemo(
        () =>
            suggestedCountryCodes
                .map(code => countries.find(c => c.isoCode === code)?.name)
                .filter((name): name is string => !!name),
        [],
    )

    const regionOptions = useMemo(() => {
        const country = countries.find(c => c.name === selectedCountry)
        return [...(country?.regions ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(region => ({ value: region.name, label: region.name }))
    }, [selectedCountry])

    function handleCountryChange(countryName: string) {
        setSelectedCountry(countryName)
        setSelectedRegion('')
        onLocationChange(countryName, null)
    }

    function handleRegionChange(regionName: string) {
        setSelectedRegion(regionName)
        onLocationChange(selectedCountry, regionName.trim() || null)
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="location-country">{t('country')}</Label>
                <Combobox
                    id="location-country"
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    options={countryOptions}
                    suggested={suggestedCountries}
                    suggestedHeading={t('suggestedCountries')}
                    allHeading={t('allCountries')}
                    placeholder={t('selectCountry')}
                    searchPlaceholder={t('searchCountry')}
                    emptyText={t('noCountryFound')}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="location-region">{t('region')}</Label>
                {regionOptions.length > 0 ? (
                    <Combobox
                        id="location-region"
                        value={selectedRegion}
                        onChange={handleRegionChange}
                        options={regionOptions}
                        placeholder={t('selectRegion')}
                        searchPlaceholder={t('searchRegion')}
                        emptyText={t('noRegionFound')}
                        customLabel={query => t('useRegion', { region: query })}
                    />
                ) : (
                    <Input
                        id="location-region"
                        value={selectedRegion}
                        onChange={e => handleRegionChange(e.target.value)}
                        placeholder={t('enterRegion')}
                        disabled={!selectedCountry}
                        maxLength={100}
                    />
                )}
            </div>
        </div>
    )
}
