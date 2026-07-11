/**
 * Runs once per server boot. Deploys destroy the app container mid-flight,
 * so any transcription job that was PROCESSING at that moment is orphaned —
 * this sweep reclaims and re-runs them. A slow heartbeat covers long-lived
 * instances between deploys.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return
    if (process.env.NEXT_PHASE === 'phase-production-build') return

    const { recoverStaleTranscriptions } = await import('@/lib/transcription')
    const sweep = () =>
        recoverStaleTranscriptions().catch(err => {
            console.error('Transcription recovery sweep failed:', err)
        })

    sweep()
    setInterval(sweep, 60 * 60 * 1000).unref()
}
