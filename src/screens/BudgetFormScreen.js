import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Field, Banner, Pill, EmptyState, KeyboardAwareScrollView } from '../components/ui';
import { useRepo } from '../data/repo';
import { colors, spacing } from '../theme';

const PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

export default function BudgetFormScreen({ navigation, route }) {
  const { accountsApi, budgetsApi } = useRepo();
  const editing = route.params?.budget;
  // Account and period type are structural on the backend — only the limit is
  // editable once a budget exists.
  const [accountId, setAccountId] = useState(editing?.accountId || null);
  const [periodType, setPeriodType] = useState(editing?.periodType || 'MONTHLY');
  const [limitAmount, setLimitAmount] = useState(
    editing ? String(editing.limitAmount) : '',
  );
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const accs = (await accountsApi.list()) || [];
        const active = accs.filter((a) => !a.archived);
        setAccounts(active);
        if (!accountId && active.length) setAccountId(active[0].id);
      } catch (e) {
        setError(e.message || 'Could not load accounts.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async () => {
    setError(null);
    const limit = Number(limitAmount);
    if (!accountId) {
      setError('Pick an account.');
      return;
    }
    if (!limit || limit <= 0) {
      setError('Enter a limit greater than 0.');
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        // The backend only changes the limit on update, but still validates
        // accountId/periodType as required, so send the budget's existing values.
        await budgetsApi.update(editing.id, {
          accountId: editing.accountId,
          periodType: editing.periodType,
          limitAmount: limit,
        });
      } else {
        await budgetsApi.create({ accountId, periodType, limitAmount: limit });
      }
      navigation.goBack();
    } catch (e) {
      setError(e.message || 'Could not save the budget.');
    } finally {
      setLoading(false);
    }
  };

  if (!editing && accounts.length === 0 && !error) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          icon={<MaterialCommunityIcons name="bank-outline" size={44} color={colors.textMuted} />}
          title="No accounts yet"
          subtitle="Create an account first, then set a budget for it."
        />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAwareScrollView edges={['bottom']} contentContainerStyle={styles.container}>
      <Banner message={error} />

          <Text style={styles.label}>Account</Text>
          {editing ? (
            <Text style={styles.fixed}>{editing.accountName}</Text>
          ) : (
            <View style={styles.pillRow}>
              {accounts.map((a) => (
                <Pill
                  key={a.id}
                  label={a.name}
                  active={accountId === a.id}
                  onPress={() => setAccountId(a.id)}
                />
              ))}
            </View>
          )}

          <Text style={styles.label}>Period</Text>
          {editing ? (
            <Text style={styles.fixed}>{periodType}</Text>
          ) : (
            <View style={styles.pillRow}>
              {PERIODS.map((p) => (
                <Pill
                  key={p}
                  label={p}
                  active={periodType === p}
                  onPress={() => setPeriodType(p)}
                />
              ))}
            </View>
          )}

          <Field
            label="Limit per period"
            value={limitAmount}
            onChangeText={setLimitAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Button
            title={editing ? 'Save changes' : 'Create budget'}
            onPress={onSubmit}
            loading={loading}
            style={{ marginTop: spacing.md }}
          />
    </KeyboardAwareScrollView>
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
  fixed: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
