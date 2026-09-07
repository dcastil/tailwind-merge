import path from 'node:path'

import { type TailwindIntegration } from '@tailwind-merge/configurator'
import { type ResolvedConfig, type ResolveFn } from 'vite'

/** Mirrors Tailwind's Vite resolution before environments exist: aliases first, then normal resolution with CSS-specific extensions and package conditions. Eager generation cannot depend on a CSS transform or a plugin container becoming available. */
export function createTailwindIntegration(config: ResolvedConfig): TailwindIntegration {
    const css = config.createResolver({
        ...config.resolve,
        extensions: ['.css'],
        mainFields: ['style'],
        conditions: ['style', 'development|production'],
        tryIndex: false,
        preferRelative: true,
    })
    const js = config.createResolver(config.resolve)
    const ssr = Boolean(config.build.ssr)
    return {
        resolveCss: (id, base) => resolve(css, id, base, ssr, true),
        resolveJs: (id, base) => resolve(js, id, base, ssr, false),
    }
}

/** Only filesystem paths can be read by Tailwind's loaders. Keep CSS alias replacements even before their extension is resolved: the configurator finishes resolution and watches the expanded missing targets on failure. Relative replacements remain relative to the importing stylesheet. */
async function resolve(resolver: ResolveFn, id: string, base: string, ssr: boolean, css: boolean) {
    const importer = path.join(base, '__placeholder__.ts')
    for (const aliasOnly of [true, false]) {
        let file = await resolver(id, importer, aliasOnly, ssr)
        if (!file || (file === id && (aliasOnly || !path.isAbsolute(file)))) {
            continue
        }
        if (file.startsWith('.')) {
            file = path.resolve(base, file)
        }
        if (path.isAbsolute(file) && (file.endsWith('.css') === css || (css && aliasOnly))) {
            return file
        }
    }
    return undefined
}
