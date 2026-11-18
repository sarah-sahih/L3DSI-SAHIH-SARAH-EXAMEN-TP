import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_GEOFENCING_TASK = 'mytasks-location-geofencing';

const AUTH_USER_KEY = '@mytasks_auth_user_v1';
const STORAGE_KEY = '@mytasks_data_v1';

if (Platform.OS !== 'web') {
  TaskManager.defineTask(LOCATION_GEOFENCING_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Location geofencing task failed:', error.message);
      return;
    }

    const { eventType, region } = data || {};
    if (eventType !== Location.GeofencingEventType.Enter || !region?.identifier) {
      return;
    }

    const userValue = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (!userValue) return;

    const user = JSON.parse(userValue);
    const taskValue = await AsyncStorage.getItem(`${STORAGE_KEY}:${user.id}`);
    if (!taskValue) return;

    const tasks = JSON.parse(taskValue);
    const task = tasks.find(
      (item) => item.id === region.identifier
        && item.status === 'À faire'
        && Number(item.creatorId ?? item.creator_id) === Number(user.id)
        && item.locationReminder
    );
    if (!task) return;

    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rappel à proximité',
        body: task.title,
        data: { taskId: task.id, type: 'location' },
      },
      trigger: null,
    });
  });
}
