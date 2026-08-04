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
  it.each([undefined, '', 'production', 'anything-else'])(
    'APP_VARIANT=%p leaves the bundle identifier alone',
    (variant) => {
      expect(resolveConfig(variant).ios.bundleIdentifier).toBe(PROD_BUNDLE);
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

describe('the staging variant', () => {
  const staging = () => resolveConfig('staging');

  it('gets its own bundle identifier', () => {
    expect(staging().ios.bundleIdentifier).toBe(`${PROD_BUNDLE}.staging`);
  });

  it('is distinguishable on the home screen', () => {
    expect(staging().name).toContain('Staging');
  });

  it('claims a different URL scheme', () => {
    // Two installed apps registering the same scheme is a coin flip over which one a deep link
    // opens.
    const prod = resolveConfig(undefined);
    expect(staging().scheme).not.toBe(prod.scheme);
  });

  it('keeps every other iOS setting', () => {
    // Spreading config.ios must not drop the export-compliance flag; losing it makes every
    // TestFlight upload prompt for encryption details.
    expect(staging().ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
    expect(staging().ios.supportsTablet).toBe(true);
  });

  it('keeps the EAS project id, so both variants stay one project', () => {
    const prod = resolveConfig(undefined);
    expect(staging().extra.eas.projectId).toBe(prod.extra.eas.projectId);
  });

  it('leaves the Android package alone', () => {
    // google-services.json declares only the production package; varying it without a matching
    // Firebase app would fail the Android build. Documented in app.config.js.
    expect(staging().android.package).toBe(PROD_BUNDLE);
  });
});

describe('eas.json wires the variant to exactly the staging-facing profiles', () => {
  const eas = require('../../eas.json');

  /** A profile's effective env, following `extends`. */
  function envFor(name: string): Record<string, string> {
    const profile = eas.build[name];
    return profile.env ?? (profile.extends ? envFor(profile.extends) : {});
  }

  it.each(['development', 'staging', 'testflight-staging', 'appetize'])(
    '%s builds the staging variant',
    (profile) => {
      expect(envFor(profile).APP_VARIANT).toBe('staging');
    }
  );

  it('production does NOT', () => {
    expect(envFor('production').APP_VARIANT).toBeUndefined();
  });

  it('exactly one profile builds the production identity', () => {
    // There is no separate "testflight-production": every App Store release passes through
    // TestFlight, so `production` already serves both. Two profiles emitting the same artefact
    // would only raise the question of which one was used.
    const productionIdentity = Object.keys(eas.build).filter(
      (p) => envFor(p).APP_VARIANT !== 'staging'
    );
    expect(productionIdentity).toEqual(['production']);
  });

  it('only the production profile can reach the production database', () => {
    for (const profile of Object.keys(eas.build)) {
      const url = envFor(profile).EXPO_PUBLIC_SUPABASE_URL ?? '';
      if (url.includes('poizgglzdjqwrhsnhkke')) expect(profile).toBe('production');
    }
  });

  it('every profile carrying the variant also points at the staging database', () => {
    // The two must never disagree: a staging identity against the production database, or the
    // reverse, is the exact confusion this variant exists to prevent.
    for (const profile of Object.keys(eas.build)) {
      const env = envFor(profile);
      const isStagingIdentity = env.APP_VARIANT === 'staging';
      const isStagingDb = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').includes('nfraidzguordqmbpqkcf');
      expect(isStagingIdentity).toBe(isStagingDb);
    }
  });
});
