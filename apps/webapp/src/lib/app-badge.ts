type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export async function updateAppBadge(count: number): Promise<void> {
  const badgeNavigator = navigator as BadgeNavigator;

  try {
    if (count > 0) {
      await badgeNavigator.setAppBadge?.(count);
      return;
    }

    await badgeNavigator.clearAppBadge?.();
  } catch {
    // Badging is an optional enhancement and must never block the app.
  }
}
