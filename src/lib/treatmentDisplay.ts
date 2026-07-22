/**
 * Shared display formatting for a treatment/medication — used by both the Log
 * screen's editable row (LogTreatmentsSection) and the Today tab's read-only
 * row (today.tsx), so the two always show identical text/badges.
 */
import type { DeliveryMethod, TreatmentType, WindowUnit } from '../../content/treatmentLibrary';
import type { DayEntryMedication } from './chartSelectors';

export const TYPE_LABELS: Record<TreatmentType, string> = {
  rx: 'Prescription',
  otc: 'OTC',
  therapy: 'Therapy',
};

export const TYPE_BADGE: Record<TreatmentType, { label: string; variant: 'accent' | 'muted' }> = {
  rx: { label: 'Rx', variant: 'accent' },
  otc: { label: 'OTC', variant: 'muted' },
  therapy: { label: 'Therapy', variant: 'accent' },
};

export const METHOD_LABELS: Record<DeliveryMethod, string> = {
  topical: 'Topical',
  oral: 'Oral',
  injectable: 'Injectable',
  phototherapy: 'Phototherapy',
  bath: 'Bath',
  other: 'Other',
};

function formatWindow(count: number, unit: WindowUnit): string {
  return `${count} ${count === 1 ? unit : `${unit}s`}`;
}

/** "5 days on / 2 weeks off", or null unless both sides of the cycle are set. */
function formatCycleSummary(treatment: DayEntryMedication): string | null {
  if (!treatment.activeCount || !treatment.activeUnit || !treatment.restCount || !treatment.restUnit) {
    return null;
  }
  return `${formatWindow(treatment.activeCount, treatment.activeUnit)} on / ${formatWindow(
    treatment.restCount,
    treatment.restUnit
  )} off`;
}

/** "Every 2 weeks", "As needed", "5 days on / 2 weeks off", or a combination — null if nothing's set. */
function formatScheduleSummary(treatment: DayEntryMedication): string | null {
  const parts: string[] = [];
  if (treatment.isPrn) {
    parts.push('As needed');
  } else if (treatment.cadenceEvery && treatment.cadenceUnit) {
    const unit = treatment.cadenceEvery === 1 ? treatment.cadenceUnit : `${treatment.cadenceUnit}s`;
    parts.push(`Every ${treatment.cadenceEvery} ${unit}`);
  }
  const cycle = formatCycleSummary(treatment);
  if (cycle) parts.push(cycle);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** "Topical · Every 1 day", "5 days on / 2 weeks off", or null when nothing's set. */
export function formatTreatmentSummary(treatment: DayEntryMedication): string | null {
  const parts = [
    treatment.deliveryMethod ? METHOD_LABELS[treatment.deliveryMethod] : null,
    formatScheduleSummary(treatment),
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : null;
}
