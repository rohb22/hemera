import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTasksStore } from '@/stores/tasksStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

interface ActionProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  accent?: boolean;
}

function Action({ label, icon, onPress, disabled, accent }: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        accent && styles.actionAccent,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={20} color={accent ? colors.surface : colors.ink} />
      <Text style={[styles.actionLabel, accent && styles.actionLabelAccent]}>{label}</Text>
    </Pressable>
  );
}

export default function TaskActionsSheet() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTasksStore((s) => s.tasks.find((t) => t.id === id));
  const scheduleTomorrow = useTasksStore((s) => s.scheduleTomorrow);
  const clearSchedule = useTasksStore((s) => s.clearSchedule);
  const completeTask = useTasksStore((s) => s.completeTask);
  const uncompleteTask = useTasksStore((s) => s.uncompleteTask);
  const showToast = useUiStore((s) => s.showToast);

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.missing}>This task is no longer available.</Text>
        <Action label="Close" icon="close" onPress={() => router.back()} />
      </View>
    );
  }

  const hasSchedule = task.scheduledDate !== null;
  const canTomorrow = task.startTime !== null;

  const onTomorrow = async () => {
    if (!canTomorrow) {
      router.replace({ pathname: '/sheet/task', params: { id: task.id } });
      return;
    }
    try {
      await scheduleTomorrow(task.id);
      router.back();
    } catch {
      // toast shown by the store
    }
  };

  const onPickDate = () => {
    router.replace({ pathname: '/sheet/task', params: { id: task.id } });
  };

  const onClear = async () => {
    try {
      await clearSchedule(task.id);
      router.back();
    } catch {
      // toast shown by the store
    }
  };

  const onComplete = async () => {
    try {
      await completeTask(task.id);
      router.back();
      showToast({
        message: 'Task completed',
        actionLabel: 'Undo',
        onAction: () => {
          void uncompleteTask(task.id);
        },
      });
    } catch {
      // toast shown by the store
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.taskTitle} numberOfLines={2}>
        {task.title}
      </Text>
      <Action label="Complete" icon="checkmark-circle-outline" accent onPress={onComplete} />
      <Action
        label={canTomorrow ? 'Tomorrow' : 'Schedule for tomorrow…'}
        icon="sunny-outline"
        onPress={onTomorrow}
      />
      <Action label="Pick date & time…" icon="calendar-outline" onPress={onPickDate} />
      <Action
        label="Clear schedule"
        icon="close-circle-outline"
        onPress={onClear}
        disabled={!hasSchedule}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.paper,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  taskTitle: { ...type.section, color: colors.ink, marginBottom: spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  actionAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  actionLabel: { ...type.body, color: colors.ink },
  actionLabelAccent: { color: colors.surface, fontWeight: '600' },
  missing: { ...type.body, color: colors.inkMuted },
});
