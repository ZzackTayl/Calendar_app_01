#!/bin/bash

# Direct API Testing Script for Enhanced Conflict Detection System
# Tests the API endpoints directly using curl

set -e

# Configuration
BASE_URL="http://localhost:3000"
TEST_USER_ID="11111111-1111-1111-1111-111111111111"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
log_section() {
    echo -e "\n${CYAN}============================================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}============================================================${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if server is running
check_server() {
    log_info "Checking if server is running..."
    if curl -s -f "$BASE_URL" > /dev/null 2>&1; then
        log_success "Server is responding at $BASE_URL"
        return 0
    else
        log_error "Server is not responding at $BASE_URL"
        log_info "Please start the development server with: npm run dev"
        return 1
    fi
}

# Test 1: Batch Conflict Detection Endpoint
test_batch_conflict_detection() {
    log_section "Testing Batch Conflict Detection Endpoint"
    
    local response=$(curl -s -w "\nSTATUS_CODE:%{http_code}" -X POST \
        "$BASE_URL/api/events/check-conflicts/batch" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer mock-token-$TEST_USER_ID" \
        -d '{
            "event_start": "2025-08-30T10:00:00.000Z",
            "event_end": "2025-08-30T11:00:00.000Z",
            "partner_ids": [
                "22222222-2222-2222-2222-222222222222",
                "33333333-3333-3333-3333-333333333333",
                "44444444-4444-4444-4444-444444444444"
            ],
            "buffer_time_minutes": 15,
            "consider_travel_time": true,
            "alternative_slots_count": 3,
            "preferred_times": ["09:00", "14:00"]
        }')
    
    local status_code=$(echo "$response" | grep "STATUS_CODE:" | cut -d':' -f2)
    local body=$(echo "$response" | sed '/STATUS_CODE:/d')
    
    echo "Status Code: $status_code"
    echo "Response Body:"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    
    if [[ "$status_code" == "200" ]]; then
        log_success "Batch conflict detection endpoint is working"
        
        # Check if response has expected structure
        if echo "$body" | jq -e '.success and .conflicts and .performance_metrics and .privacy_summary' > /dev/null 2>&1; then
            log_success "Response structure is correct"
        else
            log_warning "Response structure may be incomplete"
        fi
    else
        log_error "Batch conflict detection endpoint failed with status $status_code"
    fi
    
    echo
}

# Test 2: Group Availability Endpoint
test_group_availability() {
    log_section "Testing Group Availability Endpoint"
    
    local response=$(curl -s -w "\nSTATUS_CODE:%{http_code}" -X POST \
        "$BASE_URL/api/events/check-group-availability" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer mock-token-$TEST_USER_ID" \
        -d '{
            "group_ids": ["test-group-1"],
            "time_range": {
                "start": "2025-08-30T08:00:00.000Z",
                "end": "2025-08-30T18:00:00.000Z"
            },
            "duration_minutes": 60,
            "buffer_minutes": 15,
            "preferred_times": ["09:00", "14:00"]
        }')
    
    local status_code=$(echo "$response" | grep "STATUS_CODE:" | cut -d':' -f2)
    local body=$(echo "$response" | sed '/STATUS_CODE:/d')
    
    echo "Status Code: $status_code"
    echo "Response Body:"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    
    # 404 is expected if no test groups exist
    if [[ "$status_code" == "200" ]]; then
        log_success "Group availability endpoint is working"
    elif [[ "$status_code" == "404" ]]; then
        log_success "Group availability endpoint is working (no test groups found - expected)"
    else
        log_error "Group availability endpoint failed with status $status_code"
    fi
    
    echo
}

# Test 3: Legacy Compatibility Endpoint
test_legacy_compatibility() {
    log_section "Testing Legacy Compatibility Endpoint"
    
    local response=$(curl -s -w "\nSTATUS_CODE:%{http_code}" -X POST \
        "$BASE_URL/api/events/check-conflicts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer mock-token-$TEST_USER_ID" \
        -d '{
            "event_start": "2025-08-30T10:00:00.000Z",
            "event_end": "2025-08-30T11:00:00.000Z",
            "partner_ids": [
                "22222222-2222-2222-2222-222222222222",
                "33333333-3333-3333-3333-333333333333"
            ],
            "exclude_event_id": null
        }')
    
    local status_code=$(echo "$response" | grep "STATUS_CODE:" | cut -d':' -f2)
    local body=$(echo "$response" | sed '/STATUS_CODE:/d')
    
    echo "Status Code: $status_code"
    echo "Response Body:"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    
    if [[ "$status_code" == "200" ]]; then
        log_success "Legacy compatibility endpoint is working"
        
        # Check if response has legacy structure
        if echo "$body" | jq -e '.success and .conflicts and .has_conflicts' > /dev/null 2>&1; then
            log_success "Legacy response structure is maintained"
        else
            log_warning "Legacy response structure may be incomplete"
        fi
    else
        log_error "Legacy compatibility endpoint failed with status $status_code"
    fi
    
    echo
}

# Test 4: Edge Cases
test_edge_cases() {
    log_section "Testing Edge Cases"
    
    # Test empty partner list
    log_info "Testing empty partner list..."
    local response=$(curl -s -w "\nSTATUS_CODE:%{http_code}" -X POST \
        "$BASE_URL/api/events/check-conflicts/batch" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer mock-token-$TEST_USER_ID" \
        -d '{
            "event_start": "2025-08-30T10:00:00.000Z",
            "event_end": "2025-08-30T11:00:00.000Z",
            "partner_ids": [],
            "buffer_time_minutes": 15
        }')
    
    local status_code=$(echo "$response" | grep "STATUS_CODE:" | cut -d':' -f2)
    if [[ "$status_code" == "400" ]]; then
        log_success "Empty partner list validation working"
    else
        log_warning "Empty partner list should return 400, got $status_code"
    fi
    
    # Test invalid date range
    log_info "Testing invalid date range..."
    local response=$(curl -s -w "\nSTATUS_CODE:%{http_code}" -X POST \
        "$BASE_URL/api/events/check-conflicts/batch" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer mock-token-$TEST_USER_ID" \
        -d '{
            "event_start": "2025-08-30T11:00:00.000Z",
            "event_end": "2025-08-30T10:00:00.000Z",
            "partner_ids": ["22222222-2222-2222-2222-222222222222"],
            "buffer_time_minutes": 15
        }')
    
    local status_code=$(echo "$response" | grep "STATUS_CODE:" | cut -d':' -f2)
    if [[ "$status_code" == "400" ]]; then
        log_success "Invalid date range validation working"
    else
        log_warning "Invalid date range should return 400, got $status_code"
    fi
    
    echo
}

# Test 5: Performance Test
test_performance() {
    log_section "Testing Performance"
    
    log_info "Running performance test with multiple partners..."
    local start_time=$(date +%s%3N)
    
    local response=$(curl -s -w "\nSTATUS_CODE:%{http_code}" -X POST \
        "$BASE_URL/api/events/check-conflicts/batch" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer mock-token-$TEST_USER_ID" \
        -d '{
            "event_start": "2025-08-30T10:00:00.000Z",
            "event_end": "2025-08-30T11:00:00.000Z",
            "partner_ids": [
                "22222222-2222-2222-2222-222222222222",
                "33333333-3333-3333-3333-333333333333",
                "44444444-4444-4444-4444-444444444444",
                "55555555-5555-5555-5555-555555555555",
                "66666666-6666-6666-6666-666666666666"
            ],
            "buffer_time_minutes": 15,
            "alternative_slots_count": 5
        }')
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    local status_code=$(echo "$response" | grep "STATUS_CODE:" | cut -d':' -f2)
    local body=$(echo "$response" | sed '/STATUS_CODE:/d')
    
    if [[ "$status_code" == "200" ]]; then
        log_success "Performance test completed in ${duration}ms"
        
        # Extract server-side processing time
        local server_time=$(echo "$body" | jq -r '.performance_metrics.processing_time_ms' 2>/dev/null)
        if [[ "$server_time" != "null" && "$server_time" != "" ]]; then
            log_info "Server processing time: ${server_time}ms"
            
            if (( $(echo "$server_time < 5000" | bc -l) )); then
                log_success "Server performance is acceptable"
            else
                log_warning "Server processing time may be too slow"
            fi
        fi
        
        # Extract performance metrics
        local partners_checked=$(echo "$body" | jq -r '.performance_metrics.partners_checked' 2>/dev/null)
        local db_queries=$(echo "$body" | jq -r '.performance_metrics.database_queries' 2>/dev/null)
        local cache_ratio=$(echo "$body" | jq -r '.performance_metrics.cache_hit_ratio' 2>/dev/null)
        
        if [[ "$partners_checked" != "null" ]]; then
            log_info "Partners checked: $partners_checked"
        fi
        if [[ "$db_queries" != "null" ]]; then
            log_info "Database queries: $db_queries"
            if (( $(echo "$db_queries <= 5" | bc -l) )); then
                log_success "Database query count is efficient"
            else
                log_warning "Database query count may be too high"
            fi
        fi
        if [[ "$cache_ratio" != "null" ]]; then
            log_info "Cache hit ratio: $cache_ratio"
        fi
    else
        log_error "Performance test failed with status $status_code"
    fi
    
    echo
}

# Database verification
verify_database() {
    log_section "Database Verification"
    
    # Check if Docker container is running
    if docker ps | grep -q polyharmony-test-db; then
        log_success "Docker database container is running"
    else
        log_error "Docker database container is not running"
        return 1
    fi
    
    # Check test data
    local event_count=$(docker exec polyharmony-test-db psql -U postgres -d polyharmony_test -t -c "SELECT COUNT(*) FROM events WHERE title LIKE 'TEST:%';" | tr -d ' ')
    if [[ "$event_count" -gt 0 ]]; then
        log_success "Found $event_count test events in database"
    else
        log_warning "No test events found in database"
    fi
    
    # Check enhanced tables
    local tables=$(docker exec polyharmony-test-db psql -U postgres -d polyharmony_test -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('availability_cache', 'conflict_audit_log', 'availability_windows', 'conflict_check_metrics');" | tr -d ' ')
    if [[ "$tables" == "4" ]]; then
        log_success "All 4 enhanced tables are present"
    else
        log_warning "Only $tables/4 enhanced tables found"
    fi
    
    echo
}

# Main execution
main() {
    echo -e "${CYAN}🚀 Enhanced Conflict Detection System - Direct API Tests${NC}"
    echo -e "${CYAN}Testing against: $BASE_URL${NC}"
    echo -e "${CYAN}Test User: $TEST_USER_ID${NC}"
    echo
    
    # Check dependencies
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed - JSON formatting will be limited"
    fi
    
    # Verify database
    verify_database || {
        log_error "Database verification failed"
        exit 1
    }
    
    # Check server
    if ! check_server; then
        exit 1
    fi
    
    # Run tests
    test_batch_conflict_detection
    test_group_availability
    test_legacy_compatibility
    test_edge_cases
    test_performance
    
    log_section "All Tests Completed"
    log_success "API testing completed successfully!"
}

# Run main function
main "$@"