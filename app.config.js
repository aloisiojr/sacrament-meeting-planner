/**
 * Dynamic app config: builds a STAGING variant with its own bundle identifier.
 *
 * Why this exists
 * ---------------
 * Staging and production builds used to share `com.sacramentmeetingmanager.app`, which meant a
 * TestFlight build pointed at the staging database installed OVER the real App Store app on a
 * tester's phone. Internal TestFlight groups receive every build automatically — there is no
 * per-group gating — so a staging build reaches every internal tester, including real bishops
 * using the app for their ward. That happened on 2026-08-04.
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
  staging: { suffix: '.staging', name: 'SMP Staging' },
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
  const variant = VARIANTS[process.env.APP_VARIANT];
  if (!variant) {
    // Production identity, untouched. Keeping this path a no-op — returning `config` itself, not a
    // rebuilt copy — means a mistake in the variant logic cannot alter a production build.
    return config;
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
