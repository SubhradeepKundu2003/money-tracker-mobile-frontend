import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { exportBackup, importBackup } from '../data/backup';
import { colors, spacing, radius } from '../theme';

export default function ProfileScreen() {
  const { user, resetLocalData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert('Could not export data', e?.message || 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      const payload = await importBackup();
      if (!payload) return; // user canceled the file picker
      Alert.alert(
        'Import complete',
        `Imported ${payload.accounts.length} accounts, ${payload.transactions.length} transactions, and ${payload.budgets.length} budgets.`,
      );
    } catch (e) {
      Alert.alert('Could not import data', e?.message || 'Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const onImport = () => {
    Alert.alert(
      'Import backup?',
      'This replaces every account, transaction, and budget currently on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', style: 'destructive', onPress: runImport },
      ],
    );
  };

  const onClearData = () => {
    Alert.alert(
      'Clear all data?',
      'This erases every account, transaction, and budget stored on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await resetLocalData();
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <Card style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.displayName || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.displayName || 'You'}</Text>
          <Text style={styles.email}>All data is stored on this device.</Text>
        </Card>

        <Card style={styles.card}>
          <Row label="Base currency" value={user?.baseCurrency || '—'} last />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Backup</Text>
          <Button
            title="Export data"
            variant="secondary"
            onPress={onExport}
            loading={exporting}
          />
          <Button
            title="Import data"
            variant="secondary"
            onPress={onImport}
            loading={importing}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        <Button
          title="Clear all data"
          variant="danger"
          onPress={onClearData}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md, alignItems: 'stretch' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm },
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
  rowValue: { color: colors.text, fontWeight: '600', flexShrink: 1, marginLeft: spacing.md },
});
