/**
 * Base Service - SIKAD v4.0
 * Base class for all business logic services
 */

import { useAuthStore } from '@/store/authStore';

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

export class BaseService {
  protected getAuthHeaders(): Record<string, string> {
    const token = useAuthStore.getState().token;
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  protected handleError(error: any, context: string): ServiceError {
    console.error(`${context}:`, error);
    
    if (error?.message) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        details: error,
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: `An unexpected error occurred in ${context}`,
      details: error,
    };
  }

  protected successResponse<T>(data: T): ServiceResponse<T> {
    return {
      success: true,
      data,
    };
  }

  protected errorResponse(error: ServiceError): ServiceResponse<never> {
    return {
      success: false,
      error,
    };
  }

  protected async callApi<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ServiceResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options?.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return this.errorResponse({
          code: `HTTP_${response.status}`,
          message: result?.error || `HTTP Error ${response.status}`,
          details: result,
        });
      }

      return this.successResponse(result.data ?? result);
    } catch (error: any) {
      return this.errorResponse(this.handleError(error, endpoint));
    }
  }

  protected validatePayload<T>(
    payload: T,
    schema: Partial<Record<keyof T, (value: any) => boolean>>
  ): ServiceError | null {
    for (const [key, validator] of Object.entries(schema)) {
      if (validator === undefined) continue;
      const validateFn = validator as (value: any) => boolean;
      if (!validateFn(payload[key as keyof T])) {
        return {
          code: 'VALIDATION_ERROR',
          message: `Invalid value for field: ${key}`,
          details: { field: key, value: payload[key as keyof T] },
        };
      }
    }
    return null;
  }

  /**
   * Safely execute an operation wrapping the result or errors
   */
  protected async handleOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      console.error('[BaseService] Service operation failed:', error);
      throw error;
    }
  }
}

// ============ VALIDATORS ============

export const validators = {
  required: (value: any): boolean => value !== null && value !== undefined && value !== '',
  string: (value: any): boolean => typeof value === 'string',
  number: (value: any): boolean => typeof value === 'number' && !isNaN(value),
  boolean: (value: any): boolean => typeof value === 'boolean',
  array: (value: any): boolean => Array.isArray(value),
  object: (value: any): boolean => typeof value === 'object' && value !== null && !Array.isArray(value),
  minLength: (min: number) => (value: any): boolean => 
    typeof value === 'string' && value.length >= min,
  maxLength: (max: number) => (value: any): boolean => 
    typeof value === 'string' && value.length <= max,
  email: (value: any): boolean => 
    typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value: any): boolean => 
    typeof value === 'string' && /^[0-9+\-\s()]{10,}$/.test(value),
  uuid: (value: any): boolean => 
    typeof value === 'string' && 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
};
