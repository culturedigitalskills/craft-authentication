const erasureEvent = 'sc:account-erased'

function clearDrafts(userId: string) {
    localStorage.removeItem('sc:profile-draft:' + userId)
    sessionStorage.removeItem('sc:story-editor:' + userId)
}

export function forgetAccountInBrowser(userId: string) {
    try {
        clearDrafts(userId)
        localStorage.setItem(erasureEvent, userId)
        localStorage.removeItem(erasureEvent)
    } catch {
        /* Site storage can be disabled. */
    }
}

export function watchAccountErasure(activeUserId?: string) {
    function onStorage(event: StorageEvent) {
        if (event.key !== erasureEvent || !event.newValue) return
        try {
            clearDrafts(event.newValue)
        } catch {
            /* Storage is optional. */
        }
        if (event.newValue === activeUserId) window.location.reload()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
}
