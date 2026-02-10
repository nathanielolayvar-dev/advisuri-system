import axios from 'axios';
import { GroupAnalytics } from '../shared/types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// 1. Create an instance (Better for adding Auth headers later)
const api = axios.create({
  baseURL: API_URL,
});

export const getGroupAnalytics = async (
  groupId: string
): Promise<GroupAnalytics> => {
  try {
    // 2. Tell Axios what shape the data is (<GroupAnalytics>)
    const response = await api.get<GroupAnalytics>(
      `/groups/${groupId}/analytics/`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error; // Re-throw so the AnalyticsPage can catch it and show the error UI
  }
};
