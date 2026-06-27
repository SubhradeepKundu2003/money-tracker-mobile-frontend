import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/endpoints';
import { setAuthExpiredHandler } from '../api/client';
import {
  saveTokens,
  clearTokens,
  getSessionToken,
  getRefreshToken,
} from '../api/tokenStorage';
import { seedGuestIfNeeded, clearGuestData } from '../data/localStore';
import { migrateGuestToBackend } from '../data/migrate';

const AuthContext = createContext(null);

const MODE_KEY = 'mt.mode'; // 'guest' persisted so a guest stays signed in across launches

const GUEST_USER = {
  id: 'guest',
  email: null,
  displayName: 'Guest',
  baseCurrency: 'INR',
  role: 'GUEST',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Enter (or stay in) guest mode. This is the app's default state — there is no
  // login wall; signing in is only needed to sync data to the cloud.
  const enterGuest = useCallback(async () => {
    await seedGuestIfNeeded();
    await AsyncStorage.setItem(MODE_KEY, 'guest');
    setIsGuest(true);
    setUser(GUEST_USER);
  }, []);

  // Wipe the on-device guest data and start fresh (still a guest).
  const resetGuestData = useCallback(async () => {
    await clearGuestData();
    await enterGuest();
  }, [enterGuest]);

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    try {
      if (await getSessionToken()) await authApi.logout(refreshToken);
    } catch {
      // best-effort; we clear locally regardless
    }
    await clearTokens();
    // Drop back to guest mode so the app stays usable without logging in again.
    await enterGuest();
  }, [enterGuest]);

  // When the API client gives up refreshing, fall back to guest mode rather than
  // bouncing to a login screen.
  useEffect(() => {
    setAuthExpiredHandler(() => {
      enterGuest();
    });
    return () => setAuthExpiredHandler(null);
  }, [enterGuest]);

  // On launch: prefer a real session; otherwise default straight into guest mode.
  useEffect(() => {
    (async () => {
      try {
        const token = await getSessionToken();
        if (token) {
          const me = await authApi.me();
          setUser(me);
          return;
        }
        await enterGuest();
      } catch {
        await clearTokens();
        await enterGuest();
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [enterGuest]);

  // After a real auth success, if we were a guest, push local data to the server.
  const handleAuthSuccess = useCallback(
    async (data) => {
      await saveTokens({
        sessionToken: data.sessionToken,
        refreshToken: data.refreshToken,
      });
      let synced = null;
      if (isGuest) {
        try {
          synced = await migrateGuestToBackend();
        } catch (e) {
          // Migration failed: keep local data, surface the error to the caller.
          await clearTokens();
          throw new Error(
            'Signed in, but syncing your guest data failed. Please try again.',
          );
        }
        await AsyncStorage.removeItem(MODE_KEY);
      }
      setIsGuest(false);
      setUser(data.user);
      return { user: data.user, synced };
    },
    [isGuest],
  );

  const signIn = useCallback(
    async (email, password) => {
      const data = await authApi.login({ email, password });
      return handleAuthSuccess(data);
    },
    [handleAuthSuccess],
  );

  const register = useCallback(
    async (email, password, displayName) => {
      const data = await authApi.register({ email, password, displayName });
      return handleAuthSuccess(data);
    },
    [handleAuthSuccess],
  );

  const value = useMemo(
    () => ({
      user,
      isGuest,
      bootstrapping,
      signIn,
      register,
      continueAsGuest: enterGuest,
      resetGuestData,
      signOut,
      setUser,
    }),
    [user, isGuest, bootstrapping, signIn, register, enterGuest, resetGuestData, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
