import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser'
import { routing } from '@/i8n/routing'

function flatten(value: unknown, prefix = '', result: Record<string, string> = {}) {
    if (typeof value === 'string') result[prefix] = value
    else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value))
            flatten(child, prefix ? prefix + '.' + key : key, result)
    }
    return result
}
function argumentsUsed(value: string) {
    const names = new Set<string>()
    function visit(nodes: MessageFormatElement[]) {
        for (const node of nodes) {
            if (
                [
                    TYPE.argument,
                    TYPE.number,
                    TYPE.date,
                    TYPE.time,
                    TYPE.select,
                    TYPE.plural,
                ].includes(node.type)
            ) {
                names.add((node as { value: string }).value)
            }
            if (node.type === TYPE.select || node.type === TYPE.plural) {
                for (const option of Object.values(node.options)) visit(option.value)
            }
            if (node.type === TYPE.tag) visit(node.children)
        }
    }
    visit(parse(value))
    return [...names].sort()
}

const english = flatten(JSON.parse(readFileSync('messages/en.json', 'utf8')))

describe('translation catalogs', () => {
    it.each(routing.locales)('%s has valid ICU syntax and matching message arguments', (locale) => {
        const translated = flatten(JSON.parse(readFileSync('messages/' + locale + '.json', 'utf8')))
        const allowedMissing = (key: string) =>
            key.startsWith('privacy.') || key.startsWith('terms.')
        expect(
            Object.keys(english).filter((key) => !(key in translated) && !allowedMissing(key)),
        ).toEqual([])
        expect(Object.keys(translated).filter((key) => !(key in english))).toEqual([])
        for (const [key, value] of Object.entries(translated)) {
            expect(() => parse(value), key).not.toThrow()
            expect(argumentsUsed(value), key).toEqual(argumentsUsed(english[key]))
        }
    })
})
