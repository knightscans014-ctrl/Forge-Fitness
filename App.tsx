import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useGame } from './src/context/GameContext';
import { Loader } from './src/components/ui';
import { ToastHost } from './src/components/Toast';
import { AuraOverlay } from './src/components/effects';
import { Icon, TAB_ICONS } from './src/theme/icons';
import { colors } from './src/theme/colors';

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

export type RootStackParamList = {
  Main: undefined;
  LogDetail: undefined;
  SessionLive: undefined;
  TrialsDetail: undefined;
  ProgressDetail: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Consolidated tab set (5 tabs, everything else is a detail screen).
const TABS = [
  { name: 'Home', component: HomeScreen, title: 'Home' },
  { name: 'Quests', component: MissionsScreen, title: 'Quests' },
  { name: 'Battle', component: BattleScreen, title: 'Battle' },
  { name: 'Character', component: CharacterScreen, title: 'Character' },
  { name: 'Shop', component: ShopScreen, title: 'Shop' },
] as const;

function MainTabs() {
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
          const cfg = TAB_ICONS[route.name] || { active: 'help', inactive: 'help' };
          return <Icon name={focused ? cfg.active : (cfg.inactive || cfg.active)} size={22} color={color} family={cfg.family} />;
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

export default function App() {
  const hydrated = useGame(s => s.hydrated);
  const state = useGame(s => s.state);
  const hydrate = useGame(s => s.hydrate);

  useEffect(() => { hydrate(); }, []);

  // Everything lives on this device, so the only thing to wait for is the
  // local save being read back off disk.
  if (!hydrated) return <Loader />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
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
