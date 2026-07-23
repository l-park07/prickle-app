import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { useAuth } from '../../context/AuthProvider';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { todayISO } from '../../lib/calendarMath';
import {
  getActiveMedications,
  getActiveSites,
  getActiveTriggers,
  getEarliestLogDate,
  getMedicationHistory,
  getPoemSeries,
  getRecapSeries,
  getWorstSeverityPhotoPerSite,
  type WorstSeverityPhoto,
} from '../../lib/chartSelectors';
import { db } from '../../lib/db';
import { buildExportCsv } from '../../lib/exportData';
import { buildSummaryHtml, type CustomChartSectionInput } from '../../lib/exportSummary';
import { listCustomCharts, type CustomChart, type CustomChartConfig } from '../../lib/manageCustomCharts';
import { AppText } from '../AppText';
import { Card } from '../Card';
import { PrimaryButton } from '../PrimaryButton';
import { assignSiteColors } from './chartTheme';
import { ExportReviewSheet } from './ExportReviewSheet';
import { ExportSummaryCaptureRig } from './ExportSummaryCaptureRig';
import { buildOverlayCaption, OverlayCard } from './OverlayCard';
import { PoemTrendChart } from './PoemTrendChart';
import { RecapTrendChart } from './RecapTrendChart';
import { rangeFromPreset, type RangePreset } from './RangeAndGranularityControls';
import { SeverityOverTimeChart } from './SeverityOverTimeChart';
import { TimeRangeControl } from './TimeRangeControl';

const RANGE_LABELS: Record<CustomChartConfig['range'], string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '6mo': 'Last 6 months',
  '1yr': 'Last year',
  all: 'All time',
};

/** Reads a photo file and returns it base64-encoded, or null if the file is missing/unreadable
 *  (e.g. moved off-device) — that site's photo is then dropped rather than failing the whole PDF. */
async function readPhotoBase64(photo: WorstSeverityPhoto): Promise<(WorstSeverityPhoto & { base64: string }) | null> {
  try {
    const base64 = await new File(photo.localUri).base64();
    return { ...photo, base64 };
  } catch {
    return null;
  }
}

/** First/last weekStart in a series — POEM/RECAP always show their true full history (see
 *  insights.tsx's comment), which can differ from the document's own chosen range, so the PDF
 *  states each chart's own actual period rather than reusing the document's from/to for all three. */
function seriesSpan(series: { weekStart: string }[]): { from: string; to: string } | null {
  if (series.length === 0) return null;
  return { from: series[0].weekStart, to: series[series.length - 1].weekStart };
}

/**
 * Bottom-of-Insights export card: one shared date range, two on-device outputs — a "Share summary
 * (PDF)" one-document overview (built from the real Insights charts, see ExportSummaryCaptureRig)
 * and a "Download CSV" raw data export (see exportData.ts). Nothing here ever touches the network.
 * Both outputs go through ExportReviewSheet first — permanent charts are always included, each
 * custom chart is pre-checked from its own includeInExport flag but adjustable for that export only.
 */
export function ExportSection() {
  const activeUserId = useActiveUserId();
  const { user } = useAuth();
  const [preset, setPreset] = useState<RangePreset>('all');
  const [buildingPdf, setBuildingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [captureNode, setCaptureNode] = useState<ReactNode | null>(null);
  const captureResolverRef = useRef<((png: string | null) => void) | null>(null);
  // A fresh key per capture forces React to actually unmount + remount ExportSummaryCaptureRig
  // for every chart, rather than reuse the same instance across a children swap. Without this,
  // React can batch the "null" reset together with the next chart's setCaptureNode (they land in
  // the same flush), skip rendering the null state entirely, and just hand the existing instance
  // new children — its capture effect (empty deps, fires once per mount) then never runs again,
  // so the promise for every chart after the first never resolves and the whole export hangs.
  const captureKeyRef = useRef(0);

  // Review step: pressing either button first snapshots the current custom-chart list and opens
  // ExportReviewSheet; pendingExport remembers which pipeline Continue should actually run.
  const [pendingExport, setPendingExport] = useState<'pdf' | 'csv' | null>(null);
  const [reviewCharts, setReviewCharts] = useState<CustomChart[]>([]);
  const [reviewVisible, setReviewVisible] = useState(false);

  const busy = buildingPdf || exportingCsv || reviewVisible;
  // The PDF path is genuinely slow now — it captures three charts off-screen one at a time (see
  // ExportSummaryCaptureRig), each with its own settle delay, before it even starts rendering the
  // PDF — so the button's own bare spinner alone reads as stuck/broken. This status line is the
  // reassurance that it's still working, not the button.
  const statusMessage = buildingPdf
    ? 'Building your summary — capturing your charts and putting the PDF together. This can take 10-15 seconds.'
    : exportingCsv
      ? 'Preparing your CSV…'
      : null;

  const handleCaptured = (png: string | null) => {
    setCaptureNode(null);
    captureResolverRef.current?.(png);
    captureResolverRef.current = null;
  };

  // Captures exactly one chart at a time — mounting several off-screen simultaneously let their
  // concurrent data-fetch/layout passes interfere with each other (charts intermittently came out
  // blank or as a duplicate of a different chart). Awaiting one captureChart call at a time from
  // the handlers below guarantees only one is ever mounted in the rig at once.
  const captureChart = (node: ReactNode): Promise<string | null> => {
    captureKeyRef.current += 1;
    return new Promise((resolve) => {
      captureResolverRef.current = resolve;
      setCaptureNode(node);
    });
  };

  /** Opens the review sheet with a fresh snapshot of the user's custom charts — fetched at press
   *  time (not kept as persistent state) so it always reflects the very latest list/flags. */
  const handlePressExport = async (kind: 'pdf' | 'csv') => {
    if (!activeUserId || busy) return;
    const [sites, triggers, medications] = await Promise.all([
      getActiveSites(db, activeUserId),
      getActiveTriggers(db, activeUserId),
      getActiveMedications(db, activeUserId),
    ]);
    const liveIds = {
      siteIds: new Set(sites.map((s) => s.id)),
      triggerIds: new Set(triggers.map((t) => t.id)),
      medicationIds: new Set(medications.map((m) => m.id)),
    };
    const charts = await listCustomCharts(db, activeUserId, liveIds);
    setReviewCharts(charts);
    setPendingExport(kind);
    setReviewVisible(true);
  };

  const handleSharePdf = async (includedCharts: CustomChart[]) => {
    if (!activeUserId) return;
    setBuildingPdf(true);
    try {
      const today = todayISO();
      const earliest = preset === 'all' ? await getEarliestLogDate(db, activeUserId) : null;
      const { from, to } = preset === 'all' ? { from: earliest ?? today, to: today } : rangeFromPreset(preset, today);

      const [sites, poemSeries, recapSeries, medications, worstPhotos] = await Promise.all([
        getActiveSites(db, activeUserId),
        getPoemSeries(db, activeUserId), // always full history, matching POEM/RECAP's on-screen convention (see insights.tsx)
        getRecapSeries(db, activeUserId),
        getMedicationHistory(db, activeUserId, from, to),
        getWorstSeverityPhotoPerSite(db, activeUserId, from, to),
      ]);
      const colorById = assignSiteColors(sites);

      const severityChartPng = await captureChart(
        <SeverityOverTimeChart sites={sites} colorById={colorById} rangePresetOverride={preset} printMode />
      );
      const poemChartPng = await captureChart(<PoemTrendChart data={poemSeries} printMode />);
      const recapChartPng = await captureChart(<RecapTrendChart data={recapSeries} printMode />);

      // Each custom chart captures using its OWN saved range/config, not the document's shared
      // preset — it's the user's own deliberately-built view, not something this export flow
      // should silently reinterpret.
      const customCharts: CustomChartSectionInput[] = [];
      for (const chart of includedCharts) {
        const png = await captureChart(<OverlayCard chart={chart} printMode />);
        customCharts.push({
          title: chart.title,
          png,
          caption: buildOverlayCaption(chart.config),
          periodLabel: RANGE_LABELS[chart.config.range],
        });
      }

      const photos = (await Promise.all(worstPhotos.map(readPhotoBase64))).filter(
        (p): p is WorstSeverityPhoto & { base64: string } => p !== null
      );

      const html = buildSummaryHtml({
        userName: user?.displayName ?? null,
        from,
        to,
        medications,
        severityChartPng,
        poemChartPng,
        poemRange: seriesSpan(poemSeries),
        recapChartPng,
        recapRange: seriesSpan(recapSeries),
        photos,
        customCharts,
      });

      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Can't share right now", 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share your Prickle summary',
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert("Couldn't build your summary", 'Something went wrong putting the PDF together. Please try again.');
    } finally {
      setCaptureNode(null);
      captureResolverRef.current = null;
      setBuildingPdf(false);
    }
  };

  const handleDownloadCsv = async (includedCharts: CustomChart[]) => {
    if (!activeUserId) return;
    setExportingCsv(true);
    try {
      const { from, to } = rangeFromPreset(preset, todayISO());
      // Scoped to the union of what the included custom charts actually reference (membership,
      // not current enabled state — a temporarily-disabled row is still part of what this chart
      // tracks). Sites and Stress/Mood stay unconditional regardless — see buildExportCsv.
      const seriesIdsOfKind = (kind: 'trigger' | 'medication') =>
        includedCharts.flatMap((c) => c.config.series.filter((s): s is Extract<CustomChartConfig['series'][number], { kind: typeof kind }> => s.kind === kind).map((s) => s.id));
      const triggerIds = [...new Set(seriesIdsOfKind('trigger'))];
      const medicationIds = [...new Set(seriesIdsOfKind('medication'))];
      const { csv, filename } = await buildExportCsv(db, activeUserId, from, to, { triggerIds, medicationIds });

      const file = new File(Paths.document, filename);
      file.write(csv);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Can't share right now", 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Share your Prickle data (CSV)',
        UTI: 'public.comma-separated-values-text',
      });
    } catch {
      Alert.alert("Couldn't export your data", 'Something went wrong building the file. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleReviewContinue = (includedIds: Set<string>) => {
    setReviewVisible(false);
    const kind = pendingExport;
    setPendingExport(null);
    const includedCharts = reviewCharts.filter((c) => includedIds.has(c.id));
    if (kind === 'pdf') handleSharePdf(includedCharts);
    else if (kind === 'csv') handleDownloadCsv(includedCharts);
  };

  return (
    <Card style={styles.card}>
      <AppText variant="title">Export your data</AppText>
      <TimeRangeControl value={preset} onChange={setPreset} />
      <View style={styles.buttonStack}>
        <PrimaryButton
          label="Share summary (PDF)"
          onPress={() => handlePressExport('pdf')}
          loading={buildingPdf}
          disabled={!activeUserId || busy}
        />
        <PrimaryButton
          label="Download CSV"
          onPress={() => handlePressExport('csv')}
          loading={exportingCsv}
          disabled={!activeUserId || busy}
        />
      </View>
      {statusMessage ? (
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <AppText variant="caption" color={colors.textSecondary} style={styles.statusText}>
            {statusMessage}
          </AppText>
        </View>
      ) : (
        <AppText variant="caption" color={colors.textSecondary}>
          Built on your device — nothing is uploaded.
        </AppText>
      )}
      {captureNode ? (
        // No extra wrapper here: ExportSummaryCaptureRig positions itself off-screen (absolute,
        // left: -10000) on its own root view. Wrapping that in an overflow:hidden box would clip
        // it before captureRef ever gets a chance to snapshot it.
        <ExportSummaryCaptureRig key={captureKeyRef.current} onCaptured={handleCaptured}>
          {captureNode}
        </ExportSummaryCaptureRig>
      ) : null}
      <ExportReviewSheet
        visible={reviewVisible}
        customCharts={reviewCharts}
        onClose={() => {
          setReviewVisible(false);
          setPendingExport(null);
        }}
        onContinue={handleReviewContinue}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  buttonStack: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    flex: 1,
  },
});
