import {
  filterTasks,
  getTaskStats,
  getTasksCreatedByUser,
  getTasksObservedByUser,
} from '../taskUtils';

const tasks = [
  {
    id: '1',
    title: 'Préparer la présentation',
    description: 'Slides du projet',
    status: 'À faire',
  },
  {
    id: '2',
    title: 'Lire la documentation',
    description: 'React Native',
    status: 'Terminée',
  },
];

describe('task utilities', () => {
  test('separates created tasks from tasks observed by the current user', () => {
    const sharedTasks = [
      { id: '1', creatorId: 7, observerIds: [8] },
      { id: '2', creator_id: '8', observerIds: ['7'] },
      { id: '3', creatorId: 9, observerIds: [] },
    ];

    expect(getTasksCreatedByUser(sharedTasks, 7)).toEqual([sharedTasks[0]]);
    expect(getTasksObservedByUser(sharedTasks, 7)).toEqual([sharedTasks[1]]);
    expect(getTasksCreatedByUser(sharedTasks, 8)).toEqual([sharedTasks[1]]);
    expect(getTasksObservedByUser(sharedTasks, 8)).toEqual([sharedTasks[0]]);
  });

  test('calculates task statistics', () => {
    expect(getTaskStats(tasks)).toEqual({
      total: 2,
      completed: 1,
      pending: 1,
    });
  });

  test('calculates profile statistics from tasks created by the current user only', () => {
    const sharedTasks = [
      { id: '1', creatorId: 7, status: 'À faire' },
      { id: '2', creator_id: '7', status: 'Terminée' },
      { id: '3', creatorId: 8, observerIds: [7], status: 'À faire' },
    ];

    expect(getTaskStats(getTasksCreatedByUser(sharedTasks, 7))).toEqual({
      total: 2,
      completed: 1,
      pending: 1,
    });
  });

  test('filters tasks by status', () => {
    expect(filterTasks(tasks, 'À faire')).toEqual([tasks[0]]);
    expect(filterTasks(tasks, 'Terminées')).toEqual([tasks[1]]);
  });

  test('searches titles and descriptions without case sensitivity', () => {
    expect(filterTasks(tasks, 'Toutes', 'react native')).toEqual([tasks[1]]);
    expect(filterTasks(tasks, 'Toutes', 'slides')).toEqual([tasks[0]]);
  });
});
