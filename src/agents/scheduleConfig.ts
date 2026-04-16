/**
 * Schedule configuration — edit these values to match your working schedule.
 *
 * The schedule agent uses these rules to determine availability
 * when you ask things like "am I free this week?" or "what days are open?"
 */
export const scheduleConfig = {
  /** Days you typically work (0 = Sunday, 1 = Monday, ..., 6 = Saturday) */
  workingDays: [1, 2, 3, 4, 5] as number[],

  /** Your working hours window */
  workingHours: { start: '10:00', end: '20:00' },

  /** Default session length in hours (used when calculating gaps) */
  defaultSessionDuration: 3,

  /** Minimum free hours in a gap to count as "available" */
  minGapForAvailable: 2,
};
