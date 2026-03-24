import api from '../api';

/**
 * Service to handle weekly report generation and distribution.
 * Manages triggering and sending weekly reports via the Django backend.
 */

export interface WeeklyReportOptions {
  /** Optional group ID to filter report by specific group */
  groupId?: string | number;
  /** Optional recipient emails (if not specified, sends to all group members) */
  recipients?: string[];
  /** Include specific sections in the report */
  includeSections?: ('tasks' | 'analytics' | 'members' | 'announcements')[];
}

export interface WeeklyReportResponse {
  success: boolean;
  message: string;
  reportId?: string;
  recipientsCount?: number;
  sentAt?: string;
}

/**
 * Triggers the weekly report generation and sends it to recipients.
 *
 * NOTE: Authorization is handled on the backend side using Django's
 * permission classes (IsAdminUser). The frontend should check user role
 * before allowing access to this functionality using RBAC utilities.
 *
 * @param options - Report configuration options
 * @returns Promise with the response from the backend
 */
export const sendWeeklyReport = async (
  options: WeeklyReportOptions = {}
): Promise<WeeklyReportResponse> => {
  try {
    const response = await api.post('/reports/weekly/send/', options);
    return {
      success: true,
      message: response.data.message || 'Weekly report sent successfully',
      reportId: response.data.report_id,
      recipientsCount: response.data.recipients_count,
      sentAt: response.data.sent_at,
    };
  } catch (error: unknown) {
    console.error(
      '[WeeklyReports Service] Failed to send weekly report:',
      error
    );
    const errorMessage =
      error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || 'Failed to send weekly report';
    throw new Error(errorMessage);
  }
};

/**
 * Fetches the status of weekly report delivery.
 *
 * @param reportId - The ID of the report to check
 * @returns Promise with delivery status
 */
export const getWeeklyReportStatus = async (
  reportId: string
): Promise<{
  status: 'pending' | 'sent' | 'failed';
  recipientsCount: number;
  sentAt?: string;
  failedRecipients?: string[];
}> => {
  try {
    const response = await api.get(`/reports/weekly/status/${reportId}/`);
    return response.data;
  } catch (error: unknown) {
    console.error(
      '[WeeklyReports Service] Failed to get report status:',
      error
    );
    const errorMessage =
      error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || 'Failed to get report status';
    throw new Error(errorMessage);
  }
};

/**
 * Schedules weekly reports to be sent automatically.
 *
 * @param schedule - Cron schedule expression (e.g., '0 9 * * 1' for Monday 9am)
 * @param options - Report configuration options
 */
export const scheduleWeeklyReports = async (
  schedule: string,
  options: WeeklyReportOptions = {}
): Promise<{ success: boolean; scheduleId: string }> => {
  try {
    const response = await api.post('/reports/weekly/schedule/', {
      schedule,
      ...options,
    });
    return {
      success: true,
      scheduleId: response.data.schedule_id,
    };
  } catch (error: unknown) {
    console.error('[WeeklyReports Service] Failed to schedule reports:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || 'Failed to schedule weekly reports';
    throw new Error(errorMessage);
  }
};

/**
 * Cancels an existing weekly report schedule.
 *
 * @param scheduleId - The ID of the schedule to cancel
 */
export const cancelWeeklyReportSchedule = async (
  scheduleId: string
): Promise<{ success: boolean }> => {
  try {
    await api.delete(`/reports/weekly/schedule/${scheduleId}/`);
    return { success: true };
  } catch (error: unknown) {
    console.error('[WeeklyReports Service] Failed to cancel schedule:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || 'Failed to cancel weekly report schedule';
    throw new Error(errorMessage);
  }
};
