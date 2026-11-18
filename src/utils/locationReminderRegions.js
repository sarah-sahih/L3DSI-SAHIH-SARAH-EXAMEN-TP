export const MAX_ACTIVE_LOCATION_REMINDERS = 20;

export const getLocationReminderRegions = (tasks, userId) => {
  if (!Array.isArray(tasks) || !userId) return [];

  return tasks
    .filter((task) => {
      const reminder = task.locationReminder;
      return (
        task.status === 'À faire'
        && Number(task.creatorId ?? task.creator_id) === Number(userId)
        && Number.isFinite(Number(reminder?.latitude))
        && Number.isFinite(Number(reminder?.longitude))
        && Number(reminder.latitude) >= -90
        && Number(reminder.latitude) <= 90
        && Number(reminder.longitude) >= -180
        && Number(reminder.longitude) <= 180
      );
    })
    .slice(0, MAX_ACTIVE_LOCATION_REMINDERS)
    .map((task) => ({
      identifier: String(task.id),
      latitude: Number(task.locationReminder.latitude),
      longitude: Number(task.locationReminder.longitude),
      radius: Number(task.locationReminder.radius) > 0
        ? Number(task.locationReminder.radius)
        : 200,
      notifyOnEnter: true,
      notifyOnExit: false,
    }));
};
