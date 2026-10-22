import appConfig from '../../app.json';

/**
 * Guards for the build-level decisions that only show up in the final
 * Android manifest. These are cheap to assert and expensive to lose.
 */
describe('app config (Android)', () => {
  const expo = appConfig.expo as {
    android: {
      package: string;
      versionCode: number;
      permissions?: string[];
      blockedPermissions?: string[];
    };
    plugins: unknown[];
  };

  it('keeps INTERNET blocked — the app is local-only', () => {
    expect(expo.android.blockedPermissions).toContain('android.permission.INTERNET');
  });

  it('declares USE_EXACT_ALARM so reminders fire on time (D20)', () => {
    expect(expo.android.permissions).toContain('android.permission.USE_EXACT_ALARM');
  });

  it('does not declare SCHEDULE_EXACT_ALARM (it would force a user grant)', () => {
    expect(expo.android.permissions ?? []).not.toContain(
      'android.permission.SCHEDULE_EXACT_ALARM',
    );
  });

  it('configures the status bar plugin for dark content on paper', () => {
    const plugin = expo.plugins.find(
      (entry) =>
        entry === 'expo-status-bar' ||
        (Array.isArray(entry) && entry[0] === 'expo-status-bar'),
    ) as [string, { style?: string }] | undefined;

    expect(plugin).toBeDefined();
    expect(Array.isArray(plugin)).toBe(true);
    expect(plugin![1]).toEqual({ style: 'dark' });
  });

  it('keeps the application id and version code stable', () => {
    expect(expo.android.package).toBe('com.hemera.app');
    expect(expo.android.versionCode).toBeGreaterThanOrEqual(2);
  });
});
