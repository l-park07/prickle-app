import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../app/theme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { todayISO } from '../../lib/calendarMath';
import { db } from '../../lib/db';
import { buildExportCsv } from '../../lib/exportData';
import { AppText } from '../AppText';
import { Card } from '../Card';
import { PrimaryButton } from '../PrimaryButton';
import { rangeFromPreset, type RangePreset } from './RangeAndGranularityControls';
import { TimeRangeControl } from './TimeRangeControl';

/** Bottom-of-Insights export: builds a CSV of the active user's data entirely on-device (no
 *  network call anywhere in this path) and hands it to the OS share sheet — there's no direct
 *  "save to Downloads" in managed Expo, so the share sheet (Files, email, etc.) is the way out. */
export function ExportDataSection() {
  const activeUserId = useActiveUserId();
  const [preset, setPreset] = useState<RangePreset>('all');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!activeUserId || exporting) return;
    setExporting(true);
    try {
      const { from, to } = rangeFromPreset(preset, todayISO());
      const { csv, filename } = await buildExportCsv(db, activeUserId, from, to);

      const file = new File(Paths.document, filename);
      file.write(csv);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Can't share right now", 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Share your Prickle data',
        UTI: 'public.comma-separated-values-text',
      });
    } catch {
      Alert.alert("Couldn't export your data", 'Something went wrong building the file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card style={styles.card}>
      <AppText variant="title">Download my data</AppText>
      <TimeRangeControl value={preset} onChange={setPreset} />
      <PrimaryButton label="Download my data" onPress={handleExport} loading={exporting} disabled={!activeUserId} />
      <AppText variant="caption" color={colors.textSecondary}>
        Built on your device — nothing is uploaded.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
});
