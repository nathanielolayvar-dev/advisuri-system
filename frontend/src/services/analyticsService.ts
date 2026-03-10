import api from '../api';
import { AnalyticsResponse } from '../shared/types';

// Mock data for demo purposes when API is not available
const mockAnalyticsData: AnalyticsResponse = {
  group_id: '1',
  metrics: {
    pulse: 78,
    velocity: 4.2,
    forecast_end_date: '2026-04-15',
    ai_risk_level: 'Medium',
    team_balance_score: 72,
    buffer_days: 5,
  },
  user_status: {
    user_id: '1',
    bandwidth_available: 'Medium',
    burnout_risk: 'Low',
  },
  alerts: {
    bottlenecks: ['Task assignment imbalance'],
  },
  member_report: [
    { name: 'Alice', active_tasks: 3, risk_score: 'Low', status_color: 'green' },
    { name: 'Bob', active_tasks: 5, risk_score: 'Medium', status_color: 'yellow' },
    { name: 'Charlie', active_tasks: 2, risk_score: 'Low', status_color: 'green' },
    { name: 'Diana', active_tasks: 4, risk_score: 'Medium', status_color: 'yellow' },
  ],
};

/**
 * Service to handle all AI-driven analytical data fetching.
 * Uses the AnalyticsResponse interface to ensure type safety.
 */
export const analyticsService = {
  /**
   * Fetches the complete Health Snapshot for a specific group.
   * @param groupId - The ID of the group to analyze.
   */
  getGroupAnalytics: async (
    groupId: string | number
  ): Promise<AnalyticsResponse> => {
    /**Promise<AnalyticsResponse> create a contract between backend and frontend */
    try {
      // Assuming your Django API endpoint is /api/analytics/<group_id>/
      const response = await api.get<AnalyticsResponse>(
        `/api/analytics/${groupId}/`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching analytics for group ${groupId}:`, error);
      // Return mock data if API fails (for demo purposes)
      console.warn('Using mock analytics data for demo');
      return mockAnalyticsData;
    }
  },

  /**
   * Optional: Helper to refresh analytics specifically
   */
  refreshAnalytics: async (
    groupId: string | number
  ): Promise<AnalyticsResponse> => {
    try {
      const response = await api.post<AnalyticsResponse>(
        `/api/analytics/${groupId}/refresh/`
      );
      return response.data;
    } catch (error) {
      console.warn('Using mock analytics data for demo');
      return mockAnalyticsData;
    }
  },
};
