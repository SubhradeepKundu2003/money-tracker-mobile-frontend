import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Base URL of the Spring Boot backend (money-tracker-backend).
 *
 * Resolution order:
 *  1. An explicit, non-localhost `expo.extra.apiUrl` in app.json wins (use this
 *     for staging/production builds).
 *  2. In dev we derive the host from the machine Metro is being served from
 *     (Expo exposes it as `hostUri`, e.g. "192.168.1.42:8081") and swap in the
 *     backend port. This is what makes Expo Go on a *physical device* work:
 *     `localhost` would point at the phone itself, and `10.0.2.2` only works in
 *     the Android emulator.
 *  3. Fallbacks: Android emulator -> 10.0.2.2, otherwise localhost.
 *
 * Assumes the backend runs on the same machine as Metro, on BACKEND_PORT.
 * If it runs elsewhere, set `extra.apiUrl` explicitly.
 */
const BACKEND_PORT = 8099;

function hostFromExpo() {
  // hostUri: "192.168.1.42:8081" (SDK 49+). Older shape: debuggerHost.
  const uri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';
  const host = uri.split(':')[0];
  return host && host !== 'localhost' && host !== '127.0.0.1' ? host : null;
}

function resolveApiUrl() {
  const configured = Constants.expoConfig?.extra?.apiUrl;
  if (configured && !/localhost|127\.0\.0\.1/.test(configured)) {
    return configured.replace(/\/$/, '');
  }

  const lanHost = hostFromExpo();
  if (lanHost) {
    return `http://${lanHost}:${BACKEND_PORT}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }
  return `http://localhost:${BACKEND_PORT}`;
}

export const API_URL = resolveApiUrl();
