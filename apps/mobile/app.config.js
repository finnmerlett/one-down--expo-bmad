// Dynamic wrapper over app.json (Expo merges: app.json is loaded first and
// passed in as `config`).
//
// E2E_BUILD=1 (set by the root `mobile:build` script) disables expo-updates
// in LOCALLY BUILT release APKs: the e2e suite's no-clearState relaunch legs
// otherwise boot whatever OTA the app downloaded mid-flow — the moment the
// local build is AHEAD of the published OTA, those legs regress to the old
// bundle and fail on new UI (bit us 2026-08-16, story 9.8). The phone never
// runs these APKs (it gets EAS builds + OTA), so production is untouched.
module.exports = ({ config }) => {
  if (process.env.E2E_BUILD === '1') {
    return {
      ...config,
      updates: { ...config.updates, enabled: false },
    };
  }
  return config;
};
