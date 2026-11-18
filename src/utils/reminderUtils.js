import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_GEOFENCING_TASK } from '../services/locationGeofencing';
import { getLocationReminderRegions } from './locationReminderRegions';

export const scheduleDateReminder = async (task) => {
  if (!task.reminderAt || Platform.OS === 'web') return null;

  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const triggerDate = new Date(task.reminderAt);
  if (Number.isNaN(triggerDate.getTime()) || triggerDate.getTime() <= Date.now()) {
    return null;
  }

  await Notifications.cancelScheduledNotificationAsync(task.dateNotificationId).catch(() => {});

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rappel de tâche',
      body: task.title,
      data: { taskId: task.id, type: 'date' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return notificationId;
};

export const cancelDateReminder = async (notificationId) => {
  if (!notificationId || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
};

export const getCurrentPosition = async () => {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    name: 'Ma position actuelle',
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    radius: 200,
  };
};

export const requestLocationReminderPermissions = async () => {
  if (Platform.OS === 'web') return false;

  const notificationPermission = await Notifications.getPermissionsAsync();
  if (notificationPermission.status !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    if (requestedPermission.status !== 'granted') return false;
  }

  const foregroundPermission = await Location.getForegroundPermissionsAsync();
  if (!foregroundPermission.granted) {
    const requestedPermission = await Location.requestForegroundPermissionsAsync();
    if (!requestedPermission.granted) return false;
  }

  const backgroundPermission = await Location.getBackgroundPermissionsAsync();
  if (backgroundPermission.granted) return true;

  const shouldRequestBackgroundAccess = await new Promise((resolve) => {
    Alert.alert(
      'Autoriser les rappels en arrière-plan',
      'MyTasks utilise votre position uniquement pour déclencher les rappels de lieu choisis pour vos tâches, même lorsque l’application est fermée.',
      [
        { text: 'Plus tard', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continuer', onPress: () => resolve(true) },
      ],
      { cancelable: false }
    );
  });
  if (!shouldRequestBackgroundAccess) return false;

  const requestedBackgroundPermission = await Location.requestBackgroundPermissionsAsync();
  return requestedBackgroundPermission.granted;
};

export const syncLocationReminderGeofences = async (tasks, userId) => {
  if (Platform.OS === 'web') return;

  const regions = getLocationReminderRegions(tasks, userId);
  const isStarted = await Location.hasStartedGeofencingAsync(LOCATION_GEOFENCING_TASK);
  if (regions.length === 0) {
    if (isStarted) {
      await Location.stopGeofencingAsync(LOCATION_GEOFENCING_TASK);
    }
    return;
  }

  const foregroundPermission = await Location.getForegroundPermissionsAsync();
  if (!foregroundPermission.granted) {
    if (isStarted) {
      await Location.stopGeofencingAsync(LOCATION_GEOFENCING_TASK);
    }
    return;
  }

  if (isStarted) {
    const options = await TaskManager.getTaskOptionsAsync(LOCATION_GEOFENCING_TASK);
    const registeredRegions = options?.regions || [];
    const normalizeRegions = (items) => items
      .map(({ identifier, latitude, longitude, radius, notifyOnEnter, notifyOnExit }) => ({
        identifier,
        latitude,
        longitude,
        radius,
        notifyOnEnter,
        notifyOnExit,
      }))
      .sort((left, right) => left.identifier.localeCompare(right.identifier));

    if (
      JSON.stringify(normalizeRegions(registeredRegions))
      === JSON.stringify(normalizeRegions(regions))
    ) {
      return;
    }
  }

  await Location.startGeofencingAsync(LOCATION_GEOFENCING_TASK, regions);
};

export const clearLocationReminderGeofences = async () => {
  if (Platform.OS === 'web') return;
  if (await Location.hasStartedGeofencingAsync(LOCATION_GEOFENCING_TASK)) {
    await Location.stopGeofencingAsync(LOCATION_GEOFENCING_TASK);
  }
};

export const isWithinLocationReminder = (reminder, position) => {
  if (
    !Number.isFinite(Number(reminder?.latitude))
    || !Number.isFinite(Number(reminder?.longitude))
    || !position
  ) return false;

  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(reminder.latitude - position.coords.latitude);
  const longitudeDelta = toRadians(reminder.longitude - position.coords.longitude);
  const latitudeOne = toRadians(position.coords.latitude);
  const latitudeTwo = toRadians(reminder.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2;
  const distance = 2 * earthRadius * Math.asin(Math.sqrt(haversine));

  return distance <= (reminder.radius || 200);
};
