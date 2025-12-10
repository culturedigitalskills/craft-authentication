import { S3Client, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
    region: process.env.S3_REGION || 'garage',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:3900',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: true,
})

export const BUCKET_NAME = process.env.S3_BUCKET || 'media-files'

// Initialize Garage bucket
export async function initGarage() {
    try {
        const headBucketCommand = new HeadBucketCommand({ Bucket: BUCKET_NAME })
        await s3Client.send(headBucketCommand)
        console.log(`Garage bucket '${BUCKET_NAME}' exists`)
    } catch (error: any) {
        if (error.name === 'NoSuchBucket') {
            try {
                const createBucketCommand = new CreateBucketCommand({ Bucket: BUCKET_NAME })
                await s3Client.send(createBucketCommand)
                console.log(`Garage bucket '${BUCKET_NAME}' created`)
            } catch (createError) {
                console.error('Error creating Garage bucket:', createError)
            }
        } else {
            console.error('Garage initialization error:', error)
        }
    }
}

export default s3Client
