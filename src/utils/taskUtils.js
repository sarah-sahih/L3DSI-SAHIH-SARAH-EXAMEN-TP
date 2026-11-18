export const getTaskStats = (tasks) => ({
  total: tasks.length,
  completed: tasks.filter((task) => task.status === 'Terminée').length,
  pending: tasks.filter((task) => task.status === 'À faire').length,
});

export const getTasksCreatedByUser = (tasks, userId) => (
  userId == null
    ? []
    : tasks.filter((task) => Number(task.creatorId ?? task.creator_id) === Number(userId))
);

export const getTasksObservedByUser = (tasks, userId) => (
  userId == null
    ? []
    : tasks.filter((task) => (
      Array.isArray(task.observerIds)
      && task.observerIds.some((observerId) => Number(observerId) === Number(userId))
    ))
);

export const filterTasks = (tasks, activeFilter = 'Toutes', searchQuery = '') => {
  const query = searchQuery.trim().toLowerCase();

  return tasks.filter((task) => {
    const matchesFilter =
      activeFilter === 'Toutes'
      || (activeFilter === 'À faire' && task.status === 'À faire')
      || (activeFilter === 'Terminées' && task.status === 'Terminée');

    const matchesSearch =
      query === ''
      || task.title.toLowerCase().includes(query)
      || (task.description && task.description.toLowerCase().includes(query));

    return matchesFilter && matchesSearch;
  });
};
