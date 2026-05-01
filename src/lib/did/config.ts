// import crypto from 'crypto';

// // Our domain and DID configuration
// export const DOMAIN = process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.sustainablecrafting.org';
// export const DID_WEB = `did:web:${DOMAIN.replace('https://', '').replace('http://', '')}`;

// // Simple in-memory key storage for demo
// let keyPair: crypto.KeyPairSyncResult<string, string> | null = null;

// export function getKeyPair(): crypto.KeyPairSyncResult<string, string> {
//   if (!keyPair) {
//     // Use RSA instead of Ed25519 for better Vercel compatibility
//     keyPair = crypto.generateKeyPairSync('rsa', {
//       modulusLength: 2048,
//       publicKeyEncoding: {
//         type: 'spki',
//         format: 'pem',
//       },
//       privateKeyEncoding: {
//         type: 'pkcs8',
//         format: 'pem',
//       },
//     });
//   }
//   return keyPair;
// }

// // Get the DID document for our domain
// export function getDIDDocument() {
//   const keys = getKeyPair();

//   return {
//     '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/v2'],
//     id: DID_WEB,
//     verificationMethod: [
//       {
//         id: `${DID_WEB}#key-1`,
//         type: 'RsaVerificationKey2018',
//         controller: DID_WEB,
//         publicKeyPem: keys.publicKey,
//       },
//     ],
//     authentication: [`${DID_WEB}#key-1`],
//     assertionMethod: [`${DID_WEB}#key-1`],
//     service: [
//       {
//         id: `${DID_WEB}#sustainable-crafting-registry`,
//         type: 'SustainableCraftingRegistry',
//         serviceEndpoint: `${DOMAIN}/api/vc`,
//       },
//     ],
//   };
// }
