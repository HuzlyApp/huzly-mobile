import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StorageKey } from '@/stores/keys';

export async function setItem(key: StorageKey | string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function getItem(key: StorageKey | string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function removeItem(key: StorageKey | string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function setJsonItem<T>(key: StorageKey | string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);
  await AsyncStorage.setItem(key, serialized);
}

export async function getJsonItem<T>(key: StorageKey | string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to parse JSON from AsyncStorage for key "${key}".`, error);
    return null;
  }
}

