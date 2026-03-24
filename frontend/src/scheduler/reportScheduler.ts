import {
  sendWeeklyReport,
  scheduleWeeklyReports,
} from '../services/WeeklyReports';

/**
 * Scheduler for automated report tasks.
 *
 * IMPORTANT: This module provides frontend utilities for scheduling reports.
 * The actual cron job execution should be handled by the backend (Django).
 * Use the scheduleWeeklyReports() function to register schedules with the backend.
 *
 * For client-side testing/triggering, you can use the sendWeeklyReport() function directly.
 */

// Schedule weekly reports via backend API
// This tells the backend to send reports every Monday at 8:00 AM
export const initWeeklyReportScheduler = async (): Promise<void> => {
  try {
    const result = await scheduleWeeklyReports('0 8 * * MON');
    console.log(
      '[ReportScheduler] Weekly report scheduled successfully:',
      result.scheduleId
    );
  } catch (error) {
    console.error(
      '[ReportScheduler] Failed to schedule weekly reports:',
      error
    );
  }
};

// Manual trigger for sending weekly report (for testing or on-demand)
// Reuses the logic from WeeklyReports service
export const triggerWeeklyReport = async (): Promise<void> => {
  try {
    console.log('[ReportScheduler] Manually triggering weekly report...');
    const result = await sendWeeklyReport();
    console.log('[ReportScheduler] Weekly report sent:', result);
  } catch (error) {
    console.error('[ReportScheduler] Failed to send weekly report:', error);
    throw error;
  }
};

/**
 * Example: How to set up client-side periodic task (NOT RECOMMENDED for production)
 *
 * WARNING: This approach relies on the user keeping the app open and is not reliable.
 * For production, always use the backend API via scheduleWeeklyReports().
 *
 * If you need client-side periodic execution (e.g., for demo purposes), consider using:
 * - setInterval with localStorage for persistence
 * - Service Workers for background tasks
 * - Or a dedicated backend service with proper cron support
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _clientSideExample = (): void => {
  // This will NOT work with node-cron in browser - shown as example only
  // import cron from 'node-cron'; // This won't work in browser!
  // cron.schedule('0 8 * * MON', async () => {
  //   await sendWeeklyReport(); // Use correct function name
  // });
};
