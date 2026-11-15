import 'server-only'
import { X509Certificate } from 'node:crypto'
import { decode } from 'cborg'
import type { Reader } from '@contentauth/c2pa-node'

const accountPrefix = 'https://sustainablecrafting.org/users/'
const idPattern = /^[A-Za-z0-9_-]{1,128}$/

export function certificateAccountUri(userId: string): string {
    if (!idPattern.test(userId)) throw new Error('Unsupported account identifier')
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuid.test(userId) ? 'urn:uuid:' + userId : accountPrefix + userId
}

function signatureCbor(resource: Buffer, activeLabel: string): Buffer | undefined {
    // SDK 0.9.x may return the whole manifest store for a signature resource.
    // Select the exact active signature by its JUMBF ancestry, never the first
    // certificate or CBOR box found in the asset/ingredient history.
    if (resource.length > 32 * 1024 * 1024) return undefined
    if (resource.toString('ascii', 4, 8) !== 'jumb') return resource
    const candidates: Buffer[] = []
    const target = ['c2pa', activeLabel, 'c2pa.signature'].join('/')
    function boxes(bytes: Buffer): { type: string; payload: Buffer }[] {
        const result: { type: string; payload: Buffer }[] = []
        let offset = 0
        while (offset < bytes.length) {
            if (offset + 8 > bytes.length) throw new Error('Truncated signature box')
            let size = bytes.readUInt32BE(offset)
            const type = bytes.toString('ascii', offset + 4, offset + 8)
            let header = 8
            if (size === 1) {
                if (offset + 16 > bytes.length) throw new Error('Truncated extended box')
                const extended = bytes.readBigUInt64BE(offset + 8)
                if (extended > BigInt(bytes.length)) throw new Error('Oversized signature box')
                size = Number(extended)
                header = 16
            } else if (size === 0) size = bytes.length - offset
            if (size < header || offset + size > bytes.length)
                throw new Error('Invalid signature box')
            result.push({ type, payload: bytes.subarray(offset + header, offset + size) })
            offset += size
        }
        return result
    }
    function visit(bytes: Buffer, path: string[]) {
        if (path.length > 6) throw new Error('Nested signature resource')
        for (const box of boxes(bytes)) {
            if (box.type !== 'jumb') continue
            const children = boxes(box.payload)
            const descriptions = children.filter((child) => child.type === 'jumd')
            if (descriptions.length !== 1) throw new Error('Ambiguous box label')
            const description = descriptions[0].payload
            const end = description.indexOf(0, 17)
            if (!(description[16] & 2) || end < 17) throw new Error('Missing box label')
            const label = description.toString('utf8', 17, end)
            const childPath = [...path, label]
            if (childPath.join('/') === target) {
                candidates.push(
                    ...children
                        .filter((child) => child.type === 'cbor')
                        .map((child) => child.payload),
                )
            } else visit(box.payload, childPath)
        }
    }
    visit(resource, [])
    return candidates.length === 1 ? candidates[0] : undefined
}

/**
 * Call only after native C2PA validation succeeds. Bind the identity to the
 * active signing certificate issued by this registry, not arbitrary image text
 * or a certificate in an older ingredient. Unknown/ambiguous identities fail closed.
 */
export async function verifiedRegistryAccount(
    reader: Reader,
    activeLabel: string,
    rootPem: string,
): Promise<string | undefined> {
    try {
        if (!/^[A-Za-z0-9:._-]{1,512}$/.test(activeLabel) || activeLabel.includes('..'))
            return undefined
        const destination: { buffer: Buffer | null } = { buffer: null }
        const resource = await reader.resourceToAsset(
            'self#jumbf=/c2pa/' + activeLabel + '/c2pa.signature',
            destination,
        )
        const buffer =
            destination.buffer || (typeof resource !== 'number' ? resource.buffer : undefined)
        if (!buffer) return undefined
        let cbor = signatureCbor(Buffer.from(buffer), activeLabel)
        if (!cbor) return undefined
        // The optional canonical COSE_Sign1 tag is 18 (0xd2).
        if (cbor[0] === 0xd2) cbor = cbor.subarray(1)
        const options = {
            useMaps: true,
            rejectDuplicateMapKeys: true,
            rejectInvalidUtf8: true,
            allowIndefinite: false,
            allowNaN: false,
            allowInfinity: false,
            strict: true,
        }
        const cose: unknown = decode(cbor, options)
        if (
            !Array.isArray(cose) ||
            cose.length !== 4 ||
            !(cose[0] instanceof Uint8Array) ||
            !(cose[1] instanceof Map)
        )
            return undefined
        const protectedHeaders: unknown = decode(cose[0], options)
        if (!(protectedHeaders instanceof Map)) return undefined
        const unprotectedHeaders = cose[1]
        if (protectedHeaders.has(33) && unprotectedHeaders.has(33)) return undefined
        const chain: unknown = protectedHeaders.get(33) ?? unprotectedHeaders.get(33)
        const leaf = Array.isArray(chain) ? chain[0] : chain
        if (!(leaf instanceof Uint8Array) || leaf.length > 65536) return undefined
        const certificate = new X509Certificate(leaf)
        const root = new X509Certificate(rootPem)
        if (!certificate.checkIssued(root) || !certificate.verify(root.publicKey)) return undefined
        const ids = new Set<string>()
        for (const entry of (certificate.subjectAltName || '').split(/,\s*/)) {
            if (!entry.startsWith('URI:')) continue
            const uri = entry.slice(4)
            // Read legacy app-issued identifiers without rewriting existing certs.
            const id = uri.startsWith('urn:uuid:')
                ? uri.slice(9)
                : uri.startsWith(accountPrefix)
                  ? uri.slice(accountPrefix.length)
                  : undefined
            if (id && idPattern.test(id)) ids.add(id)
        }
        return ids.size === 1 ? [...ids][0] : undefined
    } catch {
        return undefined
    }
}
