import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import NotificationsScreen from './NotificationsScreen';
import { useTasks } from '../context/TaskContext';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
}));

jest.mock('../context/TaskContext', () => ({
  useTasks: jest.fn(),
}));

describe('NotificationsScreen', () => {
  it('marks a notification as read and opens its task', async () => {
    const markNotificationRead = jest.fn().mockResolvedValue(undefined);
    const navigate = jest.fn();
    useTasks.mockReturnValue({
      notifications: [{
        id: 12,
        title: 'Nouveau commentaire',
        body: 'Je suis disponible.',
        task_id: 'task-42',
        read: false,
      }],
      refreshNotifications: jest.fn().mockResolvedValue([]),
      markNotificationRead,
    });

    const screen = await render(<NotificationsScreen navigation={{ navigate }} />);
    fireEvent.press(screen.getByTestId('notification-12'));

    await waitFor(() => {
      expect(markNotificationRead).toHaveBeenCalledWith(12);
      expect(navigate).toHaveBeenCalledWith('TaskDetail', { taskId: 'task-42' });
    });
  });
});
