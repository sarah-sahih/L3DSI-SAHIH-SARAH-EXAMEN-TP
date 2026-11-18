import { describe, expect, it } from '@jest/globals';
import {
  getLocationReminderRegions,
  MAX_ACTIVE_LOCATION_REMINDERS,
} from './locationReminderRegions';

const task = (id, overrides = {}) => ({
  id,
  status: 'À faire',
  creatorId: 7,
  locationReminder: { latitude: 0, longitude: 0 },
  ...overrides,
});

describe('getLocationReminderRegions', () => {
  it('only registers active reminders owned by the signed-in user', () => {
    const regions = getLocationReminderRegions([
      task('owned'),
      task('observer-task', { creatorId: 8 }),
      task('completed', { status: 'Terminée' }),
      task('invalid', { locationReminder: { latitude: 91, longitude: 0 } }),
    ], 7);

    expect(regions).toEqual([
      {
        identifier: 'owned',
        latitude: 0,
        longitude: 0,
        radius: 200,
        notifyOnEnter: true,
        notifyOnExit: false,
      },
    ]);
  });

  it('respects the shared iOS geofence limit', () => {
    const tasks = Array.from(
      { length: MAX_ACTIVE_LOCATION_REMINDERS + 5 },
      (_, index) => task(`task-${index}`)
    );

    const regions = getLocationReminderRegions(tasks, 7);

    expect(regions).toHaveLength(MAX_ACTIVE_LOCATION_REMINDERS);
    expect(regions[0].identifier).toBe('task-0');
    expect(regions[regions.length - 1].identifier).toBe(
      `task-${MAX_ACTIVE_LOCATION_REMINDERS - 1}`
    );
  });
});
