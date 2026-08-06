/**
 * Guard for a cross-runtime invariant, not a style preference.
 *
 * `supabase/functions/register-first-user/index.ts` imports `src/lib/whatsappUtils.ts` directly, so
 * Deno loads this module every time a ward is created. Deno resolves nothing for it — no
 * node_modules, no path aliases. The moment whatsappUtils gains ANY import, the deployed edge
 * function breaks, and nothing here would notice: `tsc` excludes `supabase/functions`, lint has no
 * opinion, and jest resolves node modules happily.
 *
 * Note on how this is checked. The cheap version — inspecting `require.cache[...].children` — is
 * VACUOUS under jest: jest's registry leaves `children` empty even for a module that does have
 * imports (measured against `src/lib/whatsapp.ts`, which imports react-native, and still reported
 * `[]`). So instead of asserting anything about the source text, this EXECUTES the module with a
 * `require()` that refuses to hand anything over, which is the constraint Deno actually imposes.
 */
import { readFileSync } from 'fs';
import vm from 'vm';
import { transformSync } from '@babel/core';

import { getDefaultSpeechTemplate, getDefaultPrayerTemplate } from '../lib/whatsappUtils';

const MODULE_PATH = require.resolve('../lib/whatsappUtils');

/** Run the module in a bare context whose `require` throws, and return what it exported. */
function loadWithNothingToResolve(): Record<string, unknown> {
  const result = transformSync(readFileSync(MODULE_PATH, 'utf8'), {
    filename: MODULE_PATH,
    babelrc: false,
    configFile: false,
    // onlyRemoveTypeImports: without it the TS preset ELIDES an import whose binding is unused,
    // and the guard silently stops catching exactly the change it exists to catch.
    presets: [['@babel/preset-typescript', { onlyRemoveTypeImports: true }]],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const mod = { exports: {} as Record<string, unknown> };
  vm.runInNewContext(result!.code!, {
    module: mod,
    exports: mod.exports,
    require: (specifier: string) => {
      throw new Error(
        `whatsappUtils must stay dependency-free — the Deno edge function loads it — ` +
          `but it required "${specifier}"`
      );
    },
  });
  return mod.exports;
}

describe('whatsappUtils loads with no module resolution at all', () => {
  it('executes without requiring anything, and still serves the templates', () => {
    const exported = loadWithNothingToResolve();

    const speech = exported.getDefaultSpeechTemplate as (l: string, n: 1 | 2 | 3) => string;
    const prayer = exported.getDefaultPrayerTemplate as (l: string, t: 'opening' | 'closing') => string;
    expect(typeof speech).toBe('function');
    expect(typeof prayer).toBe('function');

    // Same text the app serves — this is what the edge function seeds into a new ward.
    for (const language of ['pt-BR', 'en-US', 'es-LA', 'fr-FR']) {
      expect(speech(language, 1)).toBe(getDefaultSpeechTemplate(language, 1));
      expect(prayer(language, 'opening')).toBe(getDefaultPrayerTemplate(language, 'opening'));
      expect(prayer(language, 'closing')).toBe(getDefaultPrayerTemplate(language, 'closing'));
    }
  });
});
