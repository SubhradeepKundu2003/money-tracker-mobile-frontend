import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import AnimatedSplash from './src/components/AnimatedSplash';

// Keep the native splash visible while we restore the session. Configured via the
// expo-splash-screen plugin in app.json. Called at module scope per SDK 56 docs.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 400, fade: true });

function Gate() {
  const { bootstrapping } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  // Once the session check finishes, hand off from the native splash to our
  // branded animated splash, which then fades out.
  useEffect(() => {
    if (!bootstrapping) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [bootstrapping]);

  const onSplashFinish = useCallback(() => setSplashDone(true), []);

  // Wait for the active profile to be resolved before mounting the navigator —
  // screens fetch profile-scoped data as soon as they mount, and doing that
  // before a profile is active would read/write the wrong namespace. The
  // splash overlay covers this whole window anyway, so nothing is skipped
  // visually.
  return (
    <>
      {!bootstrapping && <RootNavigator />}
      {!splashDone && (
        <AnimatedSplash visible={!bootstrapping} onFinish={onSplashFinish} />
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
