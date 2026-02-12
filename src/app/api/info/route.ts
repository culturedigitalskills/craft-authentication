import { readFileSync } from 'fs'
import { resolve } from 'path'
import { BuildInfo, InfoResponse, InfoResponseSchema } from '@/lib/validations/info'

const defaultBuildInfo: BuildInfo = {
    version: '0.0.0',
    commitHash: '0',
    branch: '',
    created: new Date().toISOString(),
}

export async function GET() {
    let buildInfo = defaultBuildInfo

    try {
        const buildInfoPath = resolve(process.cwd(), 'build-info.json')
        buildInfo = JSON.parse(readFileSync(buildInfoPath, 'utf-8'))
    } catch (error) {
        // Use defaults if build-info.json is not found
    }

    const response: InfoResponse = {
        ...buildInfo,
        timestamp: new Date().toISOString(),
    }

    return Response.json(InfoResponseSchema.parse(response))
}
