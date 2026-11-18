import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTasks } from '../context/TaskContext';
import { COLORS } from '../constants/theme';
import { saveTaskPhoto, deleteTaskPhoto } from '../utils/photoUtils';
import {
  saveTaskAttachment,
  deleteTaskAttachment,
  openTaskAttachment,
} from '../utils/attachmentUtils';
import {
  getCurrentPosition,
  requestLocationReminderPermissions,
  scheduleDateReminder,
  cancelDateReminder,
} from '../utils/reminderUtils';
import { reverseGeocodeOpenStreetMap } from '../utils/openStreetMapUtils';
import LocationMapPicker from '../components/LocationMapPicker';
import {
  getLocationReminderRegions,
  MAX_ACTIVE_LOCATION_REMINDERS,
} from '../utils/locationReminderRegions';
import { collaborationApi, taskApi } from '../services/api';

const PRIORITIES = ['Faible', 'Moyenne', 'Élevée'];
const STATUSES = ['À faire', 'Terminée'];

const createPhotoAttachment = (uri, asset = {}) => ({
  id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  name: asset.fileName || 'photo.jpg',
  uri,
  mimeType: asset.mimeType || 'image/jpeg',
  size: asset.fileSize || null,
  isPhoto: true,
});

const formatLocalDateTime = (date) => {
  if (!date) return '';
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Screen 4: Formulaire et opérations CRUD (Partie 3 & Partie 4)
 * Formulaire réutilisé pour l'ajout et la modification d'une tâche
 */
export default function TaskFormScreen({ route, navigation }) {
  const { mode = 'add', task } = route.params || {};
  const isEditing = mode === 'edit' && !!task;

  const { addTask, updateTask, deleteTask, users, currentUser, tasks } = useTasks();
  const canManage = !isEditing
    || Number(task?.creatorId ?? task?.creator_id) === Number(currentUser?.id);
  const availableObservers = users.filter(
    (user) => Number(user.id) !== Number(currentUser?.id)
  );

  const [title, setTitle] = useState(task ? task.title : '');
  const [description, setDescription] = useState(task ? task.description : '');
  const [priority, setPriority] = useState(task ? task.priority : 'Moyenne');
  const [status, setStatus] = useState(task ? task.status : 'À faire');
  const [errorTitle, setErrorTitle] = useState('');
  const [photoUri, setPhotoUri] = useState(
    () => task?.photoUri
      || (Array.isArray(task?.attachments)
        ? task.attachments.find((attachment) => attachment.isPhoto)?.uri
        : null)
      || null
  );
  const [downloadedPhoto, setDownloadedPhoto] = useState(null);
  const [photoLoadErrorId, setPhotoLoadErrorId] = useState(null);
  const [attachments, setAttachments] = useState(() => {
    const savedAttachments = Array.isArray(task?.attachments) ? task.attachments : [];
    if (!task?.photoUri || savedAttachments.some((attachment) => attachment.isPhoto)) {
      return savedAttachments;
    }

    return [
      ...savedAttachments,
      createPhotoAttachment(task.photoUri, { fileName: 'photo.jpg' }),
    ];
  });
  const photoAttachment = attachments.find((attachment) => attachment.isPhoto);
  const photoAttachmentId = photoAttachment?.id;
  const photoAttachmentDownloadUrl = photoAttachment?.downloadUrl;
  const photoAttachmentName = photoAttachment?.name;
  const photoPreviewUri = photoUri || (
    downloadedPhoto && downloadedPhoto.attachmentId === photoAttachmentId
      ? downloadedPhoto.uri
      : null
  );
  const photoLoadError = photoLoadErrorId === photoAttachmentId;
  const fileAttachments = attachments.filter((attachment) => !attachment.isPhoto);
  const [draftTaskId] = useState(() => task?.id || `draft-${Date.now()}`);
  const [observerIds, setObserverIds] = useState([]);
  useEffect(() => {
    if (!isEditing || !task?.id) return;
    collaborationApi.getDetails(task.id).then((details) => {
      setObserverIds(details.observers
        .filter((observer) => Number(observer.id) !== Number(currentUser?.id))
        .map((observer) => observer.id));
    }).catch(() => {});
  }, [isEditing, task?.id, currentUser?.id]);
  useEffect(() => {
    if (photoUri || !photoAttachmentId || !photoAttachmentDownloadUrl) return undefined;

    let active = true;
    let objectUrl = null;
    taskApi.downloadAttachment({
      id: photoAttachmentId,
      downloadUrl: photoAttachmentDownloadUrl,
      name: photoAttachmentName,
    })
      .then((uri) => {
        objectUrl = uri;
        if (active) {
          setDownloadedPhoto({ attachmentId: photoAttachmentId, uri });
        } else if (Platform.OS === 'web') {
          URL.revokeObjectURL(uri);
        }
      })
      .catch((error) => {
        if (active) {
          console.error('Unable to load task photo:', error);
          setPhotoLoadErrorId(photoAttachmentId);
        }
      });

    return () => {
      active = false;
      if (Platform.OS === 'web' && objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoAttachmentDownloadUrl, photoAttachmentId, photoAttachmentName, photoUri]);
  const [reminderAt, setReminderAt] = useState(
    task?.reminderAt ? new Date(task.reminderAt) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [locationReminder, setLocationReminder] = useState(
    task?.locationReminder || null
  );
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [locationMapSelection, setLocationMapSelection] = useState(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const selectedObserverCount = availableObservers.filter((user) => (
    observerIds.some((id) => Number(id) === Number(user.id))
  )).length;

  const handleDateChange = (_event, selectedDate) => {
    setShowDatePicker(false);
    if (!selectedDate) return;

    setReminderAt((current) => {
      const next = new Date(current || new Date());
      next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      return next;
    });
  };

  const handleTimeChange = (_event, selectedTime) => {
    setShowTimePicker(false);
    if (!selectedTime) return;

    setReminderAt((current) => {
      const next = new Date(current || new Date());
      next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      return next;
    });
  };

  const handleOpenLocationMap = () => {
    setLocationMapSelection(locationReminder);
    setShowLocationMap(true);
  };

  const handleConfirmLocationMap = async () => {
    if (!locationMapSelection) return;

    setIsResolvingLocation(true);
    let name = null;
    let addressLookupFailed = false;
    try {
      name = await reverseGeocodeOpenStreetMap(
        locationMapSelection.latitude,
        locationMapSelection.longitude
      );
    } catch (_error) {
      addressLookupFailed = true;
    } finally {
      setIsResolvingLocation(false);
    }

    if (!name) {
      Alert.alert(
        addressLookupFailed ? 'Adresse indisponible' : 'Adresse introuvable',
        addressLookupFailed
          ? 'Le point sera enregistré avec ses coordonnées, mais son adresse n’a pas pu être récupérée.'
          : 'Le point sera enregistré avec ses coordonnées uniquement.'
      );
    }
    setLocationReminder({
      ...locationMapSelection,
      name: name || 'Position sélectionnée',
      radius: 200,
    });
    setShowLocationMap(false);
  };

  const handleCurrentLocation = async () => {
    const position = await getCurrentPosition();
    if (!position) {
      Alert.alert('Permission requise', "Autorisez l'accès à la position.");
      return;
    }
    setLocationReminder(position);
    setLocationMapSelection(position);
    setShowLocationMap(false);
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la caméra pour prendre une photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      mediaTypes: ['images'],
    });

    if (result.canceled) return;

    try {
      const asset = result.assets[0];
      const savedUri = await saveTaskPhoto(asset.uri, draftTaskId);
      if (photoUri) {
        await deleteTaskPhoto(photoUri);
      }
      setDownloadedPhoto(null);
      setPhotoLoadErrorId(null);
      setPhotoUri(savedUri);
      setAttachments((current) => [
        ...current.filter((attachment) => !attachment.isPhoto),
        createPhotoAttachment(savedUri, asset),
      ]);
    } catch (_error) {
      Alert.alert('Erreur', "La photo n'a pas pu être enregistrée.");
    }
  };

  const handleRemovePhoto = async () => {
    if (photoUri) {
      await deleteTaskPhoto(photoUri);
    }
    setDownloadedPhoto(null);
    setPhotoLoadErrorId(null);
    setPhotoUri(null);
    setAttachments((current) => current.filter((attachment) => !attachment.isPhoto));
  };

  const handleAddAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
    });

    if (result.canceled) return;

    try {
      const savedAttachments = await Promise.all(
        result.assets.map((asset) => saveTaskAttachment(asset, draftTaskId))
      );
      setAttachments((current) => [
        ...current,
        ...savedAttachments.filter((attachment) => attachment !== null),
      ]);
    } catch (_error) {
      Alert.alert('Erreur', "Les fichiers n'ont pas pu être enregistrés.");
    }
  };

  const handleRemoveAttachment = async (attachment) => {
    await deleteTaskAttachment(attachment);
    setAttachments((current) =>
      current.filter((item) => item.id !== attachment.id)
    );
  };

  const handleSave = async () => {
    if (!canManage) {
      Alert.alert('Accès refusé', 'Seul le créateur peut modifier cette tâche.');
      return;
    }

    // Validation des champs (Partie 3)
    if (!title.trim()) {
      setErrorTitle('Le titre est obligatoire');
      return;
    }

    if (title.trim().length < 3) {
      setErrorTitle('Le titre doit contenir au moins 3 caractères');
      return;
    }

    setErrorTitle('');

    try {
      const activeLocationReminderCount = getLocationReminderRegions(
        tasks.filter((item) => item.id !== task?.id),
        currentUser?.id
      ).length;
      if (
        locationReminder
        && status === 'À faire'
        && activeLocationReminderCount >= MAX_ACTIVE_LOCATION_REMINDERS
      ) {
        Alert.alert(
          'Limite de rappels atteinte',
          `iOS permet au maximum ${MAX_ACTIVE_LOCATION_REMINDERS} rappels de lieu actifs. Supprimez-en un avant d’en ajouter un autre.`
        );
        return;
      }

      if (locationReminder && Platform.OS !== 'web') {
        const permissionsGranted = await requestLocationReminderPermissions();
        if (!permissionsGranted) {
          Alert.alert(
            'Rappel en arrière-plan désactivé',
            'La tâche sera enregistrée, mais le rappel de lieu ne pourra pas fonctionner sans les autorisations de position et de notification.'
          );
        }
      } else if (locationReminder) {
        Alert.alert(
          'Rappel de lieu indisponible',
          'Les rappels de lieu en arrière-plan sont disponibles uniquement sur Android et iOS.'
        );
      }

      let dateNotificationId = isEditing ? task.dateNotificationId || null : null;
      if (reminderAt) {
        const reminderTask = {
          id: isEditing ? task.id : draftTaskId,
          title: title.trim(),
          reminderAt: reminderAt.toISOString(),
          dateNotificationId,
        };
        dateNotificationId = await scheduleDateReminder(reminderTask);
      } else if (dateNotificationId) {
        await cancelDateReminder(dateNotificationId);
        dateNotificationId = null;
      }

      if (isEditing) {
        await updateTask(task.id, {
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          photoUri,
          attachments,
          reminderAt: reminderAt ? reminderAt.toISOString() : null,
          locationReminder,
          dateNotificationId,
          observerIds,
        });
        await collaborationApi.updateObservers(task.id, observerIds).catch(() => {});
        navigation.goBack();
      } else {
        await addTask({
          id: draftTaskId,
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
          photoUri,
          attachments,
          reminderAt: reminderAt ? reminderAt.toISOString() : null,
          locationReminder,
          dateNotificationId,
          observerIds,
        });
        navigation.goBack();
      }
    } catch (_error) {
      Alert.alert('Erreur', "Une erreur s'est produite lors de l'enregistrement.");
    }
  };

  const handleDelete = () => {
    if (!canManage) {
      Alert.alert('Accès refusé', 'Seul le créateur peut supprimer cette tâche.');
      return;
    }
    Alert.alert(
      'Supprimer la tâche',
      'Êtes-vous sûr de vouloir supprimer cette tâche ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(task.id);
            navigation.popToTop();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#1E293B" />
            <Text style={styles.headerTitle}>
              {isEditing ? 'Modifier une tâche' : 'Ajouter une tâche'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Titre Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Titre <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errorTitle ? styles.inputError : null]}
              placeholder="Ex. Préparer la présentation"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errorTitle) setErrorTitle('');
              }}
            />
            {errorTitle ? <Text style={styles.errorText}>{errorTitle}</Text> : null}
          </View>

          {/* Description Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Détails de la tâche..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Priorité Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Priorité</Text>
            <View style={styles.selectorRow}>
              {PRIORITIES.map((p) => {
                const isSelected = priority === p;
                const pColor = COLORS.priority[p];
                return (
                  <TouchableOpacity
                    key={p}
                    activeOpacity={0.8}
                    onPress={() => setPriority(p)}
                    style={[
                      styles.choiceButton,
                      {
                        backgroundColor: isSelected ? pColor.background : '#F8FAFC',
                        borderColor: isSelected ? pColor.color : '#E2E8F0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        {
                          color: isSelected ? pColor.color : '#64748B',
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Statut Selector (Shown when editing or optional toggle) */}
          {isEditing && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Statut</Text>
              <View style={styles.selectorRow}>
                {STATUSES.map((s) => {
                  const isSelected = status === s;
                  const sColor = COLORS.status[s];
                  return (
                    <TouchableOpacity
                      key={s}
                      activeOpacity={0.8}
                      onPress={() => setStatus(s)}
                      style={[
                        styles.choiceButton,
                        {
                          backgroundColor: isSelected ? sColor.background : '#F8FAFC',
                          borderColor: isSelected ? sColor.color : '#E2E8F0',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          {
                            color: isSelected ? sColor.color : '#64748B',
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Task observers */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Choisir les observateurs</Text>
            <Text style={styles.observerHelp}>
              Les personnes sélectionnées peuvent consulter et commenter cette tâche.
            </Text>
            <Text style={styles.observerCount}>
              {selectedObserverCount} sélectionné{selectedObserverCount > 1 ? 's' : ''}
            </Text>
            {availableObservers.length > 0 ? availableObservers.map((user) => {
                const selected = observerIds.some((id) => Number(id) === Number(user.id));
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.observerRow, selected && styles.observerRowSelected]}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${user.name}, ${user.email}`}
                    onPress={() => setObserverIds((current) =>
                      selected
                        ? current.filter((id) => Number(id) !== Number(user.id))
                        : [...current, user.id]
                    )}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selected ? COLORS.primary : '#94A3B8'}
                    />
                    <View style={styles.observerText}>
                      <Text style={styles.observerName}>{user.name}</Text>
                      <Text style={styles.observerEmail}>{user.email}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }) : (
                <Text style={styles.observerEmpty}>
                  Aucun autre utilisateur disponible.
                </Text>
              )}
          </View>

          {/* Photo attachment */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Photo</Text>
            {photoPreviewUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoPreviewUri }} style={styles.photoPreview} />
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={styles.photoActionButton}
                    activeOpacity={0.8}
                    onPress={handleTakePhoto}
                  >
                    <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
                    <Text style={[styles.photoActionText, { color: COLORS.primary }]}>
                      Reprendre
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoActionButton}
                    activeOpacity={0.8}
                    onPress={handleRemovePhoto}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    <Text style={[styles.photoActionText, { color: COLORS.danger }]}>
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : photoLoadError ? (
              <View>
                <Text style={styles.attachmentMeta}>Impossible de charger la photo.</Text>
                <TouchableOpacity
                  style={styles.cameraButton}
                  activeOpacity={0.8}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
                  <Text style={styles.cameraButtonText}>Choisir une nouvelle photo</Text>
                </TouchableOpacity>
              </View>
            ) : photoAttachment?.downloadUrl ? (
              <Text style={styles.attachmentMeta}>Chargement de la photo…</Text>
            ) : (
              <TouchableOpacity
                style={styles.cameraButton}
                activeOpacity={0.8}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
                <Text style={styles.cameraButtonText}>Prendre une photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* General file attachments */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Fichiers joints</Text>
            {fileAttachments.map((attachment) => (
              <View key={attachment.id} style={styles.attachmentRow}>
                <TouchableOpacity
                  style={styles.attachmentOpenButton}
                  activeOpacity={0.7}
                  onPress={async () => {
                    try {
                      await openTaskAttachment(attachment);
                    } catch (_error) {
                      Alert.alert('Erreur', "Impossible d'ouvrir ce fichier.");
                    }
                  }}
                >
                  <Ionicons name="document-outline" size={20} color={COLORS.primary} />
                  <View style={styles.attachmentTextContainer}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <Text style={styles.attachmentMeta}>
                      {attachment.mimeType || 'Fichier'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.attachmentDeleteButton}
                  activeOpacity={0.7}
                  onPress={() => handleRemoveAttachment(attachment)}
                >
                  <Ionicons name="close-circle-outline" size={22} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.cameraButton}
              activeOpacity={0.8}
              onPress={handleAddAttachment}
            >
              <Ionicons name="attach-outline" size={22} color={COLORS.primary} />
              <Text style={styles.cameraButtonText}>Ajouter des fichiers</Text>
            </TouchableOpacity>
          </View>

          {/* Date reminder */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Rappel à une date et heure</Text>
            {Platform.OS !== 'web' ? (
              <View style={styles.reminderButtons}>
                <TouchableOpacity
                  style={styles.reminderButton}
                  activeOpacity={0.8}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.reminderButtonText}>
                    {reminderAt
                      ? reminderAt.toLocaleDateString('fr-FR')
                      : 'Choisir la date'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reminderButton}
                  activeOpacity={0.8}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.reminderButtonText}>
                    {reminderAt
                      ? reminderAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      : 'Choisir l’heure'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              React.createElement('input', {
                type: 'datetime-local',
                'aria-label': 'Date et heure du rappel',
                value: formatLocalDateTime(reminderAt),
                onChange: (event) => {
                  const value = event.target.value;
                  const parsed = value ? new Date(value) : null;
                  setReminderAt(parsed && !Number.isNaN(parsed.getTime()) ? parsed : null);
                },
                style: {
                  backgroundColor: '#FFFFFF',
                  borderColor: '#CBD5E1',
                  borderRadius: 10,
                  borderStyle: 'solid',
                  borderWidth: 1,
                  boxSizing: 'border-box',
                  color: '#0F172A',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  height: 48,
                  padding: '0 14px',
                  width: '100%',
                },
              })
            )}
            {reminderAt ? (
              <TouchableOpacity
                style={styles.clearReminderButton}
                activeOpacity={0.7}
                onPress={() => setReminderAt(null)}
              >
                <Text style={styles.clearReminderText}>Supprimer le rappel date/heure</Text>
              </TouchableOpacity>
            ) : null}
            {showDatePicker ? (
              <DateTimePicker
                value={reminderAt || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            ) : null}
            {showTimePicker ? (
              <DateTimePicker
                value={reminderAt || new Date()}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            ) : null}
          </View>

          {/* Location reminder */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Rappel à une position</Text>
            {locationReminder ? (
              <View style={styles.locationSelected}>
                <Ionicons name="location" size={20} color={COLORS.success} />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationName} numberOfLines={2}>
                    {locationReminder.name}
                  </Text>
                  <Text style={styles.locationMeta}>
                    {locationReminder.latitude.toFixed(5)}, {locationReminder.longitude.toFixed(5)}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setLocationReminder(null)}
                >
                  <Ionicons name="close-circle-outline" size={22} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.cameraButton}
              activeOpacity={0.8}
              onPress={handleOpenLocationMap}
            >
              <Ionicons name="map-outline" size={21} color={COLORS.primary} />
              <Text style={styles.cameraButtonText}>
                {locationReminder ? 'Modifier le lieu sur la carte' : 'Choisir sur la carte'}
              </Text>
            </TouchableOpacity>
            {showLocationMap ? (
              <View style={styles.locationMapContainer}>
                <Text style={styles.locationMapHint}>
                  Touchez la carte pour choisir le point du rappel.
                </Text>
                <LocationMapPicker
                  selection={locationMapSelection}
                  onSelectionChange={setLocationMapSelection}
                />
                <View style={styles.locationMapActions}>
                  <TouchableOpacity
                    style={styles.locationMapCancelButton}
                    activeOpacity={0.8}
                    onPress={() => setShowLocationMap(false)}
                  >
                    <Text style={styles.locationMapCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.locationMapConfirmButton,
                      (!locationMapSelection || isResolvingLocation)
                        && styles.locationMapConfirmButtonDisabled,
                    ]}
                    activeOpacity={0.8}
                    disabled={!locationMapSelection || isResolvingLocation}
                    onPress={handleConfirmLocationMap}
                  >
                    <Text style={styles.locationMapConfirmText}>
                      {isResolvingLocation ? 'Recherche...' : 'Utiliser ce lieu'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.cameraButton}
              activeOpacity={0.8}
              onPress={handleCurrentLocation}
            >
              <Ionicons name="navigate-outline" size={21} color={COLORS.primary} />
              <Text style={styles.cameraButtonText}>Utiliser ma position</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.85}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>

            {/* Delete Button (only in edit mode) */}
            {isEditing && (
              <TouchableOpacity
                style={styles.deleteButton}
                activeOpacity={0.85}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Supprimer</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: {
    fontSize: 14,
  },
  photoPreviewContainer: {
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoPreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#F1F5F9',
  },
  photoActions: {
    flexDirection: 'row',
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  observerHelp: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 8,
  },
  observerCount: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  observerEmpty: {
    color: '#64748B',
    fontSize: 13,
    paddingVertical: 10,
  },
  observerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  observerRowSelected: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  observerText: {
    marginLeft: 10,
  },
  observerName: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  observerEmail: {
    color: '#94A3B8',
    fontSize: 11,
  },
  cameraButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  cameraButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  attachmentOpenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  attachmentTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  attachmentName: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
  },
  attachmentMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  attachmentDeleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reminderButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  reminderButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  reminderButtonText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '600',
  },
  clearReminderButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  clearReminderText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  locationSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  locationTextContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  locationName: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
  locationMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  locationMapContainer: {
    marginTop: 10,
  },
  locationMapHint: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 8,
  },
  locationMapActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  locationMapCancelButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  locationMapCancelText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  locationMapConfirmButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  locationMapConfirmButtonDisabled: {
    opacity: 0.5,
  },
  locationMapConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonsContainer: {
    marginTop: 10,
    gap: 12,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
