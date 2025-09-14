# API Pagination Guide

## Overview

PolyHarmony Calendar APIs now support standardized pagination to ensure optimal performance and prevent database overload. This guide explains how to use pagination with our API endpoints.

## Supported Endpoints

The following endpoints support pagination:

- `GET /api/events` - Calendar events
- `GET /api/contacts` - Contact lists
- All other endpoints that return lists of data

## Query Parameters

### New Pagination Parameters (Recommended)

- `page` (integer, default: 1) - Page number (1-based)
- `pageSize` (integer, default: 50, max: 100) - Items per page

### Legacy Parameters (Still Supported)

- `limit` (integer) - Maximum items to return
- `offset` (integer) - Number of items to skip

**Note**: If legacy parameters are provided, they will be automatically converted to page-based pagination.

## Response Format

All paginated endpoints return data in this format:

```json
{
  "ok": true,
  "data": [/* your data here */],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalItems": 250,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Response Fields

- `data` - Array of items for the current page
- `pagination.page` - Current page number
- `pagination.pageSize` - Items per page
- `pagination.totalItems` - Total number of items available
- `pagination.totalPages` - Total number of pages
- `pagination.hasNext` - Whether there are more pages
- `pagination.hasPrev` - Whether there are previous pages

## Examples

### Basic Pagination

```javascript
// Get first page of events (50 items)
fetch('/api/events?page=1&pageSize=50')

// Get second page
fetch('/api/events?page=2&pageSize=50')
```

### With Filters

```javascript
// Get events for a specific date range with pagination
fetch('/api/events?start_date=2024-01-01&end_date=2024-01-31&page=1&pageSize=25')

// Search contacts with pagination
fetch('/api/contacts?search=john&page=1&pageSize=20')
```

### Legacy Format (Still Works)

```javascript
// Using legacy offset/limit - automatically converted
fetch('/api/events?limit=50&offset=100') 
// Equivalent to: page=3&pageSize=50
```

## Performance Considerations

### Recommended Page Sizes

- **Events**: 50 items per page (default)
- **Contacts**: 50 items per page (default)
- **Large datasets**: Consider 25-100 items per page
- **Mobile apps**: 20-50 items per page for optimal performance

### Database Optimization

Our pagination implementation:

- Uses efficient database queries with `LIMIT` and `OFFSET`
- Includes total count for accurate pagination metadata
- Applies filters before pagination to reduce data transfer
- Supports ordering by various fields

### Rate Limiting

Paginated endpoints are subject to standard rate limiting:

- **Authenticated users**: 100 requests per minute
- **Admin users**: Higher limits with bypass options
- **Legacy endpoints**: Same rate limiting applies

## Migration Guide

### From Legacy to New Format

If you're currently using `limit` and `offset`, you can migrate gradually:

**Old way:**
```javascript
const response = await fetch('/api/events?limit=50&offset=100');
const { events, total } = await response.json();
```

**New way:**
```javascript
const response = await fetch('/api/events?page=3&pageSize=50');
const { data: events, pagination } = await response.json();
const total = pagination.totalItems;
```

### Mobile App Considerations

For mobile applications:

1. **Infinite Scroll**: Use `hasNext` to determine if more data is available
2. **Pull to Refresh**: Reset to `page=1` when refreshing
3. **Caching**: Cache pages locally to reduce API calls
4. **Prefetching**: Consider loading the next page in advance

## Error Handling

### Invalid Parameters

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Page size cannot exceed 100"
  }
}
```

### Empty Results

```json
{
  "ok": true,
  "data": [],
  "pagination": {
    "page": 5,
    "pageSize": 50,
    "totalItems": 200,
    "totalPages": 4,
    "hasNext": false,
    "hasPrev": true
  }
}
```

## Security Considerations

- Pagination parameters are validated to prevent abuse
- Maximum page size is enforced (100 items)
- Rate limiting prevents excessive pagination requests
- Database queries are optimized to prevent performance issues

## Troubleshooting

### Common Issues

1. **Page not found**: Check if `page` exceeds `totalPages`
2. **Large page sizes**: Reduce `pageSize` if you get timeout errors  
3. **Legacy compatibility**: Both old and new formats work simultaneously

### Performance Tips

1. Use consistent page sizes for caching efficiency
2. Consider your network conditions when choosing page sizes
3. Use filters to reduce the total dataset size
4. Monitor the `totalItems` count to optimize your pagination UI

---

*Last updated: 2025-09-13*  
*Version: 1.0.0*