import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, EmptyState, Banner, Button, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRepo } from '../data/repo';
import { formatMoney, formatDate } from '../utils/format';
import { colors, spacing, radius } from '../theme';

const PERIOD_LABEL = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

export default function BudgetsScreen({ navigation }) {
  const { user } = useAuth();
  const { budgetsApi } = useRepo();
  const [budgets, setBudgets] = useState([]);
  const [error, setError] = useState(null);
  const [topUpId, setTopUpId] = useState(null); // budget whose inline top-up is open
  const [topUpAmount, setTopUpAmount] = useState('');
  const baseCurrency = user?.baseCurrency || 'INR';

  const load = useCallback(async () => {
    setError(null);
    try {
      setBudgets((await budgetsApi.list()) || []);
    } catch (e) {
      setError(e.message || 'Could not load budgets.');
    }
  }, [budgetsApi]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openTopUp = (b) => {
    setError(null);
    setTopUpAmount('');
    setTopUpId((cur) => (cur === b.id ? null : b.id));
  };

  const submitTopUp = (b) => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) {
      setError('Enter a top-up amount greater than 0.');
      return;
    }
    budgetsApi
      .topUp(b.id, amount)
      .then(() => {
        setTopUpId(null);
        setTopUpAmount('');
        return load();
      })
      .catch((e) => setError(e.message));
  };

  const onToggle = (b) => {
    budgetsApi
      .setActive(b.id, !b.active)
      .then(load)
      .catch((e) => setError(e.message));
  };

  const onDelete = (b) => {
    Alert.alert('Delete budget', `Delete the ${PERIOD_LABEL[b.periodType]} budget for "${b.accountName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          budgetsApi.remove(b.id).then(load).catch((e) => setError(e.message)),
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const p = item.currentPeriod;
    const allowance = p.limitAmount + p.carriedIn + p.topUp;
    const ratio = allowance > 0 ? Math.min(p.spent / allowance, 1) : 0;
    const over = p.available < 0;
    return (
      <Card style={[styles.card, !item.active && styles.inactive]}>
        <Pressable
          onPress={() => navigation.navigate('BudgetForm', { budget: item })}
          style={styles.top}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.accountName || 'Account'}</Text>
            <Text style={styles.sub}>
              {PERIOD_LABEL[item.periodType]} · {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
              {item.active ? '' : ' · paused'}
            </Text>
          </View>
          <Text style={[styles.available, over && styles.over]}>
            {formatMoney(p.available, baseCurrency)}
          </Text>
        </Pressable>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${ratio * 100}%`, backgroundColor: over ? colors.expense : colors.primary },
            ]}
          />
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            Spent {formatMoney(p.spent, baseCurrency)} of {formatMoney(allowance, baseCurrency)}
          </Text>
          {p.topUp > 0 ? (
            <Text style={styles.meta}>+{formatMoney(p.topUp, baseCurrency)} top-up</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Text style={styles.action} onPress={() => openTopUp(item)}>Top up</Text>
          <Text style={styles.action} onPress={() => onToggle(item)}>
            {item.active ? 'Pause' : 'Resume'}
          </Text>
          <Text style={[styles.action, { color: colors.danger }]} onPress={() => onDelete(item)}>
            Delete
          </Text>
        </View>

        {topUpId === item.id ? (
          <View style={styles.topUpRow}>
            <View style={{ flex: 1 }}>
              <Field
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                placeholder="Amount to add"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            <Button
              title="Add"
              style={styles.topUpBtn}
              onPress={() => submitTopUp(item)}
            />
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Budgets</Text>
        <Button
          title="+ Add"
          variant="secondary"
          style={styles.addBtn}
          onPress={() => navigation.navigate('BudgetForm')}
        />
      </View>
      <Banner message={error} />
      <FlatList
        data={budgets}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={<MaterialCommunityIcons name="chart-donut" size={44} color={colors.textMuted} />}
            title="No budgets yet"
            subtitle="Set a spending limit per account and period to track what's left."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  addBtn: { height: 40, paddingHorizontal: spacing.md },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  card: { marginBottom: spacing.md },
  inactive: { opacity: 0.6 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  available: { fontSize: 17, fontWeight: '800', color: colors.text },
  over: { color: colors.expense },
  barTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: radius.pill },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  meta: { fontSize: 12, color: colors.textMuted },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { fontWeight: '700', color: colors.primary, marginLeft: spacing.lg },
  topUpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  topUpBtn: { height: 50, paddingHorizontal: spacing.lg },
});
