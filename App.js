import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { TaskProvider, useTasks } from './src/context/TaskContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingScreen from './src/components/LoadingScreen';

function MainApp() {
  const { loading } = useTasks();

  // Partie 5: Indicateur de chargement pendant la lecture AsyncStorage
  if (loading) {
    return <LoadingScreen message="Chargement de vos tâches..." />;
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TaskProvider>
        <StatusBar style="dark" />
        <MainApp />
      </TaskProvider>
    </SafeAreaProvider>
  );
}
