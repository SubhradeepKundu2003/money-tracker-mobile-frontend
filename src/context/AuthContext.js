import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  initActiveProfile,
  localProfiles,
  clearProfileData,
  seedProfileIfNeeded,
} from '../data/localStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileIdState] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Loads the profile list (migrating any pre-multi-profile data into a
  // default profile the first time) and activates one. This is the app's
  // only mode — there is no login wall and no server sync.
  const init = useCallback(async () => {
    const result = await initActiveProfile();
    setProfiles(result.profiles);
    setActiveProfileIdState(result.activeProfileId);
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        await init();
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [init]);

  const switchProfile = useCallback(async (id) => {
    await localProfiles.switchTo(id);
    setActiveProfileIdState(id);
  }, []);

  const createProfile = useCallback(
    async (name) => {
      const profile = await localProfiles.create(name);
      setProfiles((prev) => [...prev, profile]);
      await switchProfile(profile.id);
      return profile;
    },
    [switchProfile],
  );

  const renameProfile = useCallback(async (id, name) => {
    const updated = await localProfiles.rename(id, name);
    setProfiles((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const removeProfile = useCallback(
    async (id) => {
      const remaining = await localProfiles.remove(id);
      setProfiles(remaining);
      if (id === activeProfileId) {
        await switchProfile(remaining[0].id);
      }
    },
    [activeProfileId, switchProfile],
  );

  // Wipe the active profile's data and reseed its defaults — other profiles
  // on this device are untouched.
  const resetLocalData = useCallback(async () => {
    await clearProfileData();
    await seedProfileIfNeeded();
  }, []);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || null,
    [profiles, activeProfileId],
  );

  // Kept for screens that only care about "the current user" — mirrors the
  // active profile so ProfileScreen etc. don't need to change shape.
  const user = useMemo(
    () =>
      activeProfile
        ? { id: activeProfile.id, displayName: activeProfile.name, baseCurrency: 'INR' }
        : null,
    [activeProfile],
  );

  const value = useMemo(
    () => ({
      user,
      profiles,
      activeProfile,
      activeProfileId,
      bootstrapping,
      switchProfile,
      createProfile,
      renameProfile,
      removeProfile,
      resetLocalData,
    }),
    [
      user,
      profiles,
      activeProfile,
      activeProfileId,
      bootstrapping,
      switchProfile,
      createProfile,
      renameProfile,
      removeProfile,
      resetLocalData,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
