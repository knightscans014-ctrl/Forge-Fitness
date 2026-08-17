import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Alert } from 'react-native';
import { useGame } from './src/context/GameContext';
import { useAuth } from './src/context/AuthContext';
import { SecurityProvider } from './src/context/SecurityContext';
import { Loader } from './src/components/ui';
import { ToastHost } from './src/components/Toast';
import { AuraOverlay } from './src/components/effects';
import { Icon, TAB_ICONS } from './src/theme/icons';
import { colors } from './src/theme/colors';
import { hardeningOk } from './src/services/hardening';
import { checkForUpdate, openUpdate, VersionInfo } from './src/services/versionCheck';
import { isDeviceGenuine } from './src/services/integrity';
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
  // null = still checking, true = genuine, false = blocked.
  const [genuine, setGenuine] = useState<boolean | null>(null);
  const [integrityDone, setIntegrityDone] = useState(false);
  const [update, setUpdate] = useState<VersionInfo | null>(null);

  useEffect(() => {
    hydrate();
    bootstrap();
    // Run hardening gate (signature/tamper check).
    const h = hardeningOk();
    setHarden(h);

    // Play Integrity: verify genuine device + app install (server-confirmed).
    // Only blocks if the integrity module is active and reports not genuine.
    // A hung or unreachable check must never brick the app, so the boot gate
    // is released after a timeout and treated as "unknown" (not blocked).
    let settled = false;
    const finish = (ok: boolean | null) => {
      if (settled) return;
      settled = true;
      setGenuine(ok);
      setIntegrityDone(true);
    };
    const timer = setTimeout(() => finish(null), 6000);
    isDeviceGenuine()
      .then(ok => { clearTimeout(timer); finish(ok); })
      .catch(() => { clearTimeout(timer); finish(null); });

    // Non-blocking version check for APK updates.
    checkForUpdate().then(info => { if (info) setUpdate(info); }).catch(() => {});

    return () => clearTimeout(timer);
  }, []);

  const signedIn = auth.status === 'signedIn';

  // Once signed in, reconcile this device's save with the cloud copy.
  useEffect(() => {
    if (signedIn && hydrated) { useGame.getState().syncWithCloud(); }
  }, [signedIn, hydrated]);

  // Surface the update as an actionable toast rather than a dead-end message.
  useEffect(() => {
    if (!update) return;
    Alert.alert(
      'Update available',
      `Version ${update.version} is ready to install.`,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Update', onPress: () => { openUpdate(update); } },
      ],
    );
  }, [update]);

  // Wait for local data + auth + the tamper gate. Integrity resolves via
  // `integrityDone` so `genuine === null` (unknown) can no longer hang boot.
  if (!hydrated || !authReady || !harden || !integrityDone) return <Loader />;

  // Tampered / re-signed APK -> refuse to run.
  if (!harden.ok) return <TamperedScreen signals={harden.signals} />;
  // Play Integrity reports not genuine (root/modified) -> block.
  if (genuine === false) return <TamperedScreen signals={{ isRooted: true, isEmulator: false, isDebugger: false }} />;

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
