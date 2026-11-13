import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/theme';

/**
 * LoadingScreen Component (Partie 5)
 * Displays while reading data from AsyncStorage on application start
 */
export default function LoadingScreen({ message = 'Chargement de vos tâches...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  spinner: {
    transform: [{ scale: 1.3 }],
    marginBottom: 20,
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
});
