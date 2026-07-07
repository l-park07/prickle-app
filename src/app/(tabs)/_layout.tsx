import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogFab } from '../../components/LogFab';
import { colors, fontFamily } from '../theme';

const ICON_SIZE = 24;

export default function TabLayout() {
  return (
    <SafeAreaProvider style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: { backgroundColor: colors.tabBarBg },
          tabBarLabelStyle: { fontFamily: fontFamily.medium },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="today"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'calendar-clear' : 'calendar-clear-outline'}
                size={ICON_SIZE}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen name="log" options={{ href: null }} />
        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="triggers"
          options={{
            title: 'Triggers',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'disc' : 'disc-outline'} size={ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="resources"
          options={{
            title: 'Resources',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'book' : 'book-outline'} size={ICON_SIZE} color={color} />
            ),
          }}
        />
      </Tabs>
      <LogFab />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
