/**
 * GoogleDriveService - SIKAD v4.0
 * Handles Google Drive integration via Google Apps Script for document export
 */

import { logger } from '../utils/logger';

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  error?: string;
}

export interface DriveFileMetadata {
  name: string;
  mimeType: string;
  parents?: string[];
}

/**
 * Google Apps Script Web App URL - configure this in environment variables
 */
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

/**
 * OAuth2 token management
 */
interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

class GoogleDriveService {
  private token: OAuthToken | null = null;
  private readonly STORAGE_KEY = 'sikad_google_token';

  constructor() {
    this.loadToken();
  }

  /**
   * Load token from localStorage
   */
  private loadToken(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.token = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('[GoogleDriveService] Failed to load token:', error);
    }
  }

  /**
   * Save token to localStorage
   */
  private saveToken(token: OAuthToken): void {
    this.token = token;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(token));
  }

  /**
   * Check if user is authenticated with Google
   */
  isAuthenticated(): boolean {
    if (!this.token) return false;
    if (!this.token.expires_at) return true;
    return Date.now() < this.token.expires_at;
  }

  /**
   * Initialize OAuth2 flow - returns auth URL for user to visit
   */
  getAuthUrl(): string {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || window.location.origin + '/auth/google/callback';

    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(code: string): Promise<boolean> {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
      const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI || window.location.origin + '/auth/google/callback';

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();
      const token: OAuthToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
      };

      this.saveToken(token);
      logger.info('[GoogleDriveService] OAuth2 token obtained successfully');
      return true;
    } catch (error) {
      logger.error('[GoogleDriveService] Token exchange failed:', error);
      return false;
    }
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.token?.refresh_token) {
      logger.warn('[GoogleDriveService] No refresh token available');
      return false;
    }

    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: this.token.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      this.token.access_token = data.access_token;
      if (data.expires_in) {
        this.token.expires_at = Date.now() + (data.expires_in * 1000);
      }
      this.saveToken(this.token);

      logger.info('[GoogleDriveService] Access token refreshed');
      return true;
    } catch (error) {
      logger.error('[GoogleDriveService] Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Sign out - clear stored token
   */
  signOut(): void {
    this.token = null;
    localStorage.removeItem(this.STORAGE_KEY);
    logger.info('[GoogleDriveService] User signed out');
  }

  /**
   * Upload file to Google Drive via Apps Script endpoint
   */
  async uploadViaAppsScript(
    fileContent: Blob,
    fileName: string,
    mimeType: string
  ): Promise<DriveUploadResult> {
    if (!APPS_SCRIPT_URL) {
      return { success: false, error: 'Apps Script URL not configured' };
    }

    try {
      const formData = new FormData();
      formData.append('action', 'uploadFile');
      formData.append('fileName', fileName);
      formData.append('mimeType', mimeType);
      formData.append('file', fileContent);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        fileId: result.fileId,
        fileUrl: result.fileUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[GoogleDriveService] Upload failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Upload Word document (.docx) to Google Drive
   */
  async uploadWordDocument(
    content: ArrayBuffer,
    fileName: string,
    _folderId?: string
  ): Promise<DriveUploadResult> {
    const blob = new Blob([content], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    void _folderId; // suppress unused parameter

    return this.uploadViaAppsScript(blob, fileName, 'application/vnd.google-apps.document');
  }

  /**
   * Upload Excel document (.xlsx) to Google Drive
   */
  async uploadExcelDocument(
    content: ArrayBuffer,
    fileName: string,
    _folderId?: string
  ): Promise<DriveUploadResult> {
    const blob = new Blob([content], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    void _folderId; // suppress unused parameter

    return this.uploadViaAppsScript(blob, fileName, 'application/vnd.google-apps.spreadsheet');
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(folderName: string, parentId?: string): Promise<DriveUploadResult> {
    if (!APPS_SCRIPT_URL) {
      return { success: false, error: 'Apps Script URL not configured' };
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createFolder',
          folderName,
          parentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Folder creation failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        fileId: result.folderId,
        fileUrl: result.folderUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[GoogleDriveService] Folder creation failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId?: string): Promise<{ success: boolean; files?: DriveFileMetadata[]; error?: string }> {
    if (!APPS_SCRIPT_URL) {
      return { success: false, error: 'Apps Script URL not configured' };
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'listFiles',
          folderId,
        }),
      });

      if (!response.ok) {
        throw new Error(`List files failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        files: result.files,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[GoogleDriveService] List files failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Share file with specific email
   */
  async shareFile(fileId: string, email: string, role: 'reader' | 'writer' = 'reader'): Promise<boolean> {
    if (!APPS_SCRIPT_URL) {
      return false;
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'shareFile',
          fileId,
          email,
          role,
        }),
      });

      if (!response.ok) {
        throw new Error(`Share failed: ${response.status}`);
      }

      const result = await response.json();
      return !result.error;
    } catch (error) {
      logger.error('[GoogleDriveService] Share file failed:', error);
      return false;
    }
  }

  /**
   * Export assessment document to Google Drive
   */
  async exportAssessmentDocument(
    assessmentData: {
      title: string;
      content: string;
      examDate: string;
      className: string;
      subjectName: string;
    },
    format: 'docx' | 'xlsx' = 'docx'
  ): Promise<DriveUploadResult> {
    // Generate document content based on format
    if (format === 'docx') {
      // For docx, we would need a library like docx.js
      // For now, generate a simple text/blob that Apps Script can convert
      const content = this.generateAssessmentDocxContent(assessmentData);
      const fileName = `Assessment_${assessmentData.subjectName}_${assessmentData.examDate}.docx`;
      return this.uploadWordDocument(content, fileName);
    } else {
      const content = this.generateAssessmentXlsxContent(assessmentData);
      const fileName = `Assessment_${assessmentData.subjectName}_${assessmentData.examDate}.xlsx`;
      return this.uploadExcelDocument(content, fileName);
    }
  }

  /**
   * Generate DOCX content (placeholder - in production use docx library)
   */
  private generateAssessmentDocxContent(data: any): ArrayBuffer {
    // This is a placeholder - in production, use a proper DOCX library
    const textContent = `
Assessment Document
==================
Title: ${data.title}
Subject: ${data.subjectName}
Class: ${data.className}
Date: ${data.examDate}

Content:
${data.content}
    `.trim();

    const encoder = new TextEncoder();
    return encoder.encode(textContent).buffer;
  }

  /**
   * Generate XLSX content (placeholder - in production use xlsx library)
   */
  private generateAssessmentXlsxContent(data: any): ArrayBuffer {
    // This is a placeholder - in production, use xlsx library
    const csvContent = `Title,Subject,Class,Date
"${data.title}","${data.subjectName}","${data.className}","${data.examDate}"
`;

    const encoder = new TextEncoder();
    return encoder.encode(csvContent).buffer;
  }
}

export const googleDriveService = new GoogleDriveService();
