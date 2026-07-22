import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

const EXPORT_WIDTH = 500;

// Long enough for the chart's own DB reads (local SQLite, normally well under 50ms) and a couple
// of React render/layout passes to settle before we snapshot — there's no "data ready" callback
// exposed by these chart components to await instead (they manage their own internal fetching).
const SETTLE_DELAY_MS = 900;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function captureOrNull(ref: RefObject<View | null>): Promise<string | null> {
  const node = ref.current;
  if (!node) return null;
  try {
    return await captureRef(node, { format: 'png', quality: 1, result: 'data-uri' });
  } catch {
    return null;
  }
}

interface ExportSummaryCaptureRigProps {
  /** The one chart to render off-screen and capture — a fresh <SeverityOverTimeChart printMode />,
   *  <PoemTrendChart printMode />, etc. */
  children: ReactNode;
  onCaptured: (png: string | null) => void;
}

/**
 * Mounts exactly ONE real Insights chart component off-screen at a time — reusing its exact
 * rendering (gap handling, POEM bands, RECAP gradient) rather than re-implementing any of it —
 * waits for it to settle, captures it to a PNG data URI, and hands the result to onCaptured.
 *
 * Deliberately one chart per mount, not three siblings at once: mounting Severity/POEM/RECAP
 * simultaneously let their concurrent async data-fetch/layout passes interfere with each other in
 * practice (charts intermittently came out blank, half-rendered, or as a copy of a different
 * chart). ExportSection.tsx now awaits one captureRig mount per chart in sequence instead, so only
 * one chart is ever in this rig's tree at a time.
 *
 * Positioned far off the visible canvas rather than hidden via display:none/opacity:0: those would
 * prevent layout from ever running, and captureRef needs a real, laid-out native view to snapshot.
 * `collapsable={false}` keeps Android from flattening this wrapper view out of the native tree
 * before capture can find it.
 */
export function ExportSummaryCaptureRig({ children, onCaptured }: ExportSummaryCaptureRigProps) {
  const ref = useRef<View>(null);

  // Captures exactly once per mount — ExportSection mounts a fresh rig, with fresh children, for
  // every chart it needs, so there's no reason for this to re-run on prop changes mid-capture.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await nextFrame();
      await nextFrame();
      await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY_MS));
      if (cancelled) return;
      const png = await captureOrNull(ref);
      if (!cancelled) onCaptured(png);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.offscreen} pointerEvents="none">
      <View ref={ref} collapsable={false} style={styles.chartWrap}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    top: 0,
    left: -10000,
    width: EXPORT_WIDTH,
  },
  chartWrap: {
    width: EXPORT_WIDTH,
  },
});
