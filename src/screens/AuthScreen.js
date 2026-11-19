import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

export default function AuthScreen({ onAuthenticate }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await onAuthenticate(
        isRegistering ? 'register' : 'login',
        name.trim(),
        email.trim().toLowerCase(),
        password,
        passwordConfirmation
      );
    } catch (submitError) {
      setError(submitError.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <Text style={styles.title}>
              {isRegistering ? 'Créer un compte' : 'Bienvenue'}
            </Text>
            <Text style={styles.subtitle}>Connectez-vous pour retrouver vos tâches.</Text>

            {isRegistering ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nom"
                autoCapitalize="words"
                accessibilityLabel="Nom"
              />
            ) : null}
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Adresse e-mail"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              accessibilityLabel="Adresse e-mail"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              secureTextEntry
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              accessibilityLabel="Mot de passe"
            />
            {isRegistering ? (
              <TextInput
                style={styles.input}
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                placeholder="Confirmer le mot de passe"
                secureTextEntry
                autoComplete="new-password"
                accessibilityLabel="Confirmer le mot de passe"
              />
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.disabled]}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>
                  {isRegistering ? 'Créer mon compte' : 'Se connecter'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setError('');
                setIsRegistering((value) => !value);
              }}
            >
              <Text style={styles.switchText}>
                {isRegistering
                  ? 'J’ai déjà un compte : me connecter'
                  : 'Créer un nouveau compte'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logo: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignSelf: 'center',
    marginBottom: 18,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    marginBottom: 12,
  },
  submitButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  disabled: {
    opacity: 0.65,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
