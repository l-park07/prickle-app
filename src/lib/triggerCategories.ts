/**
 * Placeholder category -> trigger-name groupings for the Add Trigger flow.
 * These categories are UI-only (the triggers table has no category column)
 * and are expected to be expanded/replaced once the Trigger tab defines its
 * own taxonomy — treat this list as a starting point, not a spec.
 */
export interface TriggerCategory {
  id: string;
  label: string;
  /** Specific trigger names offered under this category. Empty = always free-text. */
  options: string[];
}

export const TRIGGER_CATEGORIES: TriggerCategory[] = [
  {
    id: 'environmental',
    label: 'Environmental Irritants',
    options: ['Pollen', 'Dust', 'Pet dander', 'Cold/dry air', 'Heat'],
  },
  {
    id: 'food',
    label: 'Food Allergy',
    options: ['Dairy', 'Eggs', 'Nuts', 'Gluten'],
  },
  {
    id: 'chemical',
    label: 'Chemical Irritants',
    options: ['Fragranced products', 'Detergent', 'Hard water', 'Chlorine'],
  },
  {
    id: 'other',
    label: 'Other',
    options: [],
  },
];
