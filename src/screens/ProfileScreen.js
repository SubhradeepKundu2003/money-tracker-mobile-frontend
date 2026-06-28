import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '../components/ui';
import CurrencyPicker from '../components/CurrencyPicker';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/endpoints';
import { API_URL } from '../config';
import { colors, spacing, radius } from '../theme';

export default function ProfileScreen({ navigation }) {
  const { user, isGuest, signOut, resetGuestData, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [changingCurrency, setChangingCurrency] = useState(false);

  const onChangeCurrencyPress = () => {
    if (isGuest) {
      Alert.alert(
        'Sign in to change currency',
        'Converting your balances uses live exchange rates on the server, so it needs a synced account.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => navigation.navigate('Login') },
        ],
      );
      return;
    }
    setPickerOpen(true);
  };

  const onSelectCurrency = (currency) => {
    setPickerOpen(false);
    if (!currency || currency.code === user?.baseCurrency) return;
    Alert.alert(
      `Convert everything to ${currency.code}?`,
      `All account balances, transactions, and budgets will be converted from ${user?.baseCurrency} to ${currency.name} (${currency.code}) at today's exchange rate.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: async () => {
            setChangingCurrency(true);
            try {
              const updated = await userApi.changeBaseCurrency(currency.code);
              setUser(updated);
              Alert.alert('Done', `Your money is now shown in ${currency.code}.`);
            } catch (e) {
              Alert.alert('Could not change currency', e?.message || 'Please try again.');
            } finally {
              setChangingCurrency(false);
            }
          },
        },
      ],
    );
  };

  const onDangerAction = async () => {
    const run = async (fn) => {
      setLoading(true);
      try {
        await fn();
      } finally {
        setLoading(false);
      }
    };
    if (isGuest) {
      Alert.alert(
        'Clear all data?',
        'This erases every account and transaction stored on this device. Sync first if you want to keep it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear', style: 'destructive', onPress: () => run(resetGuestData) },
        ],
      );
    } else {
      run(signOut);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <Card style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.displayName || 'User'}</Text>
          <Text style={styles.email}>{isGuest ? 'Guest mode' : user?.email}</Text>
        </Card>

        {isGuest && (
          <View style={styles.guestBox}>
            <Text style={styles.guestTitle}>You're using a guest account</Text>
            <Text style={styles.guestBody}>
              Everything you add is stored on this device only. Create an account
              or sign in to back it up to the cloud — your current data comes with
              you.
            </Text>
            <Button
              title="Sync & sign in"
              onPress={() => navigation.navigate('Login')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}

        <Card style={styles.card}>
          <Row
            label="Base currency"
            value={user?.baseCurrency || '—'}
            onPress={onChangeCurrencyPress}
            busy={changingCurrency}
          />
          <Row label="Role" value={user?.role || '—'} />
          <Row label="API endpoint" value={API_URL} last />
        </Card>

        <Button
          title={isGuest ? 'Clear all data' : 'Sign out'}
          variant="danger"
          onPress={onDangerAction}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>

      <CurrencyPicker
        visible={pickerOpen}
        currentCode={user?.baseCurrency}
        onClose={() => setPickerOpen(false)}
        onSelect={onSelectCurrency}
      />
    </SafeAreaView>
  );
}

function Row({ label, value, last, onPress, busy }) {
  const content = (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
        )}
        {onPress ? <Text style={styles.rowChevron}>›</Text> : null}
      </View>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => pressed && styles.rowPressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md, alignItems: 'stretch' },
  guestBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  guestTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  guestBody: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 20 },
  avatar: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  email: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.textMuted, fontWeight: '600' },
  rowRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginLeft: spacing.md },
  rowValue: { color: colors.text, fontWeight: '600', flexShrink: 1 },
  rowChevron: { color: colors.textMuted, fontSize: 22, marginLeft: spacing.sm, marginTop: -2 },
  rowPressed: { opacity: 0.6 },
});
