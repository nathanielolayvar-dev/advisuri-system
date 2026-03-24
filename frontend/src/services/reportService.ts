import api from '../api';

/**
 * Service to handle report generation and download.
 * Manages PDF report fetching from the Django backend.
 */

export interface ReportOptions {
  groupId: string | number;
  reportType?: 'pdf' | 'excel';
  filename?: string;
}

/**
 * Downloads a report (PDF/Excel) for a specific group.
 * Handles the binary response correctly using ArrayBuffer which is universally compatible.
 */
export const downloadReport = async (
  options: ReportOptions
): Promise<ArrayBuffer> => {
  const { groupId, reportType = 'pdf', filename = 'report' } = options;

  try {
    // Request the report as binary data
    const response = await api.get(`/reports/${groupId}/`, {
      params: { type: reportType },
      responseType: 'arraybuffer', // Important: tells axios to return binary data
    });

    // Get the binary data from response as ArrayBuffer
    const arrayBuffer = response.data as ArrayBuffer;

    // Trigger browser download
    downloadBlob(arrayBuffer, filename, reportType);

    return arrayBuffer;
  } catch (error: unknown) {
    console.error('[Report Service] Failed to download report:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || 'Failed to generate report';
    throw new Error(errorMessage);
  }
};

/**
 * Helper function to trigger a browser file download from binary data.
 * Uses ArrayBuffer which is compatible with all modern browsers.
 */
const downloadBlob = (
  data: ArrayBuffer,
  filename: string,
  fileType: string
): void => {
  // Determine MIME type based on file extension
  const mimeType =
    fileType === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // Create a Blob from the ArrayBuffer
  const blob = new Blob([data], { type: mimeType });

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element to trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${fileType}`;

  // Append to body, click, and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release the object URL to free memory
  URL.revokeObjectURL(url);
};

/**
 * Fetches report metadata without downloading the file.
 */
export const getReportInfo = async (
  groupId: string | number
): Promise<{ exists: boolean; filename: string; size: number }> => {
  try {
    const response = await api.get(`/reports/${groupId}/info/`);
    return response.data;
  } catch (error: unknown) {
    console.error('[Report Service] Failed to get report info:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || 'Failed to get report information';
    throw new Error(errorMessage);
  }
};

/**
 * Preview a report in a new browser tab.
 */
export const previewReport = async (
  groupId: string | number
): Promise<void> => {
  try {
    const response = await api.get(`/reports/${groupId}/`, {
      params: { type: 'pdf' },
      responseType: 'arraybuffer',
    });

    const arrayBuffer = response.data as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Open in new tab
    window.open(url, '_blank');
  } catch (error: unknown) {
    console.error('[Report Service] Failed to preview report:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || 'Failed to preview report';
    throw new Error(errorMessage);
  }
};
