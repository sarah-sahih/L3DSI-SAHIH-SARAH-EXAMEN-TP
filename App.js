import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { TaskProvider, useTasks } from './src/context/TaskContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingScreen from './src/components/LoadingScreen';
import AuthScreen from './src/screens/AuthScreen';
import * as Notifications from 'expo-notifications';

const navigationRef = createNavigationContainerRef();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function MainApp() {
  const { loading, currentUser, authenticate, markNotificationRead } = useTasks();
  const [pendingNotification, setPendingNotification] = useState(null);
  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      setPendingNotification(lastResponse.notification.request.content.data);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      setPendingNotification(response.notification.request.content.data);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setNavigationReady(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const taskId = pendingNotification?.taskId;
    if (
      !taskId
      || !currentUser
      || loading
      || !navigationReady
      || !navigationRef.isReady()
    ) {
      return;
    }

    navigationRef.navigate('TaskDetail', { taskId: String(taskId) });
    if (pendingNotification.notificationId) {
      void markNotificationRead(pendingNotification.notificationId).catch((error) => {
        console.error('Unable to mark the opened notification as read:', error);
      });
    }
    Notifications.clearLastNotificationResponse();
    setPendingNotification(null);
  }, [currentUser, loading, markNotificationRead, navigationReady, pendingNotification]);

  // Partie 5: Indicateur de chargement pendant la lecture AsyncStorage
  if (loading) {
    return <LoadingScreen message="Chargement de vos tâches..." />;
  }

  if (!currentUser) {
    return <AuthScreen onAuthenticate={authenticate} />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setNavigationReady(true)}
    >
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
