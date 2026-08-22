import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useGame } from './src/context/GameContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { Loader } from './src/components/ui';
import { ToastHost } from './src/components/Toast';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuraOverlay } from './src/components/effects';
import { Icon, TAB_ICONS } from './src/theme/icons';

import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import MissionsScreen from './src/screens/MissionsScreen';
import BattleScreen from './src/screens/BattleScreen';
import CharacterScreen from './src/screens/CharacterScreen';
import LogScreen from './src/screens/LogScreen';
import SessionScreen from './src/screens/SessionScreen';
import TrialsScreen from './src/screens/TrialsScreen';
import ShopScreen from './src/screens/ShopScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import PlanScreen from './src/screens/PlanScreen';

import type { RootStackParamList, MainTabParamList } from './src/types/navigation';

export type { RootStackParamList, MainTabParamList } from './src/types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Consolidated tab set (6 tabs, everything else is a detail screen).
const TABS = [
  { name: 'Home', component: HomeScreen, title: 'Home' },
  { name: 'Quests', component: MissionsScreen, title: 'Quests' },
  { name: 'Battle', component: BattleScreen, title: 'Battle' },
  { name: 'Plan', component: PlanScreen, title: 'Plan' },
  { name: 'Character', component: CharacterScreen, title: 'Character' },
  { name: 'Shop', component: ShopScreen, title: 'Shop' },
] as const;

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.sys,
        tabBarInactiveTintColor: colors.mut2,
        tabBarStyle: {
          backgroundColor: colors.bg2,
          borderTopColor: colors.sysFaint,
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
        tabBarIcon: ({ focused, color }) => {
          const cfg = TAB_ICONS[route.name];
          if (!cfg) {
            if (__DEV__) console.warn(`[icons] no TAB_ICONS entry for route "${route.name}"`);
          }
          const def = cfg || { active: 'help-circle', inactive: 'help-circle', family: 'ion' as const };
          return <Icon name={focused ? def.active : (def.inactive || def.active)} size={22} color={color} family={def.family} />;
        },
      })}
    >
      {TABS.map(t => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} />
      ))}
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="LogDetail" component={LogScreen} />
      <Stack.Screen name="SessionLive" component={SessionScreen} />
      <Stack.Screen name="TrialsDetail" component={TrialsScreen} />
      <Stack.Screen name="ProgressDetail" component={ProgressScreen} />
    </Stack.Navigator>
  );
}

function MainAppContent() {
  const hydrated = useGame(s => s.hydrated);
  const state = useGame(s => s.state);
  const hydrate = useGame(s => s.hydrate);
  const { colors } = useTheme();

  useEffect(() => { hydrate(); }, [hydrate]);

  if (!hydrated) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {state ? (
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      ) : (
        <OnboardingScreen />
      )}
      <ToastHost />
      <CelebrationHost />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ErrorBoundary>
        <ThemeProvider>
          <MainAppContent />
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Renders the aura overlay when a celebration is triggered.
function CelebrationHost() {
  const celebration = useGame(s => s.celebration);
  const clear = useGame(s => s.clearCelebration);
  return (
    <AuraOverlay
      visible={!!celebration}
      title={celebration?.title || ''}
      big={celebration?.big || ''}
      subtitle={celebration?.subtitle}
      accent={celebration?.accent}
      onClose={clear}
    />
  );
}
