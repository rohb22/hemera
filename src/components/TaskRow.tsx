import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SwipeRow } from '@/components/SwipeRow';
import { colors, radii, spacing, type } from '@/theme/tokens';
import type { Task } from '@/domain/types';

export type TaskRowVariant = 'plain' | 'reschedule' | 'attention' | 'later';

interface TaskRowProps {
  task: Task;
  variant?: TaskRowVariant;
  caption?: string | null;
  onToggle: (task: Task) => void;
  onPress: (task: Task) => void;
  onOpenActions?: (task: Task) => void;
  swipe?: boolean;
}

export function TaskRow({
  task,
  variant = 'plain',
  caption,
  onToggle,
  onPress,
  onOpenActions,
  swipe = true,
}: TaskRowProps) {
  const row = (
    <View style={[styles.row, variant === 'later' && styles.laterRow]}>
      {variant === 'attention' && <View style={styles.attentionBar} />}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: false }}
        accessibilityLabel={`Complete ${task.title}`}
        hitSlop={spacing.sm}
        onPress={() => onToggle(task)}
        style={styles.checkTarget}
      >
        {({ pressed }) => <View style={[styles.ring, pressed && styles.ringPressed]} />}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${task.title}`}
        onPress={() => onPress(task)}
        style={styles.body}
      >
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        {caption ? (
          <Text style={[styles.caption, variant === 'attention' && styles.attentionCaption]} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </Pressable>
      {onOpenActions && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Actions for ${task.title}`}
          hitSlop={spacing.sm}
          onPress={() => onOpenActions(task)}
          style={styles.overflow}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.inkMuted} />
        </Pressable>
      )}
    </View>
  );

  if (!swipe) return row;

  return (
    <SwipeRow
      onComplete={() => onToggle(task)}
      onOpenActions={onOpenActions ? () => onOpenActions(task) : undefined}
    >
      {row}
    </SwipeRow>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    backgroundColor: 'transparent',
  },
  laterRow: { backgroundColor: colors.surfaceMuted, opacity: 0.6, borderRadius: radii.sm },
  attentionBar: {
    position: 'absolute',
    left: 0,
    top: spacing.sm,
    bottom: spacing.sm,
    width: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.attention,
  },
  checkTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  ring: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.inkFaint,
  },
  ringPressed: { borderColor: colors.accent },
  body: { flex: 1, paddingVertical: spacing.xs, gap: 2 },
  title: { ...type.body, color: colors.ink },
  caption: { ...type.caption, color: colors.inkMuted },
  attentionCaption: { color: colors.attention },
  overflow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
