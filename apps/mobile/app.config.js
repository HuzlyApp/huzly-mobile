const fs = require('fs');
const path = require('path');

/**
 * Populate `process.env` from `apps/mobile/.env`. Expo does not always load `.env` before this file runs,
 * so `extra.mapboxAccessToken` would stay empty and maps show "Add a Mapbox token…".
 */
function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadLocalEnv();

/**
 * Merges env into Expo config. `MAPBOX_API_KEY` / `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` in `.env` is exposed via `extra`
 * (public Mapbox tokens are safe to ship; still avoid committing production keys to public repos).
 */
module.exports = ({ config }) => {
  const mapboxAccessToken = (
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    process.env.MAPBOX_API_KEY ||
    ''
  ).trim();
  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...(config.ios?.infoPlist && typeof config.ios.infoPlist === 'object' ? config.ios.infoPlist : {}),
        NSLocationWhenInUseUsageDescription:
          'Huzly uses your location to show nearby shifts and directions to job sites.',
      },
    },
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Huzly uses your location on maps and directions.',
        },
      ],
    ],
    extra: {
      ...config.extra,
      mapboxAccessToken,
    },
  };
};
