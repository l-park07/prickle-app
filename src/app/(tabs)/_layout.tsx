import { Ionicons } from '@react-native-vector-icons/ionicons';
import { Tabs, type BottomTabBarButtonProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet } from 'react-native';
import { colors, fontFamily, radius } from '../theme';

const ICON_SIZE = 24;

// Floating "+" button rendered in place of a normal tab button, so it visually
// overlaps the bar instead of sitting flush with the other tabs.
function LogTabButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={accessibilityState}
      accessibilityLabel="Log"
      style={styles.logButton}
    >
      <Ionicons name="add" size={32} color={colors.onPrimary} />
    </Pressable>
  );
}

export default function TabLayout() {
  return (
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
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarLabel: () => null,
          tabBarButton: (props) => <LogTabButton {...props} />,
        }}
      />
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
            <Ionicons name={focused ? 'flash' : 'flash-outline'} size={ICON_SIZE} color={color} />
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
  );
}

const styles = StyleSheet.create({
  logButton: {
    top: -20,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
