import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/PrimaryButton';
import { ResetTaskRow } from '@/components/ResetTaskRow';
import { Screen } from '@/components/Screen';
import { todayKey } from '@/domain/calendar';
import {
  groupResetCandidates,
  planReset,
  resetCandidates,
  type ResetChoice,
} from '@/domain/reset';
import { taskCaption } from '@/domain/taskLabels';
import { useResetStore } from '@/stores/resetStore';
import { useTasksStore } from '@/stores/tasksStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, spacing, type } from '@/theme/tokens';

/**
 * Reset My Day (v1.2).
 *
 * A review of everything that was carried over from earlier days. Each
 * row starts on "Keep time" (D23) and can be moved to the pool, given
 * a new time, or dismissed. Confirming applies every row in one
 * transaction and offers a single Undo (D26, FR-X4).
 */
export default function ResetScreen() {
  const router = useRouter();
  const now = useUiStore((s) => s.now);
  const status = useTasksStore((s) => s.status);
  const tasks = useTasksStore((s) => s.tasks);
  const apply = useResetStore((s) => s.apply);
  const undo = useResetStore((s) => s.undo);
  const showToast = useUiStore((s) => s.showToast);

  const [choices, setChoices] = useState<Record<string, ResetChoice>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'idle') void useTasksStore.getState().load();
  }, [status]);

  const candidates = useMemo(() => resetCandidates(tasks, now), [tasks, now]);
  const groups = useMemo(() => groupResetCandidates(candidates), [candidates]);

  const onChoose = (taskId: string, choice: ResetChoice) => {
    setChoices((current) => ({ ...current, [taskId]: choice }));
  };

  const onConfirm = async () => {
    const today = todayKey(now);
    const entries = planReset(candidates, choices, today);

    setSaving(true);
    const outcome = await apply(entries, today);
    setSaving(false);
    if (!outcome) return; // the store reported the failure

    if (outcome.changed === 0) {
      showToast({ message: 'Nothing changed.' });
      router.back();
      return;
    }

    showToast({
      message:
        outcome.changed === 1 ? '1 task updated' : `${outcome.changed} tasks updated`,
      actionLabel: 'Undo',
      onAction: () => {
        void undo(outcome.resetId);
      },
    });
    router.back();
  };

  if (status === 'ready' && candidates.length === 0) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing is waiting.</Text>
          <Text style={styles.emptyHint}>
            Every task that was scheduled has been dealt with.
          </Text>
          <Button label="Close" variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Choose where each task should land today.
        </Text>

        {groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.candidates.map(({ task }) => (
              <ResetTaskRow
                key={task.id}
                task={task}
                caption={taskCaption(task, now)}
                choice={choices[task.id] ?? { action: 'keep' }}
                onChoose={onChoose}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Confirm"
          onPress={() => void onConfirm()}
          disabled={saving || candidates.length === 0}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  intro: { ...type.body, color: colors.inkMuted, paddingBottom: spacing.lg },
  group: { marginBottom: spacing.lg },
  groupTitle: { ...type.overline, color: colors.inkMuted, paddingBottom: spacing.sm },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    backgroundColor: colors.paper,
  },
  empty: {
    paddingTop: spacing.xxl,
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  emptyTitle: { ...type.title, color: colors.ink },
  emptyHint: { ...type.body, color: colors.inkMuted },
});
