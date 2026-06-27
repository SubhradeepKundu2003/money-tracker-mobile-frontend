import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'mt.sessionToken';
const REFRESH_KEY = 'mt.refreshToken';

/**
 * Persists the opaque session + refresh tokens in the device keychain.
 * Per the backend API contract, BOTH tokens live in expo-secure-store.
 */
export async function saveTokens({ sessionToken, refreshToken }) {
  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEY, sessionToken),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
  ]);
}

export async function getSessionToken() {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(SESSION_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
