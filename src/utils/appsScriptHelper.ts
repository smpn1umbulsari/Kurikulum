/**
 * AppsScriptHelper - SIKAD v4.0
 * HTTP client for calling Google Apps Script endpoints
 */

import { logger } from './logger';

export interface AppsScriptResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface AppsScriptRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Apps Script Web App URL - configure this in environment variables
 */
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

/**
 * Default timeout for Apps Script requests (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

class AppsScriptHelper {
  private authToken: string | null = null;
  private readonly TOKEN_KEY = 'sikad_apps_script_token';

  constructor() {
    this.loadToken();
  }

  /**
   * Load authentication token from storage
   */
  private loadToken(): void {
    try {
      this.authToken = localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      logger.error('[AppsScriptHelper] Failed to load token:', error);
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.authToken = token;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.authToken = null;
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Check if Apps Script URL is configured
   */
  isConfigured(): boolean {
    return !!APPS_SCRIPT_URL;
  }

  /**
   * Execute a request to Apps Script with timeout handling
   */
  private async executeRequest<T>(
    action: string,
    payload?: Record<string, unknown>,
    options: AppsScriptRequestOptions = {}
  ): Promise<AppsScriptResponse<T>> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Apps Script URL not configured. Set VITE_APPS_SCRIPT_URL in environment.',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    const { method = 'POST', headers = {}, timeout = DEFAULT_TIMEOUT } = options;

    // Build request options
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.authToken) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      logger.info(`[AppsScriptHelper] Executing action: ${action}`);

      const response = await fetch(APPS_SCRIPT_URL, {
        method,
        headers: requestHeaders,
        body: method !== 'GET' ? JSON.stringify({ action, ...payload }) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logger.error(`[AppsScriptHelper] Request failed: ${response.status}`, errorText);
        return {
          success: false,
          error: `Request failed with status ${response.status}: ${errorText}`,
          errorCode: `HTTP_${response.status}`,
        };
      }

      const result = await response.json();

      if (result.error) {
        logger.error(`[AppsScriptHelper] Apps Script error:`, result.error);
        return {
          success: false,
          error: result.error,
          errorCode: result.errorCode || 'APPS_SCRIPT_ERROR',
        };
      }

      logger.info(`[AppsScriptHelper] Action ${action} completed successfully`);
      return {
        success: true,
        data: result as T,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.error(`[AppsScriptHelper] Request timed out after ${timeout}ms`);
          return {
            success: false,
            error: `Request timed out after ${timeout / 1000} seconds`,
            errorCode: 'TIMEOUT',
          };
        }

        logger.error(`[AppsScriptHelper] Request failed:`, error);
        return {
          success: false,
          error: error.message,
          errorCode: 'REQUEST_ERROR',
        };
      }

      logger.error('[AppsScriptHelper] Unknown error:', error);
      return {
        success: false,
        error: 'An unknown error occurred',
        errorCode: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Call Apps Script action
   */
  async call<T = unknown>(
    action: string,
    payload?: Record<string, unknown>
  ): Promise<AppsScriptResponse<T>> {
    return this.executeRequest<T>(action, payload);
  }

  /**
   * Upload file to Apps Script
   */
  async uploadFile(
    file: Blob,
    fileName: string,
    metadata?: Record<string, unknown>
  ): Promise<AppsScriptResponse<{ fileId: string; fileUrl: string }>> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Apps Script URL not configured',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    const formData = new FormData();
    formData.append('action', 'uploadFile');
    formData.append('fileName', fileName);
    formData.append('file', file);

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    if (this.authToken) {
      formData.append('token', this.authToken);
    }

    try {
      logger.info(`[AppsScriptHelper] Uploading file: ${fileName}`);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          success: false,
          error: `Upload failed: ${errorText}`,
          errorCode: 'UPLOAD_FAILED',
        };
      }

      const result = await response.json();

      if (result.error) {
        return {
          success: false,
          error: result.error,
          errorCode: 'APPS_SCRIPT_ERROR',
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[AppsScriptHelper] Upload failed:', message);
      return {
        success: false,
        error: message,
        errorCode: 'UPLOAD_ERROR',
      };
    }
  }

  /**
   * Execute batch operations
   */
  async batch(
    requests: Array<{ action: string; payload?: Record<string, unknown> }>
  ): Promise<AppsScriptResponse<Array<{ action: string; result: unknown }>>> {
    return this.executeRequest<Array<{ action: string; result: unknown }>>(
      'batch',
      { requests },
      { timeout: DEFAULT_TIMEOUT * 2 } // Double timeout for batch operations
    );
  }

  /**
   * Health check - verify Apps Script is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.executeRequest<{ status: string }>('healthCheck');
      return result.success && result.data?.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Get Apps Script version info
   */
  async getVersion(): Promise<AppsScriptResponse<{ version: string; deployedAt: string }>> {
    return this.executeRequest<{ version: string; deployedAt: string }>('getVersion');
  }
}

export const appsScriptHelper = new AppsScriptHelper();
