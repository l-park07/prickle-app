import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, overlay, radius, spacing, typography } from '../../app/theme';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { db } from '../../lib/db';
import { formatLongDate } from '../../lib/calendarMath';
import {
  addObservationNote,
  CATEGORY_LABELS,
  deleteObservationNote,
  getObservationNotes,
  updateObservationNote,
  type ObservationNote,
  type TriggerRowCategory,
} from '../../lib/manageTriggers';
import { AppText } from '../AppText';
import { PrimaryButton } from '../PrimaryButton';

export interface ObservationNotesTarget {
  experimentId: string;
  label: string;
  category: TriggerRowCategory;
  startDate: string;
  endDate: string;
  /** True when opened via the card's "Add note" shortcut, so the composer opens pre-expanded. */
  autoCompose?: boolean;
}

interface ObservationNotesModalProps {
  /** null = closed. */
  target: ObservationNotesTarget | null;
  onClose: () => void;
}

/**
 * Notes overlay for a trigger's watch window — opened from CurrentlyWatchingCard
 * or a TriggerWatchArchiveSection row. Same component either way, so notes can
 * be added mid-observation or added/reviewed after the window has ended.
 */
export function ObservationNotesModal({ target, onClose }: ObservationNotesModalProps) {
  const insets = useSafeAreaInsets();
  const activeUserId = useActiveUserId();
  const [notes, setNotes] = useState<ObservationNote[]>([]);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const experimentId = target?.experimentId ?? null;
  // Keyed on autoCompose too, so re-opening the same window via "Add note"
  // after having viewed it read-only still lands in the composer.
  const openKey = experimentId ? `${experimentId}:${target?.autoCompose ? 1 : 0}` : null;

  useEffect(() => {
    if (!experimentId) return;
    setComposing(!!target?.autoCompose);
    setDraft('');
    setEditingNoteId(null);
    setEditDraft('');
    getObservationNotes(db, experimentId).then(setNotes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  const refreshNotes = async () => {
    if (!experimentId) return;
    setNotes(await getObservationNotes(db, experimentId));
  };

  const handleSave = async () => {
    if (!activeUserId || !experimentId) return;
    const body = draft.trim();
    if (!body) return;
    setSaving(true);
    await addObservationNote(db, activeUserId, experimentId, body);
    await refreshNotes();
    setSaving(false);
    setComposing(false);
    setDraft('');
  };

  const startEdit = (note: ObservationNote) => {
    setEditingNoteId(note.id);
    setEditDraft(note.body);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditDraft('');
  };

  const saveEdit = async () => {
    const body = editDraft.trim();
    if (!editingNoteId || !body) return;
    setSaving(true);
    await updateObservationNote(db, editingNoteId, body);
    await refreshNotes();
    setSaving(false);
    cancelEdit();
  };

  const confirmDelete = (note: ObservationNote) => {
    Alert.alert('Delete this note?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteObservationNote(db, note.id);
          await refreshNotes();
        },
      },
    ]);
  };

  return (
    <Modal visible={target !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        {target ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <AppText variant="h2">{target.label}</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {CATEGORY_LABELS[target.category]}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {formatLongDate(target.startDate)} → {formatLongDate(target.endDate)}
                  </AppText>
                </View>
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.notesList}>
                {notes.length === 0 ? (
                  <AppText variant="caption" color={colors.textSecondary}>
                    No notes yet
                  </AppText>
                ) : (
                  notes.map((note) => (
                    <View key={note.id} style={styles.noteBubble}>
                      <View style={styles.noteBubbleHeader}>
                        <AppText variant="caption" color={colors.textSecondary}>
                          {formatLongDate(note.createdAt.slice(0, 10))}
                          {note.updatedAt !== note.createdAt ? ' · edited' : ''}
                        </AppText>
                        {editingNoteId === note.id ? null : (
                          <View style={styles.noteBubbleIcons}>
                            <Pressable
                              onPress={() => startEdit(note)}
                              accessibilityRole="button"
                              accessibilityLabel="Edit note"
                              hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                            >
                              <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                            </Pressable>
                            <Pressable
                              onPress={() => confirmDelete(note)}
                              accessibilityRole="button"
                              accessibilityLabel="Delete note"
                              hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
                            >
                              <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                            </Pressable>
                          </View>
                        )}
                      </View>

                      {editingNoteId === note.id ? (
                        <View style={styles.composer}>
                          <TextInput
                            style={styles.input}
                            value={editDraft}
                            onChangeText={setEditDraft}
                            multiline
                            autoFocus
                          />
                          <View style={styles.composerButtons}>
                            <Pressable onPress={cancelEdit} accessibilityRole="button">
                              <AppText variant="label" color={colors.textSecondary}>
                                Cancel
                              </AppText>
                            </Pressable>
                            <PrimaryButton
                              label="Save"
                              onPress={saveEdit}
                              loading={saving}
                              disabled={!editDraft.trim()}
                            />
                          </View>
                        </View>
                      ) : (
                        <AppText variant="body">{note.body}</AppText>
                      )}
                    </View>
                  ))
                )}
              </View>

              {composing ? (
                <View style={styles.composer}>
                  <TextInput
                    style={styles.input}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="What did you notice?"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    autoFocus
                  />
                  <View style={styles.composerButtons}>
                    <Pressable
                      onPress={() => {
                        setComposing(false);
                        setDraft('');
                      }}
                      accessibilityRole="button"
                    >
                      <AppText variant="label" color={colors.textSecondary}>
                        Cancel
                      </AppText>
                    </Pressable>
                    <PrimaryButton label="Save note" onPress={handleSave} loading={saving} disabled={!draft.trim()} />
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setComposing(true)}
                  accessibilityRole="button"
                  style={styles.addNoteRow}
                >
                  <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
                  <AppText variant="label" color={colors.primary}>
                    Add note
                  </AppText>
                </Pressable>
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: overlay,
  },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  notesList: {
    gap: spacing.sm,
  },
  noteBubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  noteBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteBubbleIcons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  composer: {
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  composerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
