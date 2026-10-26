import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    prettierRecommended,
    {
        rules: {
            quotes: ['error', 'single', { avoidEscape: true }],
            semi: ['error', 'never'],
            indent: ['error', 4, { SwitchCase: 1 }],
            'prettier/prettier': [
                'error',
                {
                    semi: false,
                    singleQuote: true,
                    tabWidth: 4,
                    useTabs: false,
                    printWidth: 100,
                },
            ],
        },
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
])

export default eslintConfig
