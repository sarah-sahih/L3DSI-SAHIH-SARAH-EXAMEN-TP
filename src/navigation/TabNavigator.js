import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import TaskListScreen from '../screens/TaskListScreen';
import TaskFormScreen from '../screens/TaskFormScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tâches"
        component={TaskListScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'checkbox' : 'checkbox-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Ajouter"
        component={TaskFormScreen}
        initialParams={{ mode: 'add' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Smoothly push to TaskForm stack screen with empty state
            e.preventDefault();
            navigation.navigate('TaskForm', { mode: 'add', task: null });
          },
        })}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
