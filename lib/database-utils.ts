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

export function addPaginationToQuery(query: any, options?: PaginationOptions) {
  const { limit, offset } = getPaginationParams(options);
  
  // Add limit and offset
  query = query.limit(limit).offset(offset);
  
  // Add ordering if specified
  if (options?.orderBy) {
    query = query.order(options.orderBy, { 
      ascending: options.orderDirection !== 'desc' 
    });
  }
  
  return query;
}

export async function paginatedQuery(
  baseQuery: any,
  options?: PaginationOptions
) {
  const { limit, offset, page, pageSize } = getPaginationParams(options);
  
  // Get total count
  const countQuery = baseQuery.count({ count: 'exact', head: true });
  const { count } = await countQuery;
  
  // Get paginated results
  const dataQuery = addPaginationToQuery(baseQuery, options);
  const { data, error } = await dataQuery;
  
  if (error) throw error;
  
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      hasNext: page * pageSize < (count || 0),
      hasPrev: page > 1
    }
  };
}