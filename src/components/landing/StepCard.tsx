import { LucideIcon } from 'lucide-react'

interface StepCardProps {
    number: number
    icon: LucideIcon
    title: string
    description: string
}

export function StepCard({ number, icon: Icon, title, description }: StepCardProps) {
    
    return (
        <div className="relative flex flex-col items-center text-center space-y-4 p-6">
            {/* Step Number Badge */}
            <div className="absolute -top-2 -left-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg">
                {number}
            </div>

            {/* Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mt-4">
                <Icon className="h-8 w-8 text-primary" />
            </div>

            {/* Content */}
            <h3 className="font-bold text-xl">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
    )
}
