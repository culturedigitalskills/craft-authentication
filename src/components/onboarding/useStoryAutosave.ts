'use client'

import { useEffect, useRef, useState } from 'react'
import type { CraftStoryDraft } from './CraftStoryWizard'
import type { UpdateCraftStory } from '@/lib/validations/craftStory'

type Patch = Omit<UpdateCraftStory, 'lastStepReached' | 'expectedUpdatedAt' | 'expectNew'>
type Journal = { patch: Patch; base: Partial<CraftStoryDraft>; step: number }
const equal = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// A tab-local journal covers refreshes before the server confirms a keystroke.
// Only changed fields are sent, and the server checks the revision on every write.
export function useStoryAutosave(
    ownerId: string,
    initial: CraftStoryDraft | null,
    onError: (conflict: boolean) => void,
) {
    const key = 'sc:story-editor:' + ownerId
    const start = initial?.lastStepReached ?? 1
    const [step, showStep] = useState(start)
    const [story, showStory] = useState<Partial<CraftStoryDraft>>(initial ?? {})
    const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
        initial ? 'saved' : 'idle',
    )
    const [conflict, setConflict] = useState(false)
    const blocked = useRef(false)
    const server = useRef<Partial<CraftStoryDraft>>(initial ?? {})
    const patch = useRef<Patch>({})
    const cursor = useRef(start)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const queue = useRef<Promise<boolean>>(Promise.resolve(true))
    const callback = useRef(onError)
    callback.current = onError

    function journal() {
        const base = Object.fromEntries(
            Object.keys(patch.current).map((k) => [k, server.current[k as keyof CraftStoryDraft]]),
        )
        try {
            if (
                !Object.keys(patch.current).length &&
                cursor.current === server.current.lastStepReached
            )
                sessionStorage.removeItem(key)
            else
                sessionStorage.setItem(
                    key,
                    JSON.stringify({ patch: patch.current, base, step: cursor.current }),
                )
        } catch {
            /* Server autosave still works when tab storage is disabled. */
        }
    }
    async function write(): Promise<boolean> {
        if (blocked.current) return false
        const sent = { ...patch.current }
        const at = cursor.current
        if (
            server.current.id &&
            !Object.keys(sent).length &&
            at === server.current.lastStepReached
        ) {
            setState('saved')
            return true
        }
        setState('saving')
        try {
            const res = await fetch('/api/artisans/me/story', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...sent,
                    lastStepReached: at,
                    expectedUpdatedAt: server.current.updatedAt,
                    expectNew: !server.current.id,
                }),
            })
            if (!res.ok) {
                if (res.status === 409) {
                    blocked.current = true
                    setConflict(true)
                }
                throw new Error('save')
            }
            const { story: saved } = (await res.json()) as { story: CraftStoryDraft }
            server.current = saved
            for (const k of Object.keys(sent) as (keyof Patch)[]) {
                if (equal(sent[k], patch.current[k])) delete patch.current[k]
            }
            journal()
            showStory({ ...saved, ...patch.current })
            setState(Object.keys(patch.current).length ? 'saving' : 'saved')
            return true
        } catch {
            setState('error')
            callback.current(blocked.current)
            return false
        }
    }
    function flush() {
        if (timer.current) clearTimeout(timer.current)
        queue.current = queue.current.then(write)
        return queue.current
    }
    function edit(changes: Patch) {
        patch.current = { ...patch.current, ...changes }
        journal()
        showStory({ ...server.current, ...patch.current })
        if (blocked.current) return
        setState('saving')
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => void flush(), 550)
    }
    function go(to: number) {
        cursor.current = to
        showStep(to)
        journal()
        return flush()
    }
    function acceptServer(saved: CraftStoryDraft) {
        server.current = saved
        showStory({ ...saved, ...patch.current })
        journal()
    }
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(key)
            if (raw) {
                const entry: Journal = JSON.parse(raw)
                const collides = Object.entries(entry.patch).some(
                    ([k, v]) =>
                        !equal(
                            server.current[k as keyof CraftStoryDraft],
                            entry.base[k as keyof CraftStoryDraft],
                        ) && !equal(server.current[k as keyof CraftStoryDraft], v),
                )
                cursor.current = Math.max(0, Math.min(8, entry.step))
                showStep(cursor.current)
                patch.current = entry.patch
                showStory({ ...server.current, ...entry.patch })
                if (collides) {
                    blocked.current = true
                    setConflict(true)
                    setState('error')
                    callback.current(true)
                } else void flush()
            }
        } catch {
            /* A corrupt journal must not block editing. */
        }
        return () => {
            if (timer.current) clearTimeout(timer.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
    function discardLocal() {
        try {
            sessionStorage.removeItem(key)
        } catch {
            /* optional storage */
        }
        window.location.reload()
    }
    return { story, step, state, edit, go, flush, server, acceptServer, conflict, discardLocal }
}
