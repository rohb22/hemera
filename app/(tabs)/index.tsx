import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { Fab } from '@/components/Fab';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { NowMarker, TimelineRow } from '@/components/TimelineRow';
import { TaskRow, type TaskRowVariant } from '@/components/TaskRow';
import { formatTodayHeading, todayKey } from '@/domain/calendar';
import { groupPool, taskCaption, timelineTasks } from '@/domain/taskLabels';
import { clusterMarkerIndex, clusterTimeline, type TimelineCluster } from '@/domain/timeline';
import type { Task } from '@/domain/types';
import { useTasksStore } from '@/stores/tasksStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, spacing, type } from '@/theme/tokens';

type TimelineItem =
  | { kind: 'cluster'; key: string; cluster: TimelineCluster }
  | { kind: 'now'; key: string }
  | { kind: 'emptyTimeline'; key: string };

type PoolItem =
  | { kind: 'task'; key: string; task: Task; variant: TaskRowVariant; caption: string | null }
  | { kind: 'emptyPool'; key: string };

type ListItem = TimelineItem | PoolItem;

interface TodaySection {
  key: string;
  title: string | null;
  data: ListItem[];
}

const sectionTitleFor: Record<string, string> = {
  reschedule: 'Needs rescheduling',
  attention: 'Due today / overdue',
  pool: 'Unscheduled',
  later: 'Later',
};

export default function TodayScreen() {
  const router = useRouter();
  const now = useUiStore((s) => s.now);
  const refreshNow = useUiStore((s) => s.refreshNow);
  const showToast = useUiStore((s) => s.showToast);
  const tasks = useTasksStore((s) => s.tasks);
  const status = useTasksStore((s) => s.status);
  const load = useTasksStore((s) => s.load);
  const completeTask = useTasksStore((s) => s.completeTask);
  const uncompleteTask = useTasksStore((s) => s.uncompleteTask);

  const listRef = useRef<SectionList<ListItem, TodaySection>>(null);
  const markerIndexRef = useRef(0);
  const didAutoScroll = useRef(false);
  const [laterOpen, setLaterOpen] = useState(false);

  useEffect(() => {
    refreshNow();
    load();
  }, [load, refreshNow]);

  const today = todayKey(now);
  const timeline = useMemo(() => timelineTasks(tasks, today), [tasks, today]);
  const pools = useMemo(() => groupPool(tasks, now), [tasks, now]);
  const clusters = useMemo(() => clusterTimeline(timeline), [timeline]);

  const timelineItems = useMemo(() => {
    const items: ListItem[] = [];
    if (clusters.length > 0) {
      const markerIndex = clusterMarkerIndex(clusters, now);
      for (const [index, cluster] of clusters.entries()) {
        if (index === markerIndex) items.push({ kind: 'now', key: 'now' });
        items.push({ kind: 'cluster', key: `cluster-${cluster.tasksPerLane[0]?.[0]?.id}`, cluster });
      }
      if (markerIndex >= clusters.length) items.push({ kind: 'now', key: 'now' });
    } else {
      items.push({ kind: 'emptyTimeline', key: 'empty-timeline' });
    }
    return items;
  }, [clusters, now]);

  const sections = useMemo<TodaySection[]>(() => {
    const build = (key: string, variant: TaskRowVariant, list: Task[]): ListItem[] =>
      list.map((task) => ({
        kind: 'task',
        key: task.id,
        task,
        variant,
        caption: taskCaption(task, now),
      }));

    const result: TodaySection[] = [
      { key: 'timeline', title: null, data: timelineItems },
    ];
    if (pools.reschedule.length)
      result.push({ key: 'reschedule', title: sectionTitleFor.reschedule, data: build('reschedule', 'reschedule', pools.reschedule) });
    if (pools.attention.length)
      result.push({ key: 'attention', title: sectionTitleFor.attention, data: build('attention', 'attention', pools.attention) });
    if (pools.pool.length)
      result.push({ key: 'pool', title: sectionTitleFor.pool, data: build('pool', 'plain', pools.pool) });
    if (pools.later.length)
      result.push({ key: 'later', title: sectionTitleFor.later, data: laterOpen ? build('later', 'later', pools.later) : [] });
    if (!pools.reschedule.length && !pools.attention.length && !pools.pool.length && !pools.later.length) {
      result.push({ key: 'empty-pool', title: null, data: [{ kind: 'emptyPool', key: 'empty-pool' }] });
    }
    return result;
  }, [pools, timelineItems, now, laterOpen]);

  useEffect(() => {
    if (status !== 'ready' || didAutoScroll.current) return;
    const markerIndex = timelineItems.findIndex((item) => item.kind === 'now');
    if (markerIndex < 0) return;
    didAutoScroll.current = true;
    markerIndexRef.current = markerIndex;
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: markerIndex,
        animated: true,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [status, timelineItems]);

  const onComplete = async (task: Task) => {
    try {
      await completeTask(task.id);
    } catch {
      return;
    }
    showToast({
      message: 'Task completed',
      actionLabel: 'Undo',
      onAction: () => {
        void uncompleteTask(task.id);
      },
    });
  };

  const onOpenTask = (task: Task) => {
    router.push({ pathname: '/sheet/task', params: { id: task.id } });
  };

  const onOpenActions = (task: Task) => {
    router.push({ pathname: '/sheet/task-actions', params: { id: task.id } });
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.kind) {
      case 'cluster':
        return <TimelineRow cluster={item.cluster} now={now} onPress={onOpenTask} onComplete={onComplete} />;
      case 'now':
        return <NowMarker now={now} />;
      case 'emptyTimeline':
        return <Text style={styles.softEmpty}>Nothing scheduled</Text>;
      case 'emptyPool':
        return <Text style={styles.softEmpty}>All clear for today</Text>;
      default:
        return (
          <TaskRow
            task={item.task}
            variant={item.variant}
            caption={item.caption}
            onToggle={onComplete}
            onPress={onOpenTask}
            onOpenActions={onOpenActions}
          />
        );
    }
  };

  const renderSectionHeader = ({ section }: { section: TodaySection }) => {
    if (!section.title) return null;
    if (section.key === 'later') {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: laterOpen }}
          onPress={() => setLaterOpen((open) => !open)}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitleText}>{section.title}</Text>
          <Ionicons
            name={laterOpen ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={colors.inkMuted}
          />
        </Pressable>
      );
    }
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleText}>{section.title}</Text>
      </View>
    );
  };

  return (
    <Screen>
      <SectionList<ListItem, TodaySection>
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        onScrollToIndexFailed={() => {
          setTimeout(() => {
            listRef.current?.scrollToLocation({
              sectionIndex: 0,
              itemIndex: markerIndexRef.current,
              animated: false,
            });
          }, 300);
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Logo size={64} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                hitSlop={spacing.sm}
                onPress={() => router.push('/settings')}
                style={styles.gear}
              >
                <Ionicons name="settings-outline" size={22} color={colors.inkMuted} />
              </Pressable>
            </View>
            <Text style={styles.overline}>Today</Text>
            <Text style={styles.heading}>{formatTodayHeading(now)}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <Fab onPress={() => router.push('/sheet/quick-add')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  overline: { ...type.overline, color: colors.inkMuted },
  heading: { ...type.display, color: colors.ink },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitleText: { ...type.overline, color: colors.inkMuted },
  softEmpty: { ...type.caption, color: colors.inkFaint, paddingVertical: spacing.lg },
  listContent: { paddingBottom: 120 },
});
