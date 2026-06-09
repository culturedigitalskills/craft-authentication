import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            'server-only': path.resolve(__dirname, './scripts/empty.js'),
        },
        globals: true,
        environment: 'node',
    },
})
