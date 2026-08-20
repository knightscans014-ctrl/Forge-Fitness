// Navigation types.
//
// These live outside App.tsx so screens can import them without pulling in the
// whole app entry point (which would be a circular import). Screens used to
// type navigation as `any`, which meant a typo in a route name -- or navigating
// to a screen that had been deleted -- compiled cleanly and failed at runtime.

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

/** Detail screens pushed on top of the tab bar. */
export type RootStackParamList = {
  Main: undefined;
  LogDetail: undefined;
  SessionLive: undefined;
  TrialsDetail: undefined;
  ProgressDetail: undefined;
};

/** The five tabs. Keys must match the `name` values in App.tsx's TABS. */
export type MainTabParamList = {
  Home: undefined;
  Quests: undefined;
  Battle: undefined;
  Character: undefined;
  Shop: undefined;
};

/**
 * Navigation prop for screens that can reach both the stack and the tabs.
 * HomeScreen does exactly this: its quick-action grid jumps to sibling tabs
 * ('Quests', 'Battle') and to pushed detail screens ('LogDetail') alike.
 */
export type AppNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

/** Props for a screen registered directly on the stack. */
export type StackScreenProps<T extends keyof RootStackParamList> = {
  navigation: NativeStackNavigationProp<RootStackParamList, T>;
};
