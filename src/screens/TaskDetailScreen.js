import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  Linking,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import { COLORS } from '../constants/theme';
import { openTaskAttachment } from '../utils/attachmentUtils';
import { collaborationApi, taskApi } from '../services/api';

/**
 * Screen 3: Détails d'une tâche (Partie 4)
 * Informations complètes, modification et suppression
 */
export default function TaskDetailScreen({ route, navigation }) {
  const { taskId } = route.params || {};
  const { tasks, deleteTask, toggleTaskStatus, currentUser, refreshNotifications } = useTasks();

  const task = tasks.find((t) => t.id === taskId);
  const photoAttachment = task?.attachments?.find((attachment) => attachment.isPhoto);
  const localPhotoUri = photoAttachment?.uri || task?.photoUri;
  const photoAttachmentId = photoAttachment?.id;
  const photoAttachmentDownloadUrl = photoAttachment?.downloadUrl;
  const photoAttachmentName = photoAttachment?.name;
  const [downloadedPhoto, setDownloadedPhoto] = useState(null);
  const [photoLoadErrorId, setPhotoLoadErrorId] = useState(null);
  const displayedPhotoUri = localPhotoUri || (
    downloadedPhoto && downloadedPhoto.attachmentId === photoAttachmentId
      ? downloadedPhoto.uri
      : null
  );
  const photoLoadError = photoLoadErrorId === photoAttachmentId;
  const [collaboration, setCollaboration] = useState({
    creator: null,
    observers: [],
    comments: [],
  });
  const [commentBody, setCommentBody] = useState('');

  useEffect(() => {
    if (!taskId) return;
    collaborationApi.getDetails(taskId).then(setCollaboration).catch(() => {});
  }, [taskId, currentUser?.id]);

  useEffect(() => {
    if (!taskId || localPhotoUri || !photoAttachmentId || !photoAttachmentDownloadUrl) {
      return undefined;
    }

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
  }, [
    localPhotoUri,
    photoAttachmentDownloadUrl,
    photoAttachmentId,
    photoAttachmentName,
    taskId,
  ]);

  const handleAddComment = async () => {
    if (!commentBody.trim() || !currentUser) return;
    try {
      await collaborationApi.addComment(taskId, commentBody.trim());
      setCommentBody('');
      const details = await collaborationApi.getDetails(taskId);
      setCollaboration(details);
      await refreshNotifications();
    } catch (error) {
      Alert.alert('Commentaire refusé', error.message);
    }
  };

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
          <Text style={styles.notFoundText}>Tâche introuvable ou supprimée.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Retourner à la liste</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const priorityStyle = COLORS.priority[task.priority] || COLORS.priority.Moyenne;
  const statusStyle = COLORS.status[task.status] || COLORS.status['À faire'];

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la tâche',
      'Êtes-vous sûr de vouloir supprimer définitivement cette tâche ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(task.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const isCompleted = task.status === 'Terminée';
  const isCreator = Number(task.creatorId ?? task.creator_id) === Number(currentUser?.id);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
          <Text style={styles.headerTitle}>{"Détails d'une tâche"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Detail Card matching screenshot */}
        <View
          style={[
            styles.card,
            { borderLeftColor: priorityStyle.color, borderLeftWidth: 6 },
          ]}
        >
          {/* Title */}
          <Text style={styles.title}>{task.title}</Text>

          {/* Badges */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: priorityStyle.background }]}>
              <Text style={[styles.badgeText, { color: priorityStyle.color }]}>
                {task.priority}
              </Text>
            </View>

            <View style={[styles.badge, { backgroundColor: statusStyle.background }]}>
              <Text style={[styles.badgeText, { color: statusStyle.color }]}>
                {task.status}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.descriptionLabel}>Description</Text>
          <Text style={styles.description}>
            {task.description || 'Aucune description fournie.'}
          </Text>

          {/* Creation Date */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color="#64748B" />
            <Text style={styles.dateText}>Date de création {task.createdAt}</Text>
          </View>
          <View style={styles.creatorRow}>
            <Ionicons name="person-circle-outline" size={16} color="#64748B" />
            <Text style={styles.creatorText}>
              Créateur : {collaboration.creator?.name || (isCreator ? currentUser?.name : 'Chargement...')}
            </Text>
          </View>
        </View>

        {displayedPhotoUri || photoLoadError ? (
          <View style={styles.photoCard}>
            <Text style={styles.photoLabel}>Photo</Text>
            {displayedPhotoUri ? (
              <Image
                source={{ uri: displayedPhotoUri }}
                style={styles.photo}
              />
            ) : (
              <Text style={styles.emptyText}>Impossible de charger la photo.</Text>
            )}
          </View>
        ) : null}

        <View style={styles.collaborationCard}>
          <Text style={styles.collaborationTitle}>Observateurs</Text>
          {collaboration.observers.length > 0 ? (
            collaboration.observers.map((observer) => (
              <View key={observer.id} style={styles.observerRow}>
                <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.observerText}>{observer.name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucun observateur sélectionné.</Text>
          )}

          <Text style={[styles.collaborationTitle, { marginTop: 16 }]}>Commentaires</Text>
          {collaboration.comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <Text style={styles.commentAuthor}>{comment.user?.name || 'Utilisateur'}</Text>
              <Text style={styles.commentBody}>{comment.body}</Text>
            </View>
          ))}
          {collaboration.comments.length === 0 ? (
            <Text style={styles.emptyText}>Aucun commentaire.</Text>
          ) : null}

          {(collaboration.creator?.id === currentUser?.id
            || collaboration.observers.some((observer) => observer.id === currentUser?.id)) ? (
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                value={commentBody}
                onChangeText={setCommentBody}
                placeholder="Ajouter un commentaire..."
                placeholderTextColor="#94A3B8"
                multiline
              />
              <TouchableOpacity
                style={styles.commentSendButton}
                activeOpacity={0.8}
                onPress={handleAddComment}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Seuls le créateur et les observateurs peuvent commenter.
            </Text>
          )}
        </View>

        {task.reminderAt ? (
          <View style={styles.reminderCard}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
            <View style={styles.reminderTextContainer}>
              <Text style={styles.reminderLabel}>Rappel date et heure</Text>
              <Text style={styles.reminderValue}>
                {new Date(task.reminderAt).toLocaleString('fr-FR')}
              </Text>
            </View>
          </View>
        ) : null}

        {task.locationReminder?.latitude && task.locationReminder?.longitude ? (
          <TouchableOpacity
            style={styles.reminderCard}
            activeOpacity={0.8}
            onPress={() => Linking.openURL(
              `https://www.openstreetmap.org/?mlat=${task.locationReminder.latitude}&mlon=${task.locationReminder.longitude}#map=16/${task.locationReminder.latitude}/${task.locationReminder.longitude}`
            )}
          >
            <Ionicons name="location-outline" size={20} color={COLORS.success} />
            <View style={styles.reminderTextContainer}>
              <Text style={styles.reminderLabel}>Rappel à une position</Text>
              <Text style={styles.reminderValue} numberOfLines={2}>
                {task.locationReminder.name}
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}

        {Array.isArray(task.attachments)
          && task.attachments.some((attachment) => !attachment.isPhoto) ? (
          <View style={styles.attachmentsCard}>
            <Text style={styles.photoLabel}>Fichiers joints</Text>
            {task.attachments.filter((attachment) => !attachment.isPhoto).map((attachment) => (
              <TouchableOpacity
                key={attachment.id}
                style={styles.attachmentRow}
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
                <Ionicons name="open-outline" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Quick Toggle Status Button */}
        {isCreator ? (
          <TouchableOpacity
            style={[
              styles.toggleStatusButton,
              { backgroundColor: isCompleted ? '#FEF3C7' : '#DCFCE7' },
            ]}
            activeOpacity={0.8}
            onPress={() => toggleTaskStatus(task.id)}
          >
            <Ionicons
              name={isCompleted ? 'arrow-undo-outline' : 'checkmark-done-circle-outline'}
              size={20}
              color={isCompleted ? '#D97706' : '#16A34A'}
            />
            <Text
              style={[
                styles.toggleStatusText,
                { color: isCompleted ? '#D97706' : '#16A34A' },
              ]}
            >
              {isCompleted ? 'Marquer comme à faire' : 'Marquer comme terminée'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Action Buttons: Modifier & Supprimer */}
        {isCreator ? (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.modifyButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('TaskForm', { mode: 'edit', task })}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.modifyButtonText}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              activeOpacity={0.85}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.deleteButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
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
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    lineHeight: 26,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateText: {
    fontSize: 13,
    color: '#64748B',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  creatorText: {
    fontSize: 13,
    color: '#64748B',
  },
  photoCard: {
    marginTop: 16,
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  attachmentsCard: {
    marginTop: 16,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  reminderTextContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  reminderLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  reminderValue: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  collaborationCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  collaborationTitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
  },
  observerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  observerText: {
    color: '#334155',
    fontSize: 13,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
  },
  commentCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  commentAuthor: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  commentBody: {
    color: '#334155',
    fontSize: 13,
    marginTop: 3,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#1E293B',
  },
  commentSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  attachmentTextContainer: {
    flex: 1,
    marginHorizontal: 10,
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
  toggleStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  toggleStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    marginTop: 20,
    gap: 12,
  },
  modifyButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  modifyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonIcon: {
    marginRight: 8,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
