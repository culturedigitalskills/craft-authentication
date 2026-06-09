'use client'

import { Sparkles, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { useTranslations } from 'next-intl'

interface EventDetailsDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    selectedTask: any | null
    isDeleting: boolean
    onDeleteMedia: () => void
}

export function EventDetailsDialog({
    isOpen,
    onOpenChange,
    selectedTask,
    isDeleting,
    onDeleteMedia
}: EventDetailsDialogProps) {
    const t = useTranslations('imageWorkspace')

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                            onClick={onDeleteMedia}
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
                            onClick={() => onOpenChange(false)}
                            className="border-border/60 hover:bg-muted"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
    )
}
