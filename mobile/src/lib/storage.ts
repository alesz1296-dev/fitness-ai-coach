/**
 * Async storage abstraction backed by expo-secure-store.
 * Tokens are encrypted at rest by the OS keychain (iOS) / Keystore (Android).
 */
import * as SecureStore from "expo-secure-store";

export const storage = {
  getItemAsync:    (key: string)                => SecureStore.getItemAsync(key),
  setItemAsync:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItemAsync: (key: string)                => SecureStore.deleteItemAsync(key),
};
