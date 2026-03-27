'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { countries } from '@/data/locations'

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
    const [selectedCountry, setSelectedCountry] = useState(initialCountry ?? '')
    const [selectedRegion, setSelectedRegion] = useState(initialRegion ?? '')

    const regions = useMemo(() => {
        if (!selectedCountry) return []
        const country = countries.find((c) => c.name === selectedCountry)
        return country?.regions ?? []
    }, [selectedCountry])

    function handleCountryChange(countryName: string) {
        setSelectedCountry(countryName)
        setSelectedRegion('')
        onLocationChange(countryName, null)
    }

    function handleRegionChange(regionName: string) {
        setSelectedRegion(regionName)
        onLocationChange(selectedCountry, regionName)
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>{t('country')}</Label>
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('selectCountry')} />
                    </SelectTrigger>
                    <SelectContent>
                        {countries.map((country) => (
                            <SelectItem key={country.isoCode} value={country.name}>
                                {country.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>{t('region')}</Label>
                <Select
                    value={selectedRegion}
                    onValueChange={handleRegionChange}
                    disabled={!selectedCountry || regions.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('selectRegion')} />
                    </SelectTrigger>
                    <SelectContent>
                        {regions.map((region) => (
                            <SelectItem key={region.name} value={region.name}>
                                {region.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
