import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '@/theme/tokens';
import type { Task } from '@/domain/types';

interface TaskRowProps {
  task: Task;
  onToggle: (task: Task) => void;
}

export function TaskRow({ task, onToggle }: TaskRowProps) {
  return (
    <View style={styles.row}>
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
      <Text style={styles.title} numberOfLines={2}>
        {task.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  checkTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.inkFaint,
  },
  ringPressed: { borderColor: colors.accent },
  title: { ...type.body, color: colors.ink, flex: 1 },
});
