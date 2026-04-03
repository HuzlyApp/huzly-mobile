import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'huzly_home_address_text';

export const DEFAULT_HOME_ADDRESS = 'San Jose, GA 20031';

export async function getHomeAddressText(): Promise<string> {
  const v = await AsyncStorage.getItem(KEY);
  return v?.trim() || DEFAULT_HOME_ADDRESS;
}

export async function setHomeAddressText(address: string): Promise<void> {
  await AsyncStorage.setItem(KEY, address.trim());
}
