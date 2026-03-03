'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface Country {
    id: string
    isoCode: string
    name: string
}

interface Region {
    id: string
    name: string
    regionType: string | null
}

interface LocationSelectProps {
    initialCountryId?: string
    initialRegionId?: string
    onRegionChange: (regionId: string | null) => void
}

export function LocationSelect({
    initialCountryId,
    initialRegionId,
    onRegionChange,
}: LocationSelectProps) {
    const t = useTranslations('profile')
    const [countries, setCountries] = useState<Country[]>([])
    const [regions, setRegions] = useState<Region[]>([])
    const [selectedCountryId, setSelectedCountryId] = useState(initialCountryId ?? '')
    const [selectedRegionId, setSelectedRegionId] = useState(initialRegionId ?? '')

    useEffect(() => {
        fetch('/api/countries')
            .then((res) => res.json())
            .then((data) => setCountries(data.countries ?? []))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!selectedCountryId) {
            setRegions([])
            return
        }

        fetch(`/api/countries/${selectedCountryId}/regions`)
            .then((res) => res.json())
            .then((data) => setRegions(data.regions ?? []))
            .catch(() => {})
    }, [selectedCountryId])

    function handleCountryChange(countryId: string) {
        setSelectedCountryId(countryId)
        setSelectedRegionId('')
        onRegionChange(null)
    }

    function handleRegionChange(regionId: string) {
        setSelectedRegionId(regionId)
        onRegionChange(regionId)
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>{t('country')}</Label>
                <Select value={selectedCountryId} onValueChange={handleCountryChange}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('selectCountry')} />
                    </SelectTrigger>
                    <SelectContent>
                        {countries.map((country) => (
                            <SelectItem key={country.id} value={country.id}>
                                {country.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>{t('region')}</Label>
                <Select
                    value={selectedRegionId}
                    onValueChange={handleRegionChange}
                    disabled={!selectedCountryId || regions.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('selectRegion')} />
                    </SelectTrigger>
                    <SelectContent>
                        {regions.map((region) => (
                            <SelectItem key={region.id} value={region.id}>
                                {region.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
