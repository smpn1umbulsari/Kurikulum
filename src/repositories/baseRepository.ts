/**
 * Base Repository - SIKAD v4.0
 * Base class for all data repositories with CRUD operations
 */

import { supabase } from '@/infrastructure/supabase/client';
import type { Database } from '@/types';

export type Tables = Database['public']['Tables'];

export interface RepositoryResult<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BaseRepositoryOptions {
  tableName: string;
  primaryKey?: string;
  selectableFields?: string[];
}

export class BaseRepository<T extends keyof Tables> {
  protected tableName: string;
  protected primaryKey: string;
  protected selectableFields: string[];

  constructor(options: BaseRepositoryOptions) {
    this.tableName = options.tableName;
    this.primaryKey = options.primaryKey || 'id';
    this.selectableFields = options.selectableFields || ['*'];
  }

  /**
   * Find all records with optional pagination
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
  }): Promise<PaginatedResult<Tables[T]['Row']>> {
    const { page = 1, limit = 20, filters, orderBy } = options || {};
    const offset = (page - 1) * limit;

    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, {
        ascending: orderBy.ascending ?? true,
      });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch ${this.tableName}: ${error.message}`);
    }

    return {
      items: (data as unknown as Tables[T]['Row'][]) || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<RepositoryResult<Tables[T]['Row']>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectableFields.join(','))
      .eq(this.primaryKey, id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as Tables[T]['Row'], error: null };
  }

  /**
   * Find records by a specific field
   */
  async findByField(
    field: string,
    value: any,
    options?: { limit?: number; orderBy?: { column: string; ascending?: boolean } }
  ): Promise<RepositoryResult<Tables[T]['Row'][]>> {
    let query = supabase
      .from(this.tableName)
      .select(this.selectableFields.join(','))
      .eq(field, value);

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as Tables[T]['Row'][], error: null };
  }

  /**
   * Create a new record
   */
  async create(
    payload: Tables[T]['Insert']
  ): Promise<RepositoryResult<Tables[T]['Row']>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as Tables[T]['Row'], error: null };
  }

  /**
   * Create multiple records
   */
  async createMany(
    payloads: Tables[T]['Insert'][]
  ): Promise<RepositoryResult<Tables[T]['Row'][]>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(payloads as any)
      .select();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as Tables[T]['Row'][], error: null };
  }

  /**
   * Update a record by ID
   */
  async update(
    id: string,
    payload: Partial<Tables[T]['Update']>
  ): Promise<RepositoryResult<Tables[T]['Row']>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(payload as any)
      .eq(this.primaryKey, id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as Tables[T]['Row'], error: null };
  }

  /**
   * Delete a record by ID (soft delete if available)
   */
  async delete(id: string): Promise<RepositoryResult<null>> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq(this.primaryKey, id);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const { count } = await supabase
      .from(this.tableName)
      .select(this.primaryKey, { count: 'exact' })
      .eq(this.primaryKey, id)
      .limit(1);

    return (count || 0) > 0;
  }

  /**
   * Count total records with optional filters
   */
  async count(filters?: Record<string, any>): Promise<number> {
    let query = supabase
      .from(this.tableName)
      .select(this.primaryKey, { count: 'exact', head: true });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count } = await query;
    return count || 0;
  }
}

// ============ FACTORY FUNCTION ============

export function createRepository<T extends keyof Tables>(
  tableName: string,
  primaryKey?: string
): BaseRepository<T> {
  return new BaseRepository<T>({ tableName, primaryKey });
}
