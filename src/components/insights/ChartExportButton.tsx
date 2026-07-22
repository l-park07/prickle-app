import { Ionicons } from '@react-native-vector-icons/ionicons';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { captureRef, type ViewShotRef } from 'react-native-view-shot';
import { colors, radius, spacing } from '../../app/theme';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

interface ChartExportButtonProps {
  /** The ViewShot wrapping exactly the chart area to snapshot (not the whole card — controls stay out of the picture). */
  shotRef: RefObject<ViewShotRef | null>;
  /** Used as both the share sheet's suggested filename and its accessibility label, e.g. "Symptom severity over time". */
  chartTitle: string;
  /** Runs right before capture — e.g. reveal export-only chrome baked into the shot itself (a
   *  legend key, the date range) that's otherwise hidden on-screen to avoid duplicating controls
   *  the user already sees above the chart. Two animation frames are given afterward so that
   *  reveal has actually laid out before the snapshot is taken. */
  beforeCapture?: () => void;
  /** Runs after capture (success, failure, or cancel) to undo beforeCapture's reveal. */
  afterCapture?: () => void;
}

/** Small save/share icon dropped into a ChartCard's headerRight — snapshots the chart it's paired
 *  with as a PNG and hands it to the OS share sheet, where "Save Image" is one of the options.
 *  There's no photo-library write permission in this app (see package.json — no expo-media-library),
 *  so sharing is the mechanism, not a direct gallery save. */
export function ChartExportButton({ shotRef, chartTitle, beforeCapture, afterCapture }: ChartExportButtonProps) {
  const handlePress = async () => {
    const view = shotRef.current;
    if (!view) return;
    try {
      beforeCapture?.();
      if (beforeCapture) {
        await nextFrame();
        await nextFrame();
      }
      const uri = await captureRef(view, { format: 'png', quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) return;
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Save ${chartTitle} chart`,
        UTI: 'public.png',
      });
    } catch {
      // Share sheet dismissed/cancelled by the user — not a failure worth surfacing.
    } finally {
      afterCapture?.();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Save a picture of the ${chartTitle} chart`}
      hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
      style={styles.button}
    >
      <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
