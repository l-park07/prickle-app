import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AssessmentHeaderBar } from '../components/AssessmentHeaderBar';
import { AssessmentIntro } from '../components/AssessmentIntro';
import { AssessmentNavFooter } from '../components/AssessmentNavFooter';
import { AssessmentProgressBar } from '../components/AssessmentProgressBar';
import { AssessmentQuestionCard } from '../components/AssessmentQuestionCard';
import { POEM } from '../../content/assessments';
import { scorePoem, scoreRecap } from '../../content/scoreAssessment';
import { useActiveUserId } from '../hooks/useActiveUserId';
import { useAssessmentFlow } from '../hooks/useAssessmentFlow';
import { getWeekStart, todayISO } from '../lib/calendarMath';
import { db } from '../lib/db';
import { insertWeeklyAssessment } from '../lib/insertWeeklyAssessment';
import { colors, spacing } from './theme';

export default function AssessmentModal() {
  const router = useRouter();
  const activeUserId = useActiveUserId();
  const { flow, step, currentEntry, answers, isIntro, isLast, begin, next, back, select } =
    useAssessmentFlow();
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async () => {
    if (!activeUserId) return;
    setSubmitting(true);
    const poemResult = scorePoem(answers);
    const recapResult = scoreRecap(answers);
    const weekStart = getWeekStart(todayISO());
    await insertWeeklyAssessment(db, {
      userId: activeUserId,
      weekStart,
      poemScore: poemResult.score,
      recapScore: recapResult.score,
    });
    router.dismissTo('/weekly');
  };

  const handleClose = () => {
    Alert.alert(
      'Cancel this check-in?',
      'Your answers so far won’t be saved.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, I’m sure', style: 'destructive', onPress: () => router.dismissTo('/weekly') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AssessmentHeaderBar title="Weekly Check-in" onClose={handleClose} />
      <View style={styles.content}>
        {isIntro ? (
          <AssessmentIntro onBegin={begin} />
        ) : currentEntry ? (
          <>
            <AssessmentQuestionCard
              instrument={currentEntry.instrument}
              question={currentEntry.question}
              indexInInstrument={currentEntry.indexInInstrument}
              selected={answers[currentEntry.question.id]}
              onSelect={(score) => select(currentEntry.question.id, score)}
            />
            <View style={styles.footer}>
              <AssessmentNavFooter
                onBack={back}
                onNext={isLast ? handleFinish : next}
                nextLabel={isLast ? 'Finish' : 'Next'}
                loading={submitting}
              />
              <AssessmentProgressBar
                current={step + 1}
                total={flow.length}
                boundary={POEM.questions.length}
              />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  footer: {
    marginTop: 'auto',
    gap: spacing.sm,
  },
});
