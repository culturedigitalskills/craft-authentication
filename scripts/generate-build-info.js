const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function generateBuildInfo() {
    const buildInfo = {
        version: '0.0.0',
        commitHash: '0',
        branch: '',
        created: new Date().toISOString(),
    }

    try {
        // Get version from package.json
        const packageJsonPath = path.join(process.cwd(), 'package.json')
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        buildInfo.version = packageJson.version || '0.0.0'
    } catch (error) {
        console.warn('Failed to read version from package.json:', error.message)
    }

    try {
        // Get commit hash
        buildInfo.commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
    } catch (error) {
        console.warn('Failed to get commit hash:', error.message)
    }

    try {
        // Get branch
        buildInfo.branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
    } catch (error) {
        console.warn('Failed to get branch:', error.message)
    }

    // Write to file
    const outputPath = path.join(process.cwd(), 'build-info.json')
    fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2))
    console.log(`Build info written to ${outputPath}`)
}

generateBuildInfo()
