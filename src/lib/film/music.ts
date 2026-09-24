import fs from 'fs'
import path from 'path'
import { runFfmpeg, probeDuration } from '@/lib/ffmpeg'

// The music bed laid under every assembled film. It ships in public/, which the
// Dockerfile copies into the standalone image, so the track is on disk at
// runtime with no configuration and no extra download during a render.
//
// The file is looped to cover films longer than itself, so it must hold full
// level at both ends: the shipped one was cut out of the middle of its source
// for that reason, dropping the source's fade in and fade out. A track that
// fades at either end leaves a hole in the bed every time it comes round, and
// swallows the opening of the film besides.
const TRACK_PATH = path.join('public', 'audio', 'story-film-music.mp3')

// Gain applied to the track before ducking. Set against the shipped file's
// measured loudness (-13.2 LUFS integrated) so the bed sits near -20 LUFS over
// the silent cards: audible, but never mistaken for the subject. Replacing the
// track with a differently mastered one means measuring it and revisiting this.
const BED_GAIN = 0.5

// The bed rises under the intro card and falls away under the outro. The rise
// is shorter than that card (3s) so the music is established before the film
// cuts to its first chapter.
const FADE_IN_SEC = 1.5
const FADE_OUT_SEC = 3

/**
 * The voice ducks the music rather than the music being mixed at a fixed level,
 * because the chapters' loudness is not uniform: the single-pass loudnorm in the
 * final concat is still settling during the first chapter, leaving it several dB
 * below the ones after it. A fixed bed that sits politely under a late chapter
 * therefore crowds the first one.
 *
 * The compressor is keyed off a level-normalised copy of the voice so a quiet
 * chapter pushes the music down as firmly as a loud one. speechnorm's threshold
 * keeps digital silence silent, which is what lets the cards work: their audio
 * is true silence, so nothing keys the compressor and the music comes up on its
 * own with no cue list to maintain.
 */
function buildFilter(fadeOutStartSec: number): string {
    return [
        `[1:a]volume=${BED_GAIN},` +
            `afade=t=in:st=0:d=${FADE_IN_SEC},` +
            `afade=t=out:st=${fadeOutStartSec.toFixed(3)}:d=${FADE_OUT_SEC},` +
            `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[bed]`,
        `[0:a]asplit=2[voice][key]`,
        `[key]speechnorm=p=0.9:e=20:r=0.008:t=0.001[sckey]`,
        `[bed][sckey]sidechaincompress=threshold=0.06:ratio=10:attack=15:release=380:detection=rms:link=maximum[ducked]`,
        // normalize=0 or amix halves both inputs, quietening the voice by 6 dB.
        `[voice][ducked]amix=inputs=2:duration=first:normalize=0[mix]`,
        // Insurance against the two tracks summing past full scale. level is
        // disabled because alimiter otherwise auto-levels the whole mix up to
        // the limit and undoes the loudness the final concat established.
        `[mix]alimiter=limit=0.95:level=disabled[ao]`,
    ].join(';')
}

/**
 * Lay the music bed under a finished film. The video is copied rather than
 * re-encoded, so this costs about a second and leaves the picture and the
 * running time untouched — the film's captions are timed against that same
 * duration, so they stay in sync.
 *
 * Resolves false when there is no track to lay down, leaving the caller with its
 * voice-only film.
 */
export async function mixMusicBed(filmPath: string, outPath: string): Promise<boolean> {
    const trackPath = path.resolve(process.cwd(), TRACK_PATH)
    if (!fs.existsSync(trackPath)) {
        console.error(`Film music track missing at ${trackPath}; leaving the film without a bed.`)
        return false
    }

    const durationSec = await probeDuration(filmPath)
    const fadeOutStartSec = Math.max(0, durationSec - FADE_OUT_SEC)

    await runFfmpeg([
        '-i', filmPath,
        // The track is shorter than most films, so loop it and let the mix end
        // with the voice: duration=first covers films shorter than the track too.
        '-stream_loop', '-1', '-i', trackPath,
        '-filter_complex', buildFilter(fadeOutStartSec),
        '-map', '0:v', '-c:v', 'copy',
        '-map', '[ao]', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', outPath,
    ])
    return true
}
