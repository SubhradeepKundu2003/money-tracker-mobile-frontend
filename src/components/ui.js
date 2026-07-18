import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderHeightContext } from '@react-navigation/elements';
import { colors, radius, spacing, shadow } from '../theme';

// Scrollable screen body that keeps focused text inputs clear of the software
// keyboard. On iOS we pad the view by the keyboard height, offset by the
// navigation header so the avoidance lines up under modal/stack headers. On
// Android the OS handles this via `softwareKeyboardLayoutMode: "pan"` (set in
// app.json) — which is needed because edge-to-edge windows don't auto-resize —
// so KeyboardAvoidingView is a no-op there.
export function KeyboardAwareScrollView({ children, contentContainerStyle, edges }) {
  // Defaults to 0 when the screen has no header (e.g. auth screens).
  const headerHeight = React.useContext(HeaderHeightContext) ?? 0;
  return (
    <SafeAreaView style={styles.kasSafe} edges={edges}>
      <KeyboardAvoidingView
        style={styles.kasFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'danger' && styles.btnDanger,
        variant === 'ghost' && styles.btnGhost,
        isDisabled && styles.btnDisabled,
        pressed && !isDisabled && styles.btnPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.primary : '#fff'} />
      ) : (
        <Text
          style={[
            styles.btnText,
            (variant === 'secondary' || variant === 'ghost') && styles.btnTextDark,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...props }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && styles.inputError]}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({ label, active, onPress, color }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        active && { backgroundColor: color || colors.primary, borderColor: color || colors.primary },
      ]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function IconChip({ icon, size = 40 }) {
  return (
    <View style={[styles.iconChip, { width: size, height: size, borderRadius: size / 2 }]}>
      {icon}
    </View>
  );
}

export function SegmentedControl({ options, value, onChange }) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value ?? 'all'}
            onPress={() => onChange(opt.value)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Banner({ message, type = 'error' }) {
  if (!message) return null;
  return (
    <View
      style={[
        styles.banner,
        type === 'error' ? styles.bannerError : styles.bannerSuccess,
      ]}
    >
      <Text style={[styles.bannerText, type === 'success' && { color: colors.success }]}>
        {message}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={styles.empty}>
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kasSafe: { flex: 1, backgroundColor: colors.background },
  kasFlex: { flex: 1 },

  btn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.primaryLight },
  btnDanger: { backgroundColor: colors.danger },
  btnGhost: { backgroundColor: 'transparent' },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnTextDark: { color: colors.primaryDark },

  field: { marginBottom: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 50,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow,
  },

  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#fff' },

  iconChip: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segment: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  segmentTextActive: { color: '#fff' },

  banner: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerError: { backgroundColor: '#F2F2F2', borderWidth: 1, borderColor: '#D4D4D4' },
  bannerSuccess: { backgroundColor: '#F2F2F2', borderWidth: 1, borderColor: '#D4D4D4' },
  bannerText: { color: colors.text, fontSize: 14 },

  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { marginBottom: spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
