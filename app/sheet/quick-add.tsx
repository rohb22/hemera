import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/PrimaryButton';
import { useTasksStore } from '@/stores/tasksStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

export default function QuickAddSheet() {
  const router = useRouter();
  const createTask = useTasksStore((s) => s.createTask);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmed = title.trim();
  const canSave = trimmed.length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await createTask(trimmed);
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        autoFocus
        value={title}
        onChangeText={setTitle}
        placeholder="What needs doing?"
        placeholderTextColor={colors.inkFaint}
        style={styles.input}
        returnKeyType="done"
        maxLength={200}
        onSubmitEditing={save}
      />
      <Button label="Save" onPress={save} disabled={!canSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: spacing.xl,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  input: {
    ...type.body,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
});
