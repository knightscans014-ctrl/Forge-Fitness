import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useGame } from './src/context/GameContext';
import { useAuth } from './src/context/AuthContext';
import { SecurityProvider } from './src/context/SecurityContext';
import { Loader } from './src/components/ui';
import { ToastHost } from './src/components/Toast';
import { AuraOverlay } from './src/components/effects';
import { Icon, TAB_ICONS } from './src/theme/icons';
import { colors } from './src/theme/colors';
import { hardeningOk } from './src/services/hardening';
import { checkForUpdate, openUpdate } from './src/services/versionCheck';
import TamperedScreen from './src/screens/TamperedScreen';

import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import MissionsScreen from './src/screens/MissionsScreen';
import BattleScreen from './src/screens/BattleScreen';
import CharacterScreen from './src/screens/CharacterScreen';
import LogScreen from './src/screens/LogScreen';
import GuildScreen from './src/screens/GuildScreen';
import SocialScreen from './src/screens/SocialScreen';
import ShopScreen from './src/screens/ShopScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import AdminScreen from './src/screens/AdminScreen';

export type RootStackParamList = {
  Main: undefined;
  LogDetail: undefined;
  GuildDetail: undefined;
  ProgressDetail: undefined;
  SocialDetail: undefined;
  Admin: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Consolidated professional tab set (5 tabs, everything else is a detail screen).
const TABS = [
  { name: 'Home', component: HomeScreen, title: 'Home' },
  { name: 'Quests', component: MissionsScreen, title: 'Quests' },
  { name: 'Battle', component: BattleScreen, title: 'Battle' },
  { name: 'Character', component: CharacterScreen, title: 'Character' },
  { name: 'Shop', component: ShopScreen, title: 'Shop' },
] as const;

function MainTabs({ navigation }: { navigation: any }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent2,
        tabBarInactiveTintColor: colors.mut2,
        tabBarStyle: { backgroundColor: '#0d0f1b', borderTopColor: colors.line, height: 64, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
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
      <Stack.Screen name="GuildDetail" component={GuildScreen} />
      <Stack.Screen name="ProgressDetail" component={ProgressScreen} />
      <Stack.Screen name="SocialDetail" component={SocialScreen} />
      <Stack.Screen name="Admin" component={AdminScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const hydrated = useGame(s => s.hydrated);
  const state = useGame(s => s.state);
  const hydrate = useGame(s => s.hydrate);
  const auth = useAuth(s => s.auth);
  const authReady = useAuth(s => s.ready);
  const bootstrap = useAuth(s => s.bootstrap);
  const [harden, setHarden] = useState<ReturnType<typeof hardeningOk> | null>(null);

  useEffect(() => {
    hydrate();
    bootstrap();
    // Run hardening gate (signature/tamper check).
    const h = hardeningOk();
    setHarden(h);
    // Non-blocking version check for APK updates.
    checkForUpdate().then(info => {
      if (info) {
        const { ToastAndroid } = require('react-native');
        ToastAndroid && ToastAndroid.show(`New version ${info.version} available`, ToastAndroid.SHORT);
        // In a nicer UX, show a modal with openUpdate(info).
      }
    });
  }, []);

  if (!hydrated || !authReady || !harden) return <Loader />;

  const signedIn = auth.status === 'signedIn';

  // Tampered / re-signed APK -> refuse to run.
  if (!harden.ok) return <TamperedScreen signals={harden.signals} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SecurityProvider>
        <View style={{ flex: 1 }}>
          {!signedIn ? (
            <AuthScreen />
          ) : state ? (
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          ) : (
            <OnboardingScreen />
          )}
          <ToastHost />
          <CelebrationHost />
        </View>
      </SecurityProvider>
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
