// Wrapper for detail screens pushed on the stack — provides a back button + ScrollView.
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Icon } from '../theme/icons';
import { colors } from '../theme/colors';

export function DetailScreen({ children, title }: { children: React.ReactNode; title: string }) {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.screen}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: colors.ink, fontWeight: '900', fontSize: 18 },
  spacer: { width: 40 },
  pad: { padding: 16, paddingBottom: 40 },
});
