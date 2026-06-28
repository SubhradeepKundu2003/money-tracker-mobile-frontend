import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Field, Banner, KeyboardAwareScrollView } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { signIn, continueAsGuest, isGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // When opened as a sync modal (guest flow), dismiss back to the app.
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      setError(e.message || 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  };

  const onGuest = async () => {
    setGuestLoading(true);
    try {
      await continueAsGuest();
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
            <MaterialCommunityIcons
              name="wallet"
              size={56}
              color={colors.primary}
              style={styles.logo}
            />
            <Text style={styles.title}>Money Tracker</Text>
            <Text style={styles.subtitle}>
              {isGuest
                ? 'Sign in to sync your guest data to the cloud.'
                : 'Welcome back. Sign in to continue.'}
            </Text>
          </View>

          <Banner message={error} />

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@mail.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          <Button title="Sign in" onPress={onSubmit} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Text
              style={styles.link}
              onPress={() => navigation.navigate('Register')}
            >
              Create one
            </Text>
          </View>

          {!isGuest && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>
              <Button
                title="Continue as guest"
                variant="secondary"
                onPress={onGuest}
                loading={guestLoading}
              />
              <Text style={styles.guestHint}>
                Your data stays on this device. Sign in later to back it up.
              </Text>
            </>
          )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.xl, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { marginBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: spacing.md, color: colors.textMuted, fontWeight: '600' },
  guestHint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
