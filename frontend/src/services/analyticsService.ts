import api from '../api'; // Your Axios instance
import { AnalyticsResponse } from '../shared/types';

/**
 * Service to handle all AI-driven analytical data fetching.
 * Connects directly to the Django Rest Framework backend.
 */
export const analyticsService = {
  /**
   * Fetches the real-time AI Analysis for a specific group.
   * This calls the 'run_comprehensive_analysis' method in your Django backend.
   */
  getGroupAnalytics: async (
    groupId: string | number
  ): Promise<AnalyticsResponse> => {
    try {
      // 1. Hit the Django endpoint we built
      const response = await api.get<AnalyticsResponse>(
        `/analytics/${groupId}/`
      );

      // 2. Return the data to the AnalyticsPage
      return response.data;
    } catch (error: any) {
      // 3. Log specific database/engine errors for debugging
      console.error(
        `[AI Engine Error] Failed to analyze group ${groupId}:`,
        error.response?.data || error.message
      );

      // We throw the error so the AnalyticsPage.tsx catches it and shows the "Retry" screen
      throw error;
    }
  },

  /**
   * Triggers a fresh re-calculation of the ML models.
   * Useful if the user just updated many tasks and wants to see an immediate impact on the forecast.
   */
  refreshAnalytics: async (
    groupId: string | number
  ): Promise<AnalyticsResponse> => {
    try {
      // We use POST here to signal a state change/refresh on the backend
      const response = await api.post<AnalyticsResponse>(
        `/analytics/${groupId}/refresh/`
      );
      return response.data;
    } catch (error) {
      console.error(
        `[Refresh Error] could not update AI models for group ${groupId}`
      );
      throw error;
    }
  },
};
