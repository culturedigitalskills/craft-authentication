// import crypto from 'crypto';
// import { getKeyPair, DOMAIN, DID_WEB } from './config';

// export interface CraftVCSubject {
//   id: string;
//   type: 'Craft';
//   title: string;
//   description: string;
//   ownerId: string;
//   dateCreated: string;
//   imageUrl?: string;
//   imageHash?: string;
// }

// export interface CraftCredential {
//   '@context': (string | Record<string, string>)[];
//   type: string[];
//   issuer: {
//     id: string;
//     name: string;
//   };
//   credentialSubject: CraftVCSubject;
//   validFrom: string;
//   validUntil?: string;
//   proof: {
//     type: string;
//     created: string;
//     verificationMethod: string;
//     proofPurpose: string;
//     signature: string;
//   };
// }

// // Simple JWT-style signing compatible with Vercel
// function signData(data: string, privateKey: string): string {
//   // Use RSA-SHA256 signing for better platform compatibility
//   const sign = crypto.createSign('RSA-SHA256');
//   sign.update(data);
//   sign.end();
//   return sign.sign(privateKey, 'base64');
// }

// // Generate a Verifiable Credential for a craft record
// export async function generateCraftVC(
//   craftId: string, 
//   craftTitle: string, 
//   craftDescription: string, 
//   craftOwner: string, 
//   craftCreatedAt: string,
//   craftImage: object | null): Promise<CraftCredential> {
//   console.log('generateCraftVC called with craft:', {
//     id: craftId,
//     title: craftTitle,
//     titleType: typeof craftTitle,    
//     titleIsNull: craftTitle === null,
//     titleIsUndefined: craftTitle === undefined,
//     description: craftDescription,
//     descriptionType: typeof craftDescription,
//     descriptionIsNull: craftDescription === null,
//     descriptionIsUndefined: craftDescription === undefined,
//     owner: craftOwner,
//     createdAt: craftCreatedAt,
//   });

//   try {
//     const keyPair = getKeyPair();
//     console.log('Got key pair, public key length:', keyPair.publicKey.length);

//     // Extract owner ID properly from the populated relationship
//     const ownerId =
//       typeof craftOwner === 'string'
//         ? craftOwner
//         : typeof craftOwner === 'number'
//           ? craftOwner.toString()
//           : craftOwner.id?.toString() || '';

//     console.log('Owner ID:', ownerId, 'Owner object:', craftOwner);

//     // Construct the subject ID using our domain and craft ID
//     const subjectId = `${DOMAIN}/crafts/${ownerId}/${craftId}`;
//     console.log('Subject ID:', subjectId);

//     // Get image URL if available
//     const image = typeof craftImage === 'object' ? craftImage : null;
//     console.log('Image object:', image);
//     const imageUrl = image?.url ? `${DOMAIN}${image.url}` : undefined;
//     console.log('Image URL:', imageUrl);

//     // Generate image hash if we have an image (optional)
//     let imageHash: string | undefined;
//     if (imageUrl) {
//       imageHash = crypto.createHash('sha256').update(imageUrl).digest('hex');
//       console.log('Image hash:', imageHash);
//     }

//     // Get title and description - should be strings due to locale-specific fetch
//     // Keep fallback handling for robustness
//     const title =
//       typeof craft.title === 'string'
//         ? craft.title
//         : craft.title && typeof craft.title === 'object'
//           ? (craft.title as Record<string, string>)?.en || Object.values(craft.title as Record<string, string>)[0] || ''
//           : '';

//     const description =
//       typeof craft.description === 'string'
//         ? craft.description
//         : craft.description && typeof craft.description === 'object'
//           ? (craft.description as Record<string, string>)?.en ||
//             Object.values(craft.description as Record<string, string>)[0] ||
//             ''
//           : '';

//     console.log('Extracted title:', title, 'description:', description);

//     const credentialSubject: CraftVCSubject = {
//       id: subjectId,
//       type: 'Craft',
//       title,
//       description,
//       ownerId: ownerId,
//       dateCreated: craft.createdAt,
//       ...(imageUrl && { imageUrl }),
//       ...(imageHash && { imageHash }),
//     };

//     console.log('Credential subject with image data:', {
//       ...credentialSubject,
//       hasImageUrl: !!imageUrl,
//       hasImageHash: !!imageHash,
//     });

//     const now = new Date().toISOString();

//     // Create the unsigned credential
//     const unsignedCredential = {
//       '@context': [
//         'https://www.w3.org/ns/credentials/v2',
//         'https://w3id.org/security/v2',
//         {
//           Craft: 'https://schema.org/Product',
//           title: 'https://schema.org/name',
//           description: 'https://schema.org/description',
//           ownerId: 'https://schema.org/manufacturer',
//           dateCreated: 'https://schema.org/dateCreated',
//           imageUrl: 'https://schema.org/image',
//           imageHash: 'https://schema.org/contentHash',
//         },
//       ],
//       type: ['VerifiableCredential', 'CraftCredential'],
//       issuer: {
//         id: DID_WEB,
//         name: 'Sustainable Crafting Registry',
//       },
//       credentialSubject,
//       validFrom: now,
//     };

//     // Create signature
//     const dataToSign = JSON.stringify(unsignedCredential);
//     const signature = signData(dataToSign, keyPair.privateKey);

//     // Add proof
//     const credential: CraftCredential = {
//       ...unsignedCredential,
//       proof: {
//         type: 'RsaSignature2017',
//         created: now,
//         verificationMethod: `${DID_WEB}#key-1`,
//         proofPurpose: 'assertionMethod',
//         signature,
//       },
//     };

//     console.log('Generated credential for craft:', craft.id);
//     return credential;
//   } catch (error) {
//     console.error('Error generating VC for craft:', craft.id, error);
//     throw error;
//   }
// }

// // Verify a Verifiable Credential
// export async function verifyCraftVC(vc: CraftCredential): Promise<{ verified: boolean; error?: string }> {
//   try {
//     const keyPair = getKeyPair();

//     // Extract the proof and unsigned credential
//     const { proof, ...unsignedCredential } = vc;

//     // Verify the signature using RSA-SHA256
//     const dataToVerify = JSON.stringify(unsignedCredential);
//     const verify = crypto.createVerify('RSA-SHA256');
//     verify.update(dataToVerify);
//     verify.end();

//     const isValid = verify.verify(keyPair.publicKey, proof.signature, 'base64');

//     if (!isValid) {
//       return { verified: false, error: 'Invalid signature' };
//     }

//     // Additional checks
//     if (vc.issuer.id !== DID_WEB) {
//       return { verified: false, error: 'Invalid issuer' };
//     }

//     return { verified: true };
//   } catch (error) {
//     console.error('Error verifying VC:', error);
//     return {
//       verified: false,
//       error: error instanceof Error ? error.message : 'Unknown verification error',
//     };
//   }
// }

// // Extract craft metadata from a VC for comparison
// export function extractCraftFromVC(vc: CraftCredential): Partial<Craft> {
//   const subject = vc.credentialSubject;
//   const craftIdString = subject.id.split('/').pop();
//   const craftId = craftIdString ? parseInt(craftIdString, 10) : undefined;

//   return {
//     id: craftId,
//     title: subject.title,
//     description: subject.description,
//     createdAt: subject.dateCreated,
//     // Note: We don't include owner or image objects as those would need to be resolved separately
//   };
// }
