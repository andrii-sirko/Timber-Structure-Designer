// Registers the `@/` → `src/` path alias for `node --test` (the app resolves it through Vite).
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
