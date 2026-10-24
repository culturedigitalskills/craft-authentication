/**
 * Runs once per server boot. Deploys destroy the app container mid-flight, so
 * any transcription or film job that was PROCESSING at that moment is orphaned —
 * this sweep reclaims and re-runs them. A slow heartbeat covers long-lived
 * instances between deploys.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return
    if (process.env.NEXT_PHASE === 'phase-production-build') return

    const { recoverStaleTranscriptions } = await import('@/lib/transcription')
    const { recoverStaleFilms } = await import('@/lib/film/jobs')
    const { C2PAService } = await import('@/lib/c2pa-service')
    const sweep = async () => {
        await recoverStaleTranscriptions().catch(err => {
            console.error('Transcription recovery sweep failed:', err)
        })
        await recoverStaleFilms().catch(err => {
            console.error('Film recovery sweep failed:', err)
        })
        // Certificates expire over months and renew inside a thirty day
        // window, so hourly is ample. This used to run from auth() on every
        // authenticated request instead, which is a page's worth of user
        // lookups to discover that nothing is due.
        await C2PAService.renewExpiringCertificates().catch(err => {
            console.error('Certificate renewal sweep failed:', err)
        })
    }

    void sweep()
    setInterval(() => void sweep(), 60 * 60 * 1000).unref()
}
