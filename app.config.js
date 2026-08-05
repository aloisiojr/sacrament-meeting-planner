/**
 * Dynamic app config: builds a STAGING variant with its own bundle identifier.
 *
 * Why this exists
 * ---------------
 * Non-production and production builds used to share `com.sacramentmeetingmanager.app`, which
 * meant a TestFlight build pointed at the staging database installed OVER the real App Store app
 * on a tester's phone. Internal TestFlight groups receive every build automatically — there is no
 * per-group gating — so it reached every internal tester, including real bishops using the app for
 * their ward. That happened on 2026-08-04.
 *
 * A separate bundle id makes it structurally impossible: staging builds go to their own App Store
 * Connect record with its own tester list, and the two apps sit side by side on a device, so
 * testing 2.0.0 no longer costs anyone their production app.
 *
 * This cannot be done in eas.json — its build-profile schema has no `bundleIdentifier` field
 * (verified against @expo/eas-json in eas-cli 18.0.3). It has to be a dynamic config keyed off an
 * env var, which EAS sets per build profile.
 *
 * How it is selected
 * ------------------
 * `APP_VARIANT=staging` in the eas.json profile env. Anything else — including a local `npx expo`
 * run with no env — yields the production identity unchanged, so this file is inert by default.
 *
 * Android is deliberately NOT varied
 * ----------------------------------
 * `google-services.json` declares only `com.sacramentmeetingmanager.app`; changing the Android
 * package without a matching Firebase app would fail the build. Android is not published to any
 * store yet, so the collision risk there is limited to internal APKs. To vary it later: create a
 * second Firebase Android app for `...app.staging`, merge it into google-services.json, then add
 * `android: { ...config.android, package: androidPackage }` below.
 */

/**
 * One entry per non-production identity. Each is a SEPARATE app: separate App Store Connect
 * record, separate tester list, separate install on the device. That is the point — they coexist,
 * so installing the dev client does not overwrite the build you are testing.
 */
const VARIANTS = {
  development: { suffix: '.dev', name: 'SMP Dev' },
};

/**
 * App Store Connect caps an app name at 30 characters, and EAS uses `expo.name` when it creates
 * the app record — `Sacrament Meeting Planner (Staging)` is 35 and failed the submit with
 * "An attribute value is too long. - App name is too long."
 *
 * Short is right for the home screen anyway: iOS truncates around 12 characters.
 */
const APP_STORE_NAME_LIMIT = 30;

/** @param {{ config: import('@expo/config-types').ExpoConfig }} params */
module.exports = ({ config }) => {
  const requested = process.env.APP_VARIANT;

  // Unset (or an explicit "production") means the production identity, untouched. Returning
  // `config` itself rather than a rebuilt copy means a mistake in the variant logic below cannot
  // alter a production build.
  if (!requested || requested === 'production') return config;

  const variant = VARIANTS[requested];
  if (!variant) {
    // Fail loudly. Falling through to production here would be the worst possible default: a
    // stale APP_VARIANT (e.g. "staging", removed on 2026-08-05) would silently build under the
    // REAL bundle identifier and could ship to real users.
    throw new Error(
      `Unknown APP_VARIANT "${requested}". Known variants: ${Object.keys(VARIANTS).join(', ')}. ` +
        `Leave it unset for a production build.`
    );
  }

  if (variant.name.length > APP_STORE_NAME_LIMIT) {
    // Fail at config time with the real reason, rather than 15 minutes into a build.
    throw new Error(
      `App name "${variant.name}" is ${variant.name.length} characters; ` +
        `App Store Connect allows ${APP_STORE_NAME_LIMIT}.`
    );
  }

  return {
    ...config,
    // Shown under the icon, so the apps are distinguishable on the home screen.
    name: variant.name,
    // Two installed apps must not claim the same URL scheme; whichever iOS resolves last wins.
    scheme: `${config.scheme}${variant.suffix.replace('.', '')}`,
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios.bundleIdentifier}${variant.suffix}`,
    },
  };
};
