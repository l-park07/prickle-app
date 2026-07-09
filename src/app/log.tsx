import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '../components/PlaceholderScreen';

export default function LogModal() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <PlaceholderScreen title={`Log — ${date}`} />;
}
