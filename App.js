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

  return (
    <>
      <RootNavigator />
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
