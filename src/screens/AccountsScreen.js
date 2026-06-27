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
import { Card, EmptyState, Banner, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRepo } from '../data/repo';
import { formatMoney } from '../utils/format';
import { colors, spacing, radius } from '../theme';

const TYPE_ICON = {
  CASH: 'cash',
  BANK: 'bank',
  CARD: 'credit-card-outline',
  WALLET: 'wallet-outline',
  SAVINGS: 'piggy-bank-outline',
  INVESTMENT: 'chart-line',
};

export default function AccountsScreen({ navigation }) {
  const { user } = useAuth();
  const { accountsApi } = useRepo();
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);
  const baseCurrency = user?.baseCurrency || 'INR';

  const load = useCallback(async () => {
    setError(null);
    try {
      setAccounts((await accountsApi.list()) || []);
    } catch (e) {
      setError(e.message || 'Could not load accounts.');
    }
  }, [accountsApi]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onArchive = (acc) => {
    accountsApi
      .archive(acc.id, !acc.archived)
      .then(load)
      .catch((e) => setError(e.message));
  };

  const onDelete = (acc) => {
    Alert.alert('Delete account', `Delete "${acc.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          accountsApi.remove(acc.id).then(load).catch((e) => setError(e.message)),
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <Card style={[styles.accCard, item.archived && styles.archived]}>
      <Pressable
        onPress={() => navigation.navigate('AccountForm', { account: item })}
        style={styles.accTop}
      >
        <MaterialCommunityIcons
          name={TYPE_ICON[item.type] || 'wallet'}
          size={26}
          color={colors.text}
          style={styles.accIcon}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.accName}>
            {item.name} {item.archived ? '· archived' : ''}
          </Text>
          <Text style={styles.accType}>{item.type} · {item.currency}</Text>
        </View>
        <Text style={styles.accBalance}>{formatMoney(item.balance, item.currency)}</Text>
      </Pressable>
      <View style={styles.accActions}>
        <Text style={styles.action} onPress={() => onArchive(item)}>
          {item.archived ? 'Unarchive' : 'Archive'}
        </Text>
        <Text style={[styles.action, { color: colors.danger }]} onPress={() => onDelete(item)}>
          Delete
        </Text>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <Button
          title="+ Add"
          variant="secondary"
          style={styles.addBtn}
          onPress={() => navigation.navigate('AccountForm')}
        />
      </View>
      <Banner message={error} />
      <FlatList
        data={accounts}
        keyExtractor={(a) => a.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={<MaterialCommunityIcons name="bank-outline" size={44} color={colors.textMuted} />}
            title="No accounts yet"
            subtitle="Add a cash wallet, bank, or card to get started."
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
  accCard: { marginBottom: spacing.md },
  archived: { opacity: 0.6 },
  accTop: { flexDirection: 'row', alignItems: 'center' },
  accIcon: { marginRight: spacing.md },
  accName: { fontSize: 16, fontWeight: '700', color: colors.text },
  accType: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  accBalance: { fontSize: 17, fontWeight: '800', color: colors.text },
  accActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { fontWeight: '700', color: colors.primary, marginLeft: spacing.lg },
});
