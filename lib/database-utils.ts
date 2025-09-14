/**
 * Database Query Utilities
 * Provides safe, paginated database queries
 */

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export function getPaginationParams(options?: PaginationOptions) {
  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, options?.pageSize || DEFAULT_PAGE_SIZE)
  );
  
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    page,
    pageSize
  };
}

// Utility function for getting safe pagination parameters
export function validatePaginationParams(page?: number, pageSize?: number) {
  const validatedPage = Math.max(1, page || 1);
  const validatedPageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, pageSize || DEFAULT_PAGE_SIZE)
  );
  
  return {
    page: validatedPage,
    pageSize: validatedPageSize,
    offset: (validatedPage - 1) * validatedPageSize,
    limit: validatedPageSize
  };
}

export async function paginatedQuery(
  baseQuery: any,
  options?: PaginationOptions
) {
  const { limit, offset, page, pageSize } = getPaginationParams(options);
  
  try {
    // Create separate queries to avoid conflicts
    // Note: Supabase queries are immutable, so we can reuse baseQuery safely
    
    // Get total count first
    const countResult = await baseQuery.select('*', { count: 'exact', head: true });
    const totalItems = countResult.count || 0;
    
    // Get paginated results
    let dataQuery = baseQuery;
    
    // Apply ordering if specified
    if (options?.orderBy) {
      dataQuery = dataQuery.order(options.orderBy, { 
        ascending: options.orderDirection !== 'desc' 
      });
    }
    
    // Apply pagination
    dataQuery = dataQuery.range(offset, offset + limit - 1);
    
    const { data, error } = await dataQuery;
    
    if (error) throw error;
    
    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        hasNext: page * pageSize < totalItems,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('Pagination query error:', error);
    throw error;
  }
}
