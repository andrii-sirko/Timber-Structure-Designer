import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../src/', import.meta.url);

/** Vite-style extensionless / directory imports → an existing .ts / .tsx / index.ts file. */
function withExtension(url) {
  const path = fileURLToPath(url);
  if (existsSync(path) && statSync(path).isFile()) return url;
  for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    if (existsSync(path + ext)) return new URL(url.href + ext);
  }
  return url;
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    return next(withExtension(new URL(specifier.slice(2), SRC)).href, context);
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    return next(withExtension(new URL(specifier, context.parentURL)).href, context);
  }
  return next(specifier, context);
}
