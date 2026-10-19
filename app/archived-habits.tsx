import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import type { Habit } from '@/domain/types';
import { useHabitsStore } from '@/stores/habitsStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

export default function ArchivedHabitsScreen() {
  const archived = useHabitsStore((s) => s.archived);
  const archivedError = useHabitsStore((s) => s.archivedError);
  const loadArchived = useHabitsStore((s) => s.loadArchived);
  const restoreHabit = useHabitsStore((s) => s.restoreHabit);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => {
    void loadArchived();
  }, [loadArchived]);

  const onRestore = async (id: string) => {
    try {
      await restoreHabit(id);
      showToast({ message: 'Habit restored' });
    } catch {
      // toast shown by the store
    }
  };

  if (archivedError) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Couldn’t load archived habits</Text>
          <Text style={styles.emptyHint}>They’re still safe on this device.</Text>
          <Button label="Try again" variant="secondary" onPress={() => void loadArchived()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <FlatList<Habit>
        data={archived}
        keyExtractor={(habit) => habit.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Restore ${item.name}`}
              onPress={() => void onRestore(item.id)}
              style={({ pressed }) => [styles.restore, pressed && styles.pressed]}
            >
              <Text style={styles.restoreText}>Restore</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyHint}>Nothing archived.</Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    paddingVertical: spacing.sm,
  },
  name: { ...type.body, color: colors.ink, flex: 1 },
  restore: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  restoreText: { ...type.button, color: colors.accent },
  pressed: { opacity: 0.85 },
  empty: { paddingTop: spacing.xxl, gap: spacing.lg, alignItems: 'flex-start' },
  emptyTitle: { ...type.title, color: colors.ink },
  emptyHint: { ...type.body, color: colors.inkMuted },
  listContent: { paddingVertical: spacing.md, paddingBottom: spacing.huge },
});
