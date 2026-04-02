import { Asset } from 'expo-asset';
import { Audio as ExpoAudio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

/**
 * Bundled asset (copy of public/notifcation.mp3). Native: Metro bundle. Web: expo-asset resolves the dev-server URL (e.g. localhost:8081).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SOUND_SOURCE = require('../../../assets/notifcation.mp3');

let webUnlockListenersAttached = false;
/** True after a successful in-gesture prime on the pooled element (required for later async plays on localhost). */
let didPrimeWebAudio = false;

let pooledWebAudio: HTMLAudioElement | null = null;
let webSoundUri: string | null = null;
let webSoundUriPromise: Promise<string> | null = null;

function getPooledWebAudio(): HTMLAudioElement {
  if (!pooledWebAudio) {
    // Must use the browser's HTMLAudioElement — do not use `new Audio()` here; `Audio` is shadowed by expo-av's export in some bundles.
    pooledWebAudio = new window.Audio();
    pooledWebAudio.preload = 'auto';
  }
  return pooledWebAudio;
}

/**
 * Expo serves the correct asset URL for webpack dev (localhost:8081). Falls back to /notifcation.mp3 from public/.
 */
async function ensureWebSoundUri(): Promise<string> {
  if (webSoundUri) return webSoundUri;
  if (!webSoundUriPromise) {
    webSoundUriPromise = (async () => {
      try {
        const asset = Asset.fromModule(SOUND_SOURCE);
        await asset.downloadAsync();
        const u = asset.localUri ?? asset.uri;
        if (u) {
          webSoundUri = u;
          return u;
        }
      } catch {
        // fall through
      }
      if (typeof window !== 'undefined') {
        const fallback = `${window.location.origin}/notifcation.mp3`;
        webSoundUri = fallback;
        return fallback;
      }
      webSoundUri = '/notifcation.mp3';
      return webSoundUri;
    })();
  }
  return webSoundUriPromise;
}

function attachWebAudioUnlockListeners() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || webUnlockListenersAttached) return;
  webUnlockListenersAttached = true;

  /**
   * Must call `play()` synchronously inside the event — no `await` before it — or Chrome drops user activation.
   */
  const onInteract = () => {
    const el = getPooledWebAudio();
    if (!el.src && webSoundUri) {
      el.src = webSoundUri;
      el.load();
    }
    if (!el.src) return;

    el.volume = 0.0001;
    const pending = el.play();
    if (pending !== undefined) {
      void pending
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.volume = 1;
          didPrimeWebAudio = true;
        })
        .catch(() => {
          // Still allow later retries
        });
    }
  };

  window.addEventListener('pointerdown', onInteract, { capture: true });
  window.addEventListener('keydown', onInteract, { capture: true });
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  attachWebAudioUnlockListeners();
  void ensureWebSoundUri().then((uri) => {
    const el = getPooledWebAudio();
    if (!el.src) {
      el.src = uri;
      el.load();
    }
  });
}

export function markNotificationAudioUnlockedFromUserGesture() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const el = getPooledWebAudio();
  if (!el.src && webSoundUri) {
    el.src = webSoundUri;
    el.load();
  }
  if (!el.src) return;
  el.volume = 0.0001;
  const pending = el.play();
  if (pending !== undefined) {
    void pending
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.volume = 1;
        didPrimeWebAudio = true;
      })
      .catch(() => {});
  }
}

export function isNotificationAudioGestureUnlocked() {
  return Platform.OS !== 'web' || didPrimeWebAudio;
}

async function setAudioMode() {
  await ExpoAudio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

export async function playMessageNotificationSound(options: {
  enabled: boolean;
  kind?: 'user' | 'system';
}): Promise<void> {
  if (!options.enabled) return;
  void options.kind;

  attachWebAudioUnlockListeners();

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    try {
      const uri = await ensureWebSoundUri();
      const el = getPooledWebAudio();
      if (el.src !== uri) {
        el.src = uri;
        el.load();
      }
      el.volume = 1;
      el.currentTime = 0;
      await el.play();
    } catch (e) {
      if (__DEV__) {
        console.warn(
          '[notification-sound] Web play failed. Click or tap the page once (so audio unlocks), then try again:',
          e,
        );
      }
    }
    return;
  }

  try {
    await setAudioMode();
    const { sound } = await ExpoAudio.Sound.createAsync(SOUND_SOURCE, {
      shouldPlay: false,
      volume: 1,
      isMuted: false,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && 'didJustFinish' in status && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
    await sound.playAsync();
  } catch (e) {
    if (__DEV__) {
      console.warn('[notification-sound] Native play failed:', e);
    }
  }
}
