import { StyleSheet, View } from 'react-native';
import { AssessmentQuestion, Instrument } from '../../content/assessments';
import { colors, spacing } from '../app/theme';
import { AppText } from './AppText';
import { AssessmentOptionList } from './AssessmentOptionList';

interface AssessmentQuestionCardProps {
  instrument: Instrument;
  question: AssessmentQuestion;
  indexInInstrument: number;
  selected: number | undefined;
  onSelect: (score: number) => void;
}

/** One question: which instrument it's from, its verbatim text, and its options. */
export function AssessmentQuestionCard({
  instrument,
  question,
  indexInInstrument,
  selected,
  onSelect,
}: AssessmentQuestionCardProps) {
  return (
    <View style={styles.container}>
      <AppText variant="caption" color={colors.textSecondary}>
        {indexInInstrument + 1} of {instrument.questions.length} | {instrument.title}
      </AppText>
      <AppText variant="h2">Question #{indexInInstrument + 1}</AppText>
      <AppText variant="title">{question.text}</AppText>
      <AssessmentOptionList options={question.options} selected={selected} onSelect={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
});
