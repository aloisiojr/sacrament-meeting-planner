/**
 * The staging app variant.
 *
 * On 2026-08-04 a TestFlight build pointed at the staging database installed over the real App
 * Store app on testers' phones, because both shared one bundle identifier and internal TestFlight
 * groups receive every build automatically. app.config.js gives staging its own identity so that
 * cannot recur.
 *
 * The dangerous direction is a production build silently picking up the staging identity — it
 * would be rejected by App Store Connect at best, and at worst ship under the wrong record. So
 * both branches are pinned, not just the new one.
 */

/** Load app.config.js fresh with a given APP_VARIANT. */
function resolveConfig(variant?: string) {
  const previous = process.env.APP_VARIANT;
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;

  jest.resetModules();
  const appJson = require('../../app.json').expo;
  const configFn = require('../../app.config.js');
  const resolved = configFn({ config: appJson });

  if (previous === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = previous;
  return resolved;
}

const PROD_BUNDLE = 'com.sacramentmeetingmanager.app';

describe('production identity is never altered', () => {
  it.each([undefined, '', 'production'])(
    'APP_VARIANT=%p leaves the bundle identifier alone',
    (variant) => {
      expect(resolveConfig(variant).ios.bundleIdentifier).toBe(PROD_BUNDLE);
    }
  );

  it.each(['staging', 'anything-else', 'Development', 'dev'])(
    'APP_VARIANT=%p THROWS rather than falling through to production',
    (variant) => {
      // The worst possible default. A stale APP_VARIANT — "staging" was a real value until
      // 2026-08-05 — would otherwise silently build under the REAL bundle identifier.
      expect(() => resolveConfig(variant)).toThrow(/Unknown APP_VARIANT/);
    }
  );

  it('leaves the name and scheme alone', () => {
    const c = resolveConfig(undefined);
    expect(c.name).toBe('Sacrament Meeting Planner');
    expect(c.scheme).toBe('sacrmeetplan');
  });

  it('returns the config untouched, not a rebuilt copy that could drop fields', () => {
    // A no-op branch that reconstructs the object risks losing a key nobody notices until a build
    // behaves oddly. Identity is the safest contract.
    const base = { name: 'X', scheme: 's', ios: { bundleIdentifier: 'b' }, extra: { keep: 1 } };
    jest.resetModules();
    delete process.env.APP_VARIANT;
    const configFn = require('../../app.config.js');
    expect(configFn({ config: base })).toBe(base);
  });
});

describe('the dev-client variant', () => {
  const dev = () => resolveConfig('development');

  it('is a separate app from production, so it never overwrites the real one', () => {
    expect(dev().ios.bundleIdentifier).toBe(`${PROD_BUNDLE}.dev`);
    expect(dev().ios.bundleIdentifier).not.toBe(resolveConfig(undefined).ios.bundleIdentifier);
  });

  it('has its own name and scheme', () => {
    expect(dev().name).toBe('SMP Dev');
    expect(dev().scheme).not.toBe(resolveConfig(undefined).scheme);
  });

  it('fits the App Store Connect name limit', () => {
    expect(dev().name.length).toBeLessThanOrEqual(30);
  });
});

describe('the identities are mutually distinct', () => {
  it('no two variants share a bundle id, name or scheme', () => {
    const all = [resolveConfig(undefined), resolveConfig('development')];
    for (const field of ['name', 'scheme'] as const) {
      expect(new Set(all.map((c) => c[field])).size).toBe(all.length);
    }
    expect(new Set(all.map((c) => c.ios.bundleIdentifier)).size).toBe(all.length);
  });
});


describe('eas.json wires the variant to exactly the staging-facing profiles', () => {
  const eas = require('../../eas.json');

  /** A profile's effective env, following `extends`. */
  function envFor(name: string): Record<string, string> {
    const profile = eas.build[name];
    return profile.env ?? (profile.extends ? envFor(profile.extends) : {});
  }

  it('there are exactly two profiles', () => {
    // One loop for development, one for release. Anything else was an app to keep in sync.
    expect(Object.keys(eas.build).sort()).toEqual(['development-testflight', 'production']);
  });

  it('development-testflight builds the dev variant', () => {
    expect(envFor('development-testflight').APP_VARIANT).toBe('development');
  });

  it('every APP_VARIANT in eas.json is one app.config.js knows', () => {
    // A profile naming a variant the config does not define now fails the BUILD, so catch it here.
    for (const profile of Object.keys(eas.build)) {
      const v = envFor(profile).APP_VARIANT;
      if (v !== undefined) expect(() => resolveConfig(v)).not.toThrow();
    }
  });

  it('the dev client is reachable without an ad-hoc provisioning profile', () => {
    // The device is MDM-supervised, so `distribution: internal` cannot be installed on it. A dev
    // client has to arrive through TestFlight, which is what `store` gives.
    const p = eas.build['development-testflight'];
    expect(p.distribution).toBe('store');
    expect(p.developmentClient).toBe(true);
  });

  it('production does NOT', () => {
    expect(envFor('production').APP_VARIANT).toBeUndefined();
  });

  it('exactly one profile can be submitted with the production identity', () => {
    // The submit profiles are the ones that can reach App Store Connect. Only `production` may
    // carry the real bundle id there.
    for (const profile of Object.keys(eas.submit)) {
      if (envFor(profile).APP_VARIANT === undefined) expect(profile).toBe('production');
    }
  });

  it('exactly one profile builds the production identity', () => {
    // There is no separate "testflight-production": every App Store release passes through
    // TestFlight, so `production` already serves both. Two profiles emitting the same artefact
    // would only raise the question of which one was used.
    const productionIdentity = Object.keys(eas.build).filter(
      (p) => envFor(p).APP_VARIANT === undefined
    );
    expect(productionIdentity).toEqual(['production']);
  });

  it('only the production profile can reach the production database', () => {
    for (const profile of Object.keys(eas.build)) {
      const url = envFor(profile).EXPO_PUBLIC_SUPABASE_URL ?? '';
      if (url.includes('poizgglzdjqwrhsnhkke')) expect(profile).toBe('production');
    }
  });

  it('every non-production identity points at the staging database, and only production at production', () => {
    // The two must never disagree: a non-production identity against the production database, or
    // the reverse, is the exact confusion these variants exist to prevent.
    for (const profile of Object.keys(eas.build)) {
      const env = envFor(profile);
      const isNonProdIdentity = env.APP_VARIANT !== undefined;
      const isStagingDb = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').includes('nfraidzguordqmbpqkcf');
      expect(isNonProdIdentity).toBe(isStagingDb);
    }
  });
});
