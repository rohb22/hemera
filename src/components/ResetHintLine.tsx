import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing, type } from '@/theme/tokens';

/**
 * The quiet line on Today that opens the Reset My Day review (v1.2,
 * D21/FR-X1).
 *
 * It states how much is still waiting and nothing else — no totals, no
 * percentages, no commentary on yesterday. It appears only when
 * something was carried over, and it disappears as soon as nothing is.
 */

interface ResetHintLineProps {
  count: number;
  onPress: () => void;
}

export function resetHintText(count: number): string {
  return count === 1 ? '1 task is still waiting.' : `${count} tasks are still waiting.`;
}

export function resetHintAccessibilityLabel(count: number): string {
  return `Review ${count} ${count === 1 ? 'task' : 'tasks'} that ${
    count === 1 ? 'is' : 'are'
  } still waiting`;
}

export function ResetHintLine({ count, onPress }: ResetHintLineProps) {
  if (count <= 0) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resetHintAccessibilityLabel(count)}
      onPress={onPress}
      style={({ pressed }) => [styles.hint, pressed && styles.pressed]}
    >
      <Text style={styles.text}>{resetHintText(count)}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  text: { ...type.caption, color: colors.inkMuted, flex: 1 },
  pressed: { opacity: 0.85 },
});
