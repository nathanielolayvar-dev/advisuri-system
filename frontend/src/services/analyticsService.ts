import axios from 'axios';
import { AnalyticsResponse } from '../shared/types';

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
      const response = await axios.get<AnalyticsResponse>(
        `/api/analytics/${groupId}/`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching analytics for group ${groupId}:`, error);
      throw error;
    }
  },

  /**
   * Optional: Helper to refresh analytics specifically
   */
  refreshAnalytics: async (
    groupId: string | number
  ): Promise<AnalyticsResponse> => {
    const response = await axios.post<AnalyticsResponse>(
      `/api/analytics/${groupId}/refresh/`
    );
    return response.data;
  },
};
