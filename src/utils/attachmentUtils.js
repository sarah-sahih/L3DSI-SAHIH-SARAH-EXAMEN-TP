import { Platform, Linking } from 'react-native';
import * as Sharing from 'expo-sharing';
import {
  documentDirectory,
  makeDirectoryAsync,
  copyAsync,
  getInfoAsync,
  deleteAsync,
} from 'expo-file-system/legacy';
import { taskApi } from '../services/api';

const createClientId = () =>
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getTaskAttachmentDirectory = () => {
  if (!documentDirectory) return null;
  return `${documentDirectory}mytasks/attachments/`;
};

export const saveTaskAttachment = async (asset, taskId) => {
  if (!asset?.uri) return null;

  if (Platform.OS === 'web') {
    return {
      id: createClientId(),
      name: asset.name,
      uri: asset.uri,
      mimeType: asset.mimeType || 'application/octet-stream',
      size: asset.size || null,
    };
  }

  const directory = getTaskAttachmentDirectory();
  if (!directory) return null;

  await makeDirectoryAsync(directory, { intermediates: true });

  const safeName = asset.name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
  const destination = `${directory}${taskId}-${Date.now()}-${safeName}`;
  await copyAsync({ from: asset.uri, to: destination });

  return {
    id: createClientId(),
    name: asset.name,
    uri: destination,
    mimeType: asset.mimeType || 'application/octet-stream',
    size: asset.size || null,
  };
};

export const openTaskAttachment = async (attachment) => {
  if (!attachment) return false;
  const isRemoteDownload = !attachment.uri && attachment.downloadUrl;
  const uri = isRemoteDownload
    ? await taskApi.downloadAttachment(attachment)
    : attachment.uri;
  if (!uri) return false;

  if (Platform.OS === 'web') {
    if (isRemoteDownload) {
      const link = document.createElement('a');
      link.href = uri;
      link.download = attachment.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(uri), 1000);
    } else {
      await Linking.openURL(uri);
    }
    return true;
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: attachment.mimeType,
      dialogTitle: attachment.name,
    });
    return true;
  }

  await Linking.openURL(uri);
  return true;
};

export const deleteTaskAttachment = async (attachment) => {
  if (!attachment?.uri || Platform.OS === 'web') return;

  try {
    const info = await getInfoAsync(attachment.uri);
    if (info.exists) {
      await deleteAsync(attachment.uri, { idempotent: true });
    }
  } catch {
    // The file may already have been removed by the operating system.
  }
};
