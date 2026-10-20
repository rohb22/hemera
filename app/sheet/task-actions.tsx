import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTasksStore } from '@/stores/tasksStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

interface ActionProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  accent?: boolean;
  destructive?: boolean;
}

function Action({ label, icon, onPress, disabled, accent, destructive }: ActionProps) {
  const tint = accent ? colors.surface : destructive ? colors.danger : colors.ink;
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
      <Ionicons name={icon} size={20} color={tint} />
      <Text style={[styles.actionLabel, { color: tint }, accent && styles.actionLabelAccent]}>
        {label}
      </Text>
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
  const removeTask = useTasksStore((s) => s.removeTask);
  const showToast = useUiStore((s) => s.showToast);

  if (!task) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.missing}>This task is no longer available.</Text>
          <Action label="Close" icon="close" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
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

  const onDelete = () => {
    Alert.alert('Delete this task?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await removeTask(task.id);
              router.back();
            } catch {
              // toast shown by the store
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
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
        <View style={styles.deleteWrap}>
          <Action label="Delete task…" icon="trash-outline" destructive onPress={onDelete} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
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
  deleteWrap: { marginTop: spacing.md },
  missing: { ...type.body, color: colors.inkMuted },
});
