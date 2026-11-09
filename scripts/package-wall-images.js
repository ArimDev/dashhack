// Nitro's file tracer does not yet follow Sharp 0.35's ESM/native exports reliably.
// Package only this build platform's runtime, never every optional architecture.
import { cpSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function packageRoot(name, entry) {
    let root = dirname(entry);
    while (root !== dirname(root)) {
        try { if (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name === name) return root; } catch {}
        root = dirname(root);
    }
    throw new Error(`Could not locate ${name} runtime package`);
}
const sharpRoot = packageRoot('sharp', require.resolve('sharp'));
const sharpRequire = createRequire(join(sharpRoot, 'package.json'));
const libc = process.platform === 'linux' && sharpRequire('detect-libc').familySync() === 'musl' ? 'linuxmusl' : process.platform;
const platform = `${libc}-${process.arch}`;
const target = resolve('src/.output/server/node_modules');
for (const name of ['sharp', 'detect-libc', '@img/colour', `@img/sharp-${platform}`, `@img/sharp-libvips-${platform}`]) {
    const entry = sharpRequire.resolve(name === `@img/sharp-libvips-${platform}` ? `${name}/package`
        : name === `@img/sharp-${platform}` ? `${name}/sharp.node` : name);
    const root = packageRoot(name, entry);
    const destination = join(target, name); mkdirSync(destination, { recursive: true });
    if (name === 'sharp') {
        cpSync(join(root, 'package.json'), join(destination, 'package.json'));
        if (existsSync(join(root, 'LICENSE'))) cpSync(join(root, 'LICENSE'), join(destination, 'LICENSE'));
        cpSync(join(root, 'dist'), join(destination, 'dist'), { recursive: true });
    } else cpSync(root, destination, { recursive: true });
}
console.log(`Packaged WebP image runtime for ${platform}.`);
