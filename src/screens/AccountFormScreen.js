import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Banner, Pill } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRepo } from '../data/repo';
import { colors, spacing } from '../theme';

const TYPES = ['CASH', 'BANK', 'CARD', 'WALLET', 'SAVINGS', 'INVESTMENT'];

export default function AccountFormScreen({ navigation, route }) {
  const { user } = useAuth();
  const { accountsApi } = useRepo();
  const editing = route.params?.account;
  const [name, setName] = useState(editing?.name || '');
  const [type, setType] = useState(editing?.type || 'CASH');
  const [currency, setCurrency] = useState(
    editing?.currency || user?.baseCurrency || 'INR',
  );
  const [openingBalance, setOpeningBalance] = useState(
    editing ? '' : '0',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Account name is required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        currency: currency.trim().toUpperCase(),
      };
      if (editing) {
        await accountsApi.update(editing.id, payload);
      } else {
        await accountsApi.create({
          ...payload,
          openingBalance: Number(openingBalance) || 0,
        });
      }
      navigation.goBack();
    } catch (e) {
      setError(e.message || 'Could not save the account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Banner message={error} />

          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Cash Wallet"
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.pillRow}>
            {TYPES.map((t) => (
              <Pill key={t} label={t} active={type === t} onPress={() => setType(t)} />
            ))}
          </View>

          <Field
            label="Currency (ISO code)"
            value={currency}
            onChangeText={setCurrency}
            placeholder="INR"
            autoCapitalize="characters"
            maxLength={3}
          />

          {!editing && (
            <Field
              label="Opening balance"
              value={openingBalance}
              onChangeText={setOpeningBalance}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          )}

          <Button
            title={editing ? 'Save changes' : 'Create account'}
            onPress={onSubmit}
            loading={loading}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
