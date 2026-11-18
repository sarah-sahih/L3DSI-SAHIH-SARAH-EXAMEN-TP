import { Platform } from 'react-native';
import {
  documentDirectory,
  makeDirectoryAsync,
  copyAsync,
  getInfoAsync,
  deleteAsync,
} from 'expo-file-system/legacy';

export const getTaskPhotoDirectory = () => {
  if (!documentDirectory) return null;
  return `${documentDirectory}mytasks/photos/`;
};

export const saveTaskPhoto = async (sourceUri, taskId) => {
  if (!sourceUri) return null;
  if (Platform.OS === 'web' || !documentDirectory) return sourceUri;

  const directory = getTaskPhotoDirectory();
  await makeDirectoryAsync(directory, { intermediates: true });

  const extension = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
  const safeExtension = /^[a-z0-9]+$/i.test(extension) ? extension : 'jpg';
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const destination = `${directory}${taskId}-${uniqueSuffix}.${safeExtension}`;

  await copyAsync({ from: sourceUri, to: destination });
  return destination;
};

export const deleteTaskPhoto = async (photoUri) => {
  if (!photoUri || Platform.OS === 'web') return;

  try {
    const info = await getInfoAsync(photoUri);
    if (info.exists) {
      await deleteAsync(photoUri, { idempotent: true });
    }
  } catch {
    // The local file may already have been removed by the operating system.
  }
};
