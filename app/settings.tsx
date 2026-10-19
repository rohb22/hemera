import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import type { WeekStartsOn } from '@/domain/habits';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

const WEEK_START_OPTIONS: { label: string; value: WeekStartsOn }[] = [
  { label: 'Monday', value: 1 },
  { label: 'Sunday', value: 0 },
];

export default function SettingsScreen() {
  const router = useRouter();
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const setWeekStartsOn = useSettingsStore((s) => s.setWeekStartsOn);

  const onPickWeekStart = async (value: WeekStartsOn) => {
    if (value === weekStartsOn) return;
    try {
      await setWeekStartsOn(value);
    } catch {
      // toast shown by the store
    }
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          <Text style={styles.overline}>Week starts on</Text>
          <View style={styles.card}>
            {WEEK_START_OPTIONS.map((option, index) => {
              const selected = weekStartsOn === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Week starts on ${option.label}`}
                  onPress={() => void onPickWeekStart(option.value)}
                  style={[styles.row, index > 0 && styles.rowDivider]}
                >
                  <Text style={styles.rowLabel}>{option.label}</Text>
                  {selected && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Affects habit weeks and the date picker.</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.overline}>Habits</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Archived habits"
              onPress={() => router.push('/archived-habits')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.rowLabel}>Archived habits</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
            </Pressable>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.overline}>Data</Text>
          <View style={styles.card}>
            <View
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Export, coming later"
              style={styles.row}
            >
              <View style={styles.rowLabelFlex}>
                <Text style={[styles.rowLabel, styles.mutedLabel]}>Export</Text>
                <Text style={styles.rowCaption}>Coming later — nothing leaves your device.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.overline}>About</Text>
          <Text style={styles.aboutName}>Hemera</Text>
          <Text style={styles.hint}>
            Your day, one at a time. All data stays on this device.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.lg, paddingBottom: spacing.huge, gap: spacing.xxl },
  group: { gap: spacing.sm },
  overline: { ...type.overline, color: colors.inkMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  rowLabel: { ...type.body, color: colors.ink },
  rowLabelFlex: { flex: 1 },
  mutedLabel: { color: colors.inkMuted },
  rowCaption: { ...type.caption, color: colors.inkFaint },
  pressed: { opacity: 0.85 },
  hint: { ...type.caption, color: colors.inkMuted },
  aboutName: { ...type.title, color: colors.ink },
});
