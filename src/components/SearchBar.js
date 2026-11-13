import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * SearchBar Component (Partie 2 & 4)
 */
export default function SearchBar({ value, onChangeText, placeholder = 'Rechercher une tâche...' }) {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color="#94A3B8" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 44,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
});
