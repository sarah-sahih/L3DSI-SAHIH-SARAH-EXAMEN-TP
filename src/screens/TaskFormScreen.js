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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../context/TaskContext';
import { COLORS } from '../constants/theme';

const PRIORITIES = ['Faible', 'Moyenne', 'Élevée'];
const STATUSES = ['À faire', 'Terminée'];

/**
 * Screen 4: Formulaire et opérations CRUD (Partie 3 & Partie 4)
 * Formulaire réutilisé pour l'ajout et la modification d'une tâche
 */
export default function TaskFormScreen({ route, navigation }) {
  const { mode = 'add', task } = route.params || {};
  const isEditing = mode === 'edit' && !!task;

  const { addTask, updateTask, deleteTask } = useTasks();

  const [title, setTitle] = useState(task ? task.title : '');
  const [description, setDescription] = useState(task ? task.description : '');
  const [priority, setPriority] = useState(task ? task.priority : 'Moyenne');
  const [status, setStatus] = useState(task ? task.status : 'À faire');
  const [errorTitle, setErrorTitle] = useState('');

  // If route params change (e.g. user selects a different task to edit)
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'Moyenne');
      setStatus(task.status || 'À faire');
    } else {
      setTitle('');
      setDescription('');
      setPriority('Moyenne');
      setStatus('À faire');
    }
    setErrorTitle('');
  }, [task]);

  const handleSave = async () => {
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
      if (isEditing) {
        await updateTask(task.id, {
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
        });
        navigation.goBack();
      } else {
        await addTask({
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
        });
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Erreur', "Une erreur s'est produite lors de l'enregistrement.");
    }
  };

  const handleDelete = () => {
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
