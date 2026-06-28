import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Field, Banner, Pill, EmptyState, KeyboardAwareScrollView } from '../components/ui';
import { DateField } from '../components/DateField';
import { useRepo } from '../data/repo';
import { todayIso } from '../utils/format';
import { colors, spacing } from '../theme';

export default function TransactionFormScreen({ navigation, route }) {
  const { accountsApi, categoriesApi, transactionsApi } = useRepo();
  const editing = route.params?.transaction;
  const [type, setType] = useState(editing?.type || 'EXPENSE');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [occurredOn, setOccurredOn] = useState(editing?.occurredOn || todayIso());
  const [note, setNote] = useState(editing?.note || '');
  const [accountId, setAccountId] = useState(editing?.accountId || null);
  const [categoryId, setCategoryId] = useState(editing?.categoryId || null);

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [accs, cats] = await Promise.all([
          accountsApi.list(),
          categoriesApi.list(),
        ]);
        const active = (accs || []).filter((a) => !a.archived);
        setAccounts(active);
        setCategories(cats || []);
        if (!accountId && active.length) setAccountId(active[0].id);
      } catch (e) {
        setError(e.message || 'Could not load accounts and categories.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleCategories = categories.filter((c) => c.type === type);

  const onSubmit = async () => {
    setError(null);
    const numAmount = Number(amount);
    if (!accountId) {
      setError('Pick an account.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      setError('Date must be in YYYY-MM-DD format.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        accountId,
        categoryId: categoryId || null,
        type,
        amount: numAmount,
        occurredOn,
        note: note.trim() || null,
      };
      if (editing) {
        await transactionsApi.update(editing.id, payload);
      } else {
        await transactionsApi.create(payload);
      }
      navigation.goBack();
    } catch (e) {
      setError(e.message || 'Could not save the transaction.');
    } finally {
      setLoading(false);
    }
  };

  if (accounts.length === 0 && !error) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          icon={<MaterialCommunityIcons name="bank-outline" size={44} color={colors.textMuted} />}
          title="No accounts yet"
          subtitle="Create an account first, then add transactions to it."
        />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAwareScrollView edges={['bottom']} contentContainerStyle={styles.container}>
      <Banner message={error} />

          <View style={styles.typeRow}>
            <Pill
              label="Expense"
              active={type === 'EXPENSE'}
              color={colors.expense}
              onPress={() => { setType('EXPENSE'); setCategoryId(null); }}
            />
            <Pill
              label="Income"
              active={type === 'INCOME'}
              color={colors.income}
              onPress={() => { setType('INCOME'); setCategoryId(null); }}
            />
          </View>

          <Field
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Account</Text>
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

          <Text style={styles.label}>Category</Text>
          {visibleCategories.length === 0 ? (
            <Text style={styles.hint}>No {type.toLowerCase()} categories.</Text>
          ) : (
            <View style={styles.pillRow}>
              <Pill label="None" active={!categoryId} onPress={() => setCategoryId(null)} />
              {visibleCategories.map((c) => (
                <Pill
                  key={c.id}
                  label={c.name}
                  active={categoryId === c.id}
                  color={c.color}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </View>
          )}

          <DateField
            label="Date"
            value={occurredOn}
            onChange={setOccurredOn}
          />

          <Field
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Lunch"
            maxLength={255}
          />

          <Button
            title={editing ? 'Save changes' : 'Add transaction'}
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
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
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
  hint: { color: colors.textMuted, marginBottom: spacing.md },
});
