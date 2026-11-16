import 'server-only'
import { CallbackSigner, LocalSigner } from '@contentauth/c2pa-node'

/**
 * Preserve the existing key, certificate chain and timestamp authority while
 * using the SDK's asynchronous HTTP resolver. The native synchronous signer
 * cannot make the timestamp request in current c2pa-node builds.
 */
export function createAsyncSigner(certificate: Buffer, privateKey: Buffer) {
    const local = LocalSigner.newSigner(
        certificate,
        privateKey,
        'es256',
        'http://timestamp.digicert.com',
    )
    return CallbackSigner.newSigner(
        {
            alg: local.alg(),
            directCoseHandling: false,
            // CallbackSigner expects PEM certificate buffers, not LocalSigner.certs() DER output.
            certs: [certificate],
            reserveSize: local.reserveSize(),
            tsaUrl: local.timeAuthorityUrl(),
        },
        async (data) => local.sign(data),
    )
}
