#!/bin/bash

# Edge Function Test Runner
# Runs all Deno tests for Supabase edge functions

set -e

echo "🧪 Running Edge Function Tests..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
FAILED_TESTS=()
PASSED_TESTS=()

# Function to run a test file
run_test() {
    local test_file=$1
    local test_name=$(basename "$test_file")
    
    echo -e "${YELLOW}Running:${NC} $test_name"
    
    if deno test --allow-net --allow-env "$test_file"; then
        echo -e "${GREEN}✓ PASSED:${NC} $test_name"
        PASSED_TESTS+=("$test_name")
    else
        echo -e "${RED}✗ FAILED:${NC} $test_name"
        FAILED_TESTS+=("$test_name")
    fi
    echo ""
}

# Run all test files
echo "Testing shared utilities..."
run_test "_shared/rate-limiter.test.ts"
run_test "_shared/twilio-validator.test.ts"

echo "Testing edge functions..."
run_test "send-contact-invitation-email/index.test.ts"
run_test "send-contact-invitation-sms/index.test.ts"

# Print summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "${GREEN}Passed: ${#PASSED_TESTS[@]}${NC}"
echo -e "${RED}Failed: ${#FAILED_TESTS[@]}${NC}"
echo ""

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo -e "${RED}Failed tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $test"
    done
    exit 1
else
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    exit 0
fi
