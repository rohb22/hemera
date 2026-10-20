import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SwipeRow } from '@/components/SwipeRow';
import { blockHeightMin, type TimelineCluster } from '@/domain/timeline';
import { deadlineReached, effectiveDurationMin, timeRangeLabel } from '@/domain/taskLabels';
import type { Task } from '@/domain/types';
import { colors, radii, spacing, type } from '@/theme/tokens';

interface TimelineRowProps {
  cluster: TimelineCluster;
  now: Date;
  onPress: (task: Task) => void;
  onComplete: (task: Task) => void;
}

export function TimelineRow({ cluster, now, onPress, onComplete }: TimelineRowProps) {
  const firstLane = cluster.tasksPerLane[0];
  const firstTask = firstLane?.[0];
  const clusterTime = firstTask?.startTime ?? null;
  const showInnerTime = cluster.laneCount > 1;

  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        {clusterTime && <Text style={styles.timeLabel}>{clusterTime}</Text>}
      </View>
      <View style={styles.railCol}>
        <View style={styles.railLine} />
        <View style={styles.node} />
      </View>
      <View style={styles.lanes}>
        {cluster.tasksPerLane.map((lane, laneIndex) => (
          <View key={laneIndex} style={styles.lane}>
            {lane.map((task) => (
              <SwipeRow key={task.id} onComplete={() => onComplete(task)}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${task.title}, scheduled ${task.startTime ?? ''}`}
                  onPress={() => onPress(task)}
                  style={styles.blockTouch}
                >
                  <View
                    style={[
                      styles.block,
                      { minHeight: blockHeightMin(effectiveDurationMin(task) ?? 30) },
                      deadlineReached(task, now) && styles.blockAttention,
                    ]}
                  >
                    {deadlineReached(task, now) && <View style={styles.attentionBar} />}
                    <View style={styles.blockBody}>
                      {showInnerTime && (
                        <Text style={styles.innerTime}>{timeRangeLabel(task)}</Text>
                      )}
                      <Text style={styles.blockTitle} numberOfLines={3}>
                        {task.title}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </SwipeRow>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export function NowMarker({ now }: { now: Date }) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Now, ${format(now, 'HH:mm')}`}
      style={styles.row}
    >
      <View style={styles.timeCol}>
        <Text style={styles.nowTime}>{format(now, 'HH:mm')}</Text>
      </View>
      <View style={styles.railCol}>
        <View style={[styles.railLine, styles.nowLine]} />
        <View style={styles.nowDot} />
      </View>
      <View style={styles.lanes} />
    </View>
  );
}

const TIME_COL = 44;
const RAIL_COL = 16;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  timeCol: {
    width: TIME_COL,
    alignItems: 'flex-end',
    paddingTop: 2,
    paddingRight: spacing.sm,
  },
  timeLabel: { ...type.caption, color: colors.inkMuted },
  nowTime: { ...type.caption, color: colors.accent },
  railCol: {
    width: RAIL_COL,
    alignItems: 'center',
  },
  railLine: {
    position: 'absolute',
    left: (RAIL_COL - 2) / 2,
    top: -spacing.sm,
    bottom: -spacing.sm,
    width: 2,
    backgroundColor: colors.hairline,
  },
  nowLine: { backgroundColor: colors.accent, width: 1, left: (RAIL_COL - 1) / 2 },
  node: {
    position: 'absolute',
    top: 14,
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.inkFaint,
  },
  nowDot: {
    position: 'absolute',
    top: 9,
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  lanes: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  lane: { flex: 1, gap: spacing.xs },
  blockTouch: { borderRadius: radii.md },
  block: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  blockAttention: { backgroundColor: colors.attentionSoft, borderColor: colors.attention },
  attentionBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.attention,
  },
  blockBody: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  innerTime: { ...type.caption, color: colors.inkMuted },
  blockTitle: { ...type.body, color: colors.ink },
});
