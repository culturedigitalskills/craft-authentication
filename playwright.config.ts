import { defineConfig, devices } from '@playwright/test'
import { baseURL, isolatedEnvironment } from './e2e/isolated-environment.mjs'

const environment = isolatedEnvironment()

export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.spec.ts',
    fullyParallel: false,
    workers: 1,
    timeout: 90_000,
    expect: { timeout: 15_000 },
    reporter: 'list',
    outputDir: '.local-dev/playwright-results',
    use: {
        baseURL,
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'pnpm exec next dev --hostname localhost --port 20200',
        url: baseURL,
        env: { ...environment, LANGUAGE_E2E: '1' },
        timeout: 120_000,
        reuseExistingServer: false,
    },
})
