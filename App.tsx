import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGame } from './src/context/GameContext';
import { Loader } from './src/components/ui';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import MissionsScreen from './src/screens/MissionsScreen';
import BattleScreen from './src/screens/BattleScreen';
import CharacterScreen from './src/screens/CharacterScreen';
import LogScreen from './src/screens/LogScreen';
import GuildScreen from './src/screens/GuildScreen';
import SocialScreen from './src/screens/SocialScreen';
import ShopScreen from './src/screens/ShopScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import { colors } from './src/theme/colors';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Home: '🏠',
  Missions: '📜',
  Battle: '⚔️',
  Character: '🛡️',
  Log: '⚡',
  Guild: '👥',
  Progress: '📈',
  Social: '🏆',
  Shop: '🛍️',
};

function TabBarIcon({ name }: { name: string }) {
  return <Text style={{ fontSize: 20 }}>{ICONS[name]}</Text>;
}

function Tabs({ onNavigateToHome }: { onNavigateToHome: (tab: string) => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent2,
        tabBarInactiveTintColor: colors.mut,
        tabBarStyle: { backgroundColor: '#0d0f1b', borderTopColor: colors.line },
        tabBarIcon: () => <TabBarIcon name={route.name} />,
      })}
    >
      <Tab.Screen name="Home">
        {() => <HomeScreen onNavigate={onNavigateToHome} />}
      </Tab.Screen>
      <Tab.Screen name="Missions" component={MissionsScreen} />
      <Tab.Screen name="Battle" component={BattleScreen} />
      <Tab.Screen name="Character" component={CharacterScreen} />
      <Tab.Screen name="Log" component={LogScreen} />
      <Tab.Screen name="Guild" component={GuildScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Social" component={SocialScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const hydrated = useGame(s => s.hydrated);
  const state = useGame(s => s.state);
  const hydrate = useGame(s => s.hydrate);
  const [tab, setTab] = useState('Home');

  useEffect(() => { hydrate(); }, []);

  if (!hydrated) return <Loader />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {state ? <Tabs onNavigateToHome={t => setTab(t)} /> : <OnboardingScreen />}
    </SafeAreaProvider>
  );
}
