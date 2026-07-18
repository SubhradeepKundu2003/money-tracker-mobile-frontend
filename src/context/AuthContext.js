import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { seedGuestIfNeeded, clearGuestData } from '../data/localStore';

const AuthContext = createContext(null);

const LOCAL_USER = {
  id: 'local',
  displayName: 'You',
  baseCurrency: 'INR',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Seeds the on-device store (once) and makes it the active profile. This is
  // the app's only mode — there is no login wall and no server sync.
  const initLocalUser = useCallback(async () => {
    await seedGuestIfNeeded();
    setUser(LOCAL_USER);
  }, []);

  // Wipe all on-device data and reseed the defaults.
  const resetLocalData = useCallback(async () => {
    await clearGuestData();
    await initLocalUser();
  }, [initLocalUser]);

  React.useEffect(() => {
    (async () => {
      try {
        await initLocalUser();
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [initLocalUser]);

  const value = useMemo(
    () => ({
      user,
      bootstrapping,
      resetLocalData,
      setUser,
    }),
    [user, bootstrapping, resetLocalData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
