'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Loader2, RefreshCw, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { checkOpenRouterApiKeyAction } from '@/app/actions/vault'
import {
    createTaskEventAction,
    cancelTaskEventAction,
    getTaskEventsAction,
    deleteTaskEventMediaAction,
    generateImageAction,
    deleteTaskEventAction
} from '@/app/actions/generate-image'
import { ApiKeyConfig } from './ApiKeyConfig'
import { PromptForm } from './PromptForm'
import { EventList } from './EventList'
import { EventDetailsDialog } from './EventDetailsDialog'

interface GenerationWorkspaceClientProps {
    userId: string
}

export function GenerationWorkspaceClient({ userId }: GenerationWorkspaceClientProps) {
    const t = useTranslations('imageWorkspace')
    const [hasKey, setHasKey] = useState<boolean | null>(null)

    const [prompt, setPrompt] = useState('')
    const [model, setModel] = useState('sourceful/riverflow-v2.5-pro:free')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [tasks, setTasks] = useState<any[]>([])
    const [loadingTasks, setLoadingTasks] = useState(true)
    const [selectedTask, setSelectedTask] = useState<any | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Load initial states
    const loadKeyState = useCallback(async () => {
        try {
            const { present } = await checkOpenRouterApiKeyAction()
            setHasKey(present)
        } catch (err) {
            console.error('Failed to check API key:', err)
        }
    }, [])

    const loadTasks = useCallback(async (showLoading = false) => {
        if (showLoading) setLoadingTasks(true)
        try {
            const data = await getTaskEventsAction()
            setTasks(data)
        } catch (err) {
            console.error('Failed to load tasks:', err)
        } finally {
            if (showLoading) setLoadingTasks(false)
        }
    }, [])

    useEffect(() => {
        loadKeyState()
        loadTasks(true)
    }, [loadKeyState, loadTasks])

    // Periodic polling for events queue
    useEffect(() => {
        const interval = setInterval(() => {
            loadTasks(false)
        }, 3000)
        return () => clearInterval(interval)
    }, [loadTasks])

    // Handle generating an image
    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!prompt.trim() || isSubmitting) return

        setIsSubmitting(true)
        try {
            // 1. Create task event in database
            const task = await createTaskEventAction(prompt.trim(), model)
            
            // 2. Refresh queue and clear prompt
            await loadTasks(false)
            setPrompt('')

            // 3. Trigger async generation
            await generateImageAction(task.id)

            // 4. Refresh queue again
            await loadTasks(false)
        } catch (err: any) {
            console.error('Generation trigger failed:', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle cancel task event
    const handleCancelTask = async (eventId: string) => {
        try {
            await cancelTaskEventAction(eventId)
            await loadTasks(false)
        } catch (err: any) {
            console.error('Failed to cancel task:', err)
        }
    }

    // Handle retry task event
    const handleRetryTask = async (eventId: string) => {
        try {
            await generateImageAction(eventId)
            await loadTasks(false)
        } catch (err: any) {
            console.error('Failed to retry task:', err)
        }
    }

    // Handle remove task event (DB record only)
    const handleRemoveTask = async (eventId: string) => {
        try {
            await deleteTaskEventAction(eventId)
            await loadTasks(false)
        } catch (err: any) {
            console.error('Failed to remove task:', err)
        }
    }

    // Handle delete task media
    const handleDeleteMedia = async () => {
        if (!selectedTask || isDeleting) return
        setIsDeleting(true)
        try {
            await deleteTaskEventMediaAction(selectedTask.id)
            setDetailsOpen(false)
            setSelectedTask(null)
            await loadTasks(false)
        } catch (err) {
            console.error('Failed to delete media:', err)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    <Sparkles className="h-3.5 w-3.5" />
                    OpenRouter AI Generator
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
                    {t('title')}
                </h1>
                <p className="text-lg text-muted-foreground">
                    {t('description')}
                </p>
            </div>

            {/* Main Grid: Left Settings & Form, Right History */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Key configuration and prompt submission (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                    <ApiKeyConfig hasKey={hasKey} setHasKey={setHasKey} />
                    <PromptForm
                        hasKey={hasKey}
                        prompt={prompt}
                        setPrompt={setPrompt}
                        model={model}
                        setModel={setModel}
                        isSubmitting={isSubmitting}
                        onSubmit={handleGenerate}
                    />
                </div>

                {/* Right Column: Async Events History Queue (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-6 shadow-sm min-h-[400px]">
                        <div className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-primary" />
                                    {t('taskQueue')}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Monitor status of generative tasks
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => loadTasks(true)}
                                className="h-9 w-9 border border-border bg-background/50 hover:bg-muted"
                                title="Refresh manually"
                            >
                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                        <div>
                            {loadingTasks && tasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                    <p className="text-sm text-muted-foreground">Loading queue history...</p>
                                </div>
                            ) : (
                                <EventList
                                    events={tasks}
                                    onShowDetail={(event) => {
                                        setSelectedTask(event)
                                        setDetailsOpen(true)
                                    }}
                                    onCancel={handleCancelTask}
                                    onRetry={handleRetryTask}
                                    onRemove={handleRemoveTask}
                                />
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Detail Dialog Modal */}
            <EventDetailsDialog
                isOpen={detailsOpen}
                onOpenChange={setDetailsOpen}
                selectedTask={selectedTask}
                isDeleting={isDeleting}
                onDeleteMedia={handleDeleteMedia}
            />
        </div>
    )
}
