import { Redirect } from 'expo-router';
import { DebugScreen } from '../../dev/DebugScreen';

export default function DevDebugRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DebugScreen />;
}
