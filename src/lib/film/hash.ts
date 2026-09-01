import { createHash } from 'crypto'
import type { FilmInputs } from './planner'

/**
 * Stable fingerprint of the ingredients that affect the rendered output. When
 * this changes, a previously rendered film is stale and should be regenerated.
 * Order-insensitive fields (the answer set) are normalised; order-sensitive
 * ones (visual sequence) are kept as-is.
 *
 * Kept out of planner.ts so that module stays free of node built-ins and can be
 * imported by the wizard's storyboard preview in the browser.
 */
export function computeInputsHash(inputs: FilmInputs): string {
    const canonical = {
        templateVersion: inputs.templateVersion,
        name: inputs.artisanName,
        profileUrl: inputs.profileUrl,
        answers: inputs.chapters
            .filter(c => c.voiceMediaId)
            .map(c => `${c.key}:${c.voiceMediaId}`)
            .sort(),
        visuals: inputs.visuals.map(v => v.mediaId),
    }
    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}
