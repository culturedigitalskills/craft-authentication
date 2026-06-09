'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Sparkles, Key, AlertCircle, Edit2, Loader2, Play, Trash2, X, Info, HelpCircle,
    Calendar, CheckCircle, AlertTriangle, RefreshCw, Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from '@/components/ui/card'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'
import {
    storeOpenRouterApiKeyAction,
    checkOpenRouterApiKeyAction
} from '@/app/actions/vault'
import {
    createTaskEventAction,
    cancelTaskEventAction,
    getTaskEventsAction,
    deleteTaskEventMediaAction,
    generateImageAction
} from '@/app/actions/generate-image'

interface GenerationWorkspaceClientProps {
    userId: string
}

export function GenerationWorkspaceClient({ userId }: GenerationWorkspaceClientProps) {
    const t = useTranslations('imageWorkspace')
    const [hasKey, setHasKey] = useState<boolean | null>(null)
    const [keyPopoverOpen, setKeyPopoverOpen] = useState(false)
    const [apiKeyInput, setApiKeyInput] = useState('')
    const [isStoringKey, setIsStoringKey] = useState(false)

    const [prompt, setPrompt] = useState('')
    const [model, setModel] = useState('sourceful/riverflow-v2.5-pro:free')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [tasks, setTasks] = useState<any[]>([])
    const [loadingTasks, setLoadingTasks] = useState(true)
    const [selectedTask, setSelectedTask] = useState<any | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [keyError, setKeyError] = useState<string | null>(null)

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

    // Handle storing the API key
    const handleStoreKey = async () => {
        if (!apiKeyInput.trim()) {
            setKeyError('API Key cannot be empty')
            return
        }
        setIsStoringKey(true)
        setKeyError(null)
        try {
            await storeOpenRouterApiKeyAction(apiKeyInput.trim())
            setHasKey(true)
            setApiKeyInput('')
            setKeyPopoverOpen(false)
        } catch (err: any) {
            setKeyError(err.message || 'Failed to save key')
        } finally {
            setIsStoringKey(false)
        }
    }

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

    // Helper to determine state of a TaskEvent
    const getTaskState = (task: any) => {
        if (task.receivedAt) return 'completed'
        if (task.errorAt) return 'error'
        if (task.canceledAt) return 'canceled'
        if (task.sentAt) return 'sent'
        return 'created'
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
                    
                    {/* API Key Configuration Card */}
                    <Card className={`border border-border/80 bg-card/40 backdrop-blur-md relative overflow-visible shadow-lg transition-all ${keyPopoverOpen ? 'z-20' : 'z-0'}`}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Key className="h-5 w-5 text-primary" />
                                API Credentials
                            </CardTitle>
                            <CardDescription>
                                Set up your OpenRouter.ai credentials
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {hasKey === null ? (
                                <div className="h-10 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                                </div>
                            ) : hasKey ? (
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 relative">
                                        <Input
                                            type="password"
                                            value="••••••••••••••••••••"
                                            disabled
                                            className="bg-muted/50 border-muted"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-green-600 font-semibold flex items-center gap-1">
                                            <CheckCircle className="w-3.5 h-3.5" /> Active
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setKeyPopoverOpen(true)}
                                        className="h-10 w-10 shrink-0 border-primary/20 hover:border-primary/50 transition-colors"
                                        title={t('editKey')}
                                    >
                                        <Edit2 className="w-4 h-4 text-primary" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm flex items-start gap-2.5">
                                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                        <div className="leading-snug">
                                            {t('noKeyWarning')}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => setKeyPopoverOpen(true)}
                                        className="w-full flex items-center gap-2 bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95"
                                    >
                                        <Key className="w-4 h-4" /> {t('addKey')}
                                    </Button>
                                </div>
                            )}

                            {/* Inline Popover overlay */}
                            {keyPopoverOpen && (
                                <div className="absolute inset-x-0 top-full mt-2 z-50 p-5 rounded-2xl border border-border bg-background shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                            <Info className="w-4 h-4 text-primary" /> Setup Key
                                        </h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {t('apiKeyInfo')}
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <Input
                                            type="password"
                                            placeholder="sk-or-..."
                                            value={apiKeyInput}
                                            onChange={(e) => setApiKeyInput(e.target.value)}
                                            className="w-full"
                                            autoFocus
                                        />
                                        {keyError && (
                                            <p className="text-xs text-destructive font-medium flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5" /> {keyError}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-end gap-2 pt-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setKeyPopoverOpen(false)
                                                    setApiKeyInput('')
                                                    setKeyError(null)
                                                }}
                                                disabled={isStoringKey}
                                            >
                                                {t('cancel')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleStoreKey}
                                                disabled={isStoringKey}
                                                className="bg-primary hover:bg-primary/90"
                                            >
                                                {isStoringKey ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    t('store')
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Prompt Generator Card */}
                    <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Image Parameters
                            </CardTitle>
                            <CardDescription>
                                Input details for generating your media
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleGenerate}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground flex items-center gap-1">
                                        Model Selection
                                    </label>
                                    <Select
                                        value={model}
                                        onValueChange={setModel}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sourceful/riverflow-v2.5-pro:free">
                                                Riverflow v2.5 Pro (Free)
                                            </SelectItem>
                                            <SelectItem value="google/gemini-2.5-flash:free">
                                                Gemini 2.5 Flash (Free)
                                            </SelectItem>
                                            <SelectItem value="black-forest-labs/flux.2-pro">
                                                Flux 2 Pro (Paid)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-foreground">
                                        {t('promptLabel')}
                                    </label>
                                    <Textarea
                                        placeholder={t('promptPlaceholder')}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        rows={4}
                                        className="resize-none"
                                        disabled={!hasKey}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    type="submit"
                                    disabled={!hasKey || !prompt.trim() || isSubmitting}
                                    className="w-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 flex items-center gap-2 h-11"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Scheduling Task...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            {t('generate')}
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                </div>

                {/* Right Column: Async Events History Queue (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-lg min-h-[400px]">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-primary" />
                                    {t('taskQueue')}
                                </CardTitle>
                                <CardDescription>
                                    Monitor status of generative tasks
                                </CardDescription>
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
                        </CardHeader>
                        <CardContent className="pt-6">
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
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* Detail Dialog Modal */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                {selectedTask && (
                    <DialogContent className="max-w-2xl bg-card border border-border shadow-2xl p-6 rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Task Completion Details
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                Generated image and settings parameters
                            </DialogDescription>
                        </DialogHeader>

                        {/* Modal Body */}
                        <div className="space-y-5 py-4">
                            {/* Image Container */}
                            {selectedTask.mediaFileId ? (
                                <div className="relative rounded-xl overflow-hidden border border-border bg-black/5 aspect-square max-h-[360px] flex items-center justify-center mx-auto shadow-inner group">
                                    <img
                                        src={`/api/media/${selectedTask.mediaFileId}`}
                                        alt={selectedTask.settings?.prompt || 'Generated'}
                                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-102"
                                    />
                                </div>
                            ) : (
                                <div className="h-[240px] rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/20">
                                    <p className="text-sm text-muted-foreground">No media available</p>
                                </div>
                            )}

                            {/* Settings Info List */}
                            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2.5 text-sm">
                                <div className="flex justify-between border-b border-border/40 pb-2">
                                    <span className="font-semibold text-muted-foreground">Prompt:</span>
                                    <span className="text-foreground text-right max-w-[400px] truncate" title={selectedTask.settings?.prompt}>
                                        {selectedTask.settings?.prompt}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-border/40 pb-2">
                                    <span className="font-semibold text-muted-foreground">Model:</span>
                                    <span className="text-foreground font-mono text-xs">{selectedTask.settings?.model}</span>
                                </div>
                                <div className="flex justify-between border-b border-border/40 pb-2">
                                    <span className="font-semibold text-muted-foreground">Resolution:</span>
                                    <span className="text-foreground">
                                        {selectedTask.settings?.width}x{selectedTask.settings?.height}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="font-semibold text-muted-foreground">Created:</span>
                                    <span className="text-foreground">
                                        {new Date(selectedTask.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <DialogFooter className="flex items-center justify-between gap-4">
                            <Button
                                variant="destructive"
                                onClick={handleDeleteMedia}
                                disabled={isDeleting}
                                className="flex items-center gap-1.5"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        {t('delete')}
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setDetailsOpen(false)}
                                className="border-border/60 hover:bg-muted"
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    )
}

/* ============================================================================
   REUSABLE EVENTLIST & EVENTITEM COMPONENTS (GENERIC INFRASTRUCTURE)
   ============================================================================ */

interface EventListProps {
    events: any[]
    onShowDetail: (event: any) => void
    onCancel: (eventId: string) => void
    onRetry: (eventId: string) => void
}

function EventList({ events, onShowDetail, onCancel, onRetry }: EventListProps) {
    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center border border-border">
                    <Layers className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                    No generation events recorded. Specify a prompt on the left to start generating.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {events.map((event) => (
                <EventItem
                    key={event.id}
                    event={event}
                    onShowDetail={onShowDetail}
                    onCancel={onCancel}
                    onRetry={onRetry}
                />
            ))}
        </div>
    )
}

interface EventItemProps {
    event: any
    onShowDetail: (event: any) => void
    onCancel: (eventId: string) => void
    onRetry: (eventId: string) => void
}

function EventItem({ event, onShowDetail, onCancel, onRetry }: EventItemProps) {
    const t = useTranslations('imageWorkspace')

    // Task states
    const isCompleted = !!event.receivedAt
    const isError = !!event.errorAt
    const isCanceled = !!event.canceledAt
    const isSent = !!event.sentAt && !isCompleted && !isError && !isCanceled
    const isPending = !event.sentAt && !isCompleted && !isError && !isCanceled

    let statusLabel = t('statusPending')
    let statusColor = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800'
    let icon = <ClockIcon />

    if (isCompleted) {
        statusLabel = t('statusCompleted')
        statusColor = 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50'
        icon = <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
    } else if (isError) {
        statusLabel = t('statusError')
        statusColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
        icon = <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    } else if (isCanceled) {
        statusLabel = t('statusCanceled')
        statusColor = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-400 dark:border-zinc-800'
        icon = <XCircleIcon />
    } else if (isSent) {
        statusLabel = t('statusSent')
        statusColor = 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/50'
        icon = <Loader2 className="w-4 h-4 text-violet-600 dark:text-violet-400 animate-spin" />
    }

    return (
        <div className={`p-4 rounded-xl border border-border/80 bg-background/40 hover:bg-background/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300`}>
            
            {/* Left Content info */}
            <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${statusColor}`}>
                        {icon}
                        {statusLabel}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate max-w-full" title={event.settings?.prompt}>
                    {event.settings?.prompt}
                </p>
                {isError && event.errorMessage && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 leading-snug break-words max-w-full">
                        Reason: {event.errorMessage}
                    </p>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                {/* Cancel option */}
                {(isPending || isSent) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancel(event.id)}
                        className="h-8 border-rose-200/50 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-950/30 dark:hover:bg-rose-950/10 dark:text-rose-400 transition-colors"
                    >
                        Cancel
                    </Button>
                )}

                {/* Retry option on error */}
                {isError && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRetry(event.id)}
                        className="h-8 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-1"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {t('tryAgain')}
                    </Button>
                )}

                {/* Show Detail option on complete */}
                {isCompleted && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onShowDetail(event)}
                        className="h-8 border-border hover:bg-muted font-medium transition-colors"
                    >
                        {t('viewDetail')}
                    </Button>
                )}
            </div>
        </div>
    )
}

/* SVGs Icons */
function ClockIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>
    )
}

function XCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
    )
}
