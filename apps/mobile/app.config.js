/**
 * Merges env into Expo config. `MAPBOX_API_KEY` in `.env` is exposed to the app via `expo-constants` `extra`
 * (public Mapbox tokens are safe to ship; still avoid committing production keys to public repos).
 */
module.exports = ({ config }) => ({
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
    mapboxAccessToken:
      process.env.MAPBOX_API_KEY || process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  },
});
