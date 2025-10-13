#!/bin/bash

# MyOrbit Pre-commit Test Runner
# Fast test execution for pre-commit hooks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Running MyOrbit pre-commit tests...${NC}"

# Configuration
MAX_TEST_TIME=60  # Maximum time in seconds for pre-commit tests
COVERAGE_THRESHOLD=70

# Start timer
start_time=$(date +%s)

# Function to check elapsed time
check_time() {
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    if [ $elapsed -gt $MAX_TEST_TIME ]; then
        echo -e "${YELLOW}⏰ Tests taking too long (>${MAX_TEST_TIME}s), skipping remaining checks...${NC}"
        return 1
    fi
    return 0
}

# Function to run tests with timeout
run_tests_with_timeout() {
    local test_command="$1"
    local description="$2"
    
    echo -e "${BLUE}📋 Running $description...${NC}"
    
    # Run command with timeout
    timeout 30s $test_command || {
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo -e "${YELLOW}⏰ $description timed out (30s limit)${NC}"
            return 1
        else
            echo -e "${RED}❌ $description failed${NC}"
            return $exit_code
        fi
    }
    
    echo -e "${GREEN}✅ $description passed${NC}"
    return 0
}

# Check if we should run tests (only if Dart files changed)
if git diff --cached --name-only | grep -qE '\.(dart)$'; then
    echo -e "${BLUE}📝 Dart files changed, running tests...${NC}"
else
    echo -e "${YELLOW}📝 No Dart files changed, skipping tests${NC}"
    exit 0
fi

# Run quick unit tests first (most important)
if check_time; then
    echo -e "${BLUE}🧪 Running critical unit tests...${NC}"
    
    # Run only the most critical/fast unit tests
    if ! run_tests_with_timeout "flutter test test/services/ test/helpers/ --no-coverage" "Critical unit tests"; then
        echo -e "${RED}❌ Critical unit tests failed - commit blocked${NC}"
        exit 1
    fi
fi

# Run widget tests for UI components (if time permits)
if check_time; then
    echo -e "${BLUE}🎨 Running widget tests...${NC}"
    
    # Run widget tests but don't block commit if they fail
    if ! run_tests_with_timeout "flutter test test/widgets/ --no-coverage" "Widget tests"; then
        echo -e "${YELLOW}⚠️  Widget tests failed but not blocking commit${NC}"
        echo -e "${YELLOW}    Please run full test suite before pushing${NC}"
    fi
fi

# Check test coverage on changed files (if time permits)
if check_time; then
    echo -e "${BLUE}📊 Checking coverage on changed files...${NC}"
    
    # Get list of changed Dart files
    changed_files=$(git diff --cached --name-only | grep '\.dart$' | grep '^lib/' || true)
    
    if [ -n "$changed_files" ]; then
        echo -e "${BLUE}Changed files:${NC}"
        echo "$changed_files" | sed 's/^/  • /'
        
        # Run tests with coverage (but don't fail on threshold for pre-commit)
        if ! timeout 45s flutter test --coverage > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Coverage check timed out or failed${NC}"
            echo -e "${YELLOW}    Please verify coverage manually before pushing${NC}"
        else
            echo -e "${GREEN}✅ Coverage check completed${NC}"
        fi
    fi
fi

# Final timing check
end_time=$(date +%s)
total_time=$((end_time - start_time))

echo -e "${GREEN}🎉 Pre-commit tests completed in ${total_time}s${NC}"

# Reminder message
echo ""
echo -e "${BLUE}💡 Remember to run the full test suite before pushing:${NC}"
echo "   dart run scripts/test_runner.dart"
echo "   OR"
echo "   scripts/coverage_report.sh"
echo ""

exit 0