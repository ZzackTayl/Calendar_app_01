#!/bin/bash

# Comprehensive Test Orchestration Script
# PolyHarmony Calendar - Enterprise Testing Suite

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
RESULTS_DIR="$PROJECT_ROOT/test-results"
REPORTS_DIR="$PROJECT_ROOT/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Default values
TEST_TIER="all"
PARALLEL_EXECUTION=true
GENERATE_REPORT=true
CLEANUP_AFTER=true
VERBOSE=false

# Help function
show_help() {
    cat << EOF
Comprehensive Test Orchestration Script
PolyHarmony Calendar Enterprise Testing Suite

Usage: $0 [OPTIONS]

OPTIONS:
    -t, --tier TIER         Test tier to run (all|unit|integration|e2e|performance|security)
    -p, --no-parallel       Disable parallel test execution
    -r, --no-report         Skip report generation
    -c, --no-cleanup        Skip cleanup after tests
    -v, --verbose           Enable verbose output
    -h, --help              Show this help message

EXAMPLES:
    $0                      # Run all tests with default settings
    $0 -t unit              # Run only unit tests
    $0 -t e2e --verbose     # Run E2E tests with verbose output
    $0 --no-cleanup         # Run all tests but skip cleanup

ENVIRONMENT VARIABLES:
    TEST_DB_PASSWORD        Database password for testing
    TEST_SUPABASE_ANON_KEY  Supabase anonymous key for testing
    DOCKER_REGISTRY         Docker registry for custom images
    
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tier)
            TEST_TIER="$2"
            shift 2
            ;;
        -p|--no-parallel)
            PARALLEL_EXECUTION=false
            shift
            ;;
        -r|--no-report)
            GENERATE_REPORT=false
            shift
            ;;
        -c|--no-cleanup)
            CLEANUP_AFTER=false
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check Node.js (for local test utilities)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found - some test utilities may not work"
    fi
    
    log_success "Prerequisites check passed"
}

# Setup test environment
setup_environment() {
    log_info "Setting up test environment..."
    
    # Create directories
    mkdir -p "$RESULTS_DIR" "$REPORTS_DIR"
    
    # Set environment variables for Docker Compose
    export TEST_TIMESTAMP="$TIMESTAMP"
    export TEST_RESULTS_DIR="$RESULTS_DIR"
    export TEST_REPORTS_DIR="$REPORTS_DIR"
    
    # Load environment variables from .env files if they exist
    if [ -f "$PROJECT_ROOT/.env.test" ]; then
        log_verbose "Loading test environment variables"
        set -a
        source "$PROJECT_ROOT/.env.test"
        set +a
    fi
    
    log_success "Environment setup completed"
}

# Run unit tests
run_unit_tests() {
    log_info "Running unit tests..."
    
    local start_time=$(date +%s)
    local success=true
    
    if [ "$PARALLEL_EXECUTION" = true ]; then
        log_verbose "Running unit tests in parallel mode"
        docker-compose -f docker-compose.testing.yml --profile unit up --build --abort-on-container-exit &
        UNIT_PID=$!
        
        # Monitor the process
        wait $UNIT_PID || success=false
    else
        log_verbose "Running unit tests in sequential mode"
        docker-compose -f docker-compose.testing.yml --profile unit up --build --abort-on-container-exit || success=false
    fi
    
    # Cleanup containers
    docker-compose -f docker-compose.testing.yml --profile unit down -v > /dev/null 2>&1 || true
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$success" = true ]; then
        log_success "Unit tests completed successfully in ${duration}s"
    else
        log_error "Unit tests failed after ${duration}s"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests..."
    
    local start_time=$(date +%s)
    local success=true
    
    # Pre-flight check for integration dependencies
    if ! docker network inspect polyharmony-test-network > /dev/null 2>&1; then
        log_verbose "Creating test network"
        docker network create polyharmony-test-network || true
    fi
    
    if [ "$PARALLEL_EXECUTION" = true ]; then
        log_verbose "Running integration tests in parallel mode"
        docker-compose -f docker-compose.testing.yml --profile integration up --build --abort-on-container-exit &
        INTEGRATION_PID=$!
        
        wait $INTEGRATION_PID || success=false
    else
        log_verbose "Running integration tests in sequential mode"
        docker-compose -f docker-compose.testing.yml --profile integration up --build --abort-on-container-exit || success=false
    fi
    
    # Cleanup
    docker-compose -f docker-compose.testing.yml --profile integration down -v > /dev/null 2>&1 || true
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$success" = true ]; then
        log_success "Integration tests completed successfully in ${duration}s"
    else
        log_error "Integration tests failed after ${duration}s"
        return 1
    fi
}

# Run E2E tests
run_e2e_tests() {
    log_info "Running E2E tests..."
    
    local start_time=$(date +%s)
    local success=true
    
    # E2E tests require more setup time
    log_verbose "Starting E2E application stack..."
    
    if [ "$PARALLEL_EXECUTION" = true ]; then
        log_verbose "Running E2E tests in parallel mode"
        docker-compose -f docker-compose.testing.yml --profile e2e up --build --abort-on-container-exit &
        E2E_PID=$!
        
        # E2E tests can take longer, so we'll wait with timeout
        timeout 1800 wait $E2E_PID || success=false  # 30 minute timeout
    else
        log_verbose "Running E2E tests in sequential mode"
        timeout 1800 docker-compose -f docker-compose.testing.yml --profile e2e up --build --abort-on-container-exit || success=false
    fi
    
    # Cleanup
    docker-compose -f docker-compose.testing.yml --profile e2e down -v > /dev/null 2>&1 || true
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$success" = true ]; then
        log_success "E2E tests completed successfully in ${duration}s"
    else
        log_error "E2E tests failed after ${duration}s"
        return 1
    fi
}

# Run performance tests
run_performance_tests() {
    log_info "Running performance tests..."
    
    local start_time=$(date +%s)
    local success=true
    
    log_verbose "Performance tests may take several minutes..."
    
    # Performance tests need special environment setup
    export PERF_DURATION=${PERF_DURATION:-300}  # 5 minutes default
    export PERF_USERS=${PERF_USERS:-100}        # 100 concurrent users
    export PERF_RAMP_UP=${PERF_RAMP_UP:-60}      # 1 minute ramp-up
    
    docker-compose -f docker-compose.testing.yml --profile performance up --build --abort-on-container-exit || success=false
    
    # Cleanup
    docker-compose -f docker-compose.testing.yml --profile performance down -v > /dev/null 2>&1 || true
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$success" = true ]; then
        log_success "Performance tests completed successfully in ${duration}s"
    else
        log_error "Performance tests failed after ${duration}s"
        return 1
    fi
}

# Run security tests
run_security_tests() {
    log_info "Running security tests..."
    
    local start_time=$(date +%s)
    local success=true
    
    log_verbose "Running comprehensive security audit..."
    
    docker-compose -f docker-compose.testing.yml --profile security up --build --abort-on-container-exit || success=false
    
    # Cleanup
    docker-compose -f docker-compose.testing.yml --profile security down -v > /dev/null 2>&1 || true
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$success" = true ]; then
        log_success "Security tests completed successfully in ${duration}s"
    else
        log_error "Security tests failed after ${duration}s"
        return 1
    fi
}

# Generate comprehensive report
generate_report() {
    if [ "$GENERATE_REPORT" = false ]; then
        log_info "Skipping report generation"
        return 0
    fi
    
    log_info "Generating comprehensive test report..."
    
    # Start the aggregator service
    docker-compose -f docker-compose.testing.yml --profile aggregator up --build --abort-on-container-exit || {
        log_warning "Report generation failed, but continuing..."
        return 0
    }
    
    # Cleanup aggregator
    docker-compose -f docker-compose.testing.yml --profile aggregator down -v > /dev/null 2>&1 || true
    
    if [ -f "$REPORTS_DIR/comprehensive/summary.json" ]; then
        log_success "Comprehensive report generated successfully"
        log_info "Report available at: $REPORTS_DIR/comprehensive/"
    else
        log_warning "Report generation completed but summary not found"
    fi
}

# Cleanup function
cleanup() {
    if [ "$CLEANUP_AFTER" = false ]; then
        log_info "Skipping cleanup (--no-cleanup specified)"
        return 0
    fi
    
    log_info "Cleaning up test resources..."
    
    # Stop all test containers
    docker-compose -f docker-compose.testing.yml down -v > /dev/null 2>&1 || true
    
    # Clean up Docker resources
    log_verbose "Cleaning up Docker images and networks..."
    docker system prune -f > /dev/null 2>&1 || true
    
    # Remove test network if it exists
    docker network rm polyharmony-test-network > /dev/null 2>&1 || true
    
    log_success "Cleanup completed"
}

# Main execution function
main() {
    local overall_start_time=$(date +%s)
    local failed_tests=()
    
    log_info "Starting comprehensive test execution..."
    log_info "Test tier: $TEST_TIER"
    log_info "Timestamp: $TIMESTAMP"
    
    # Setup
    check_prerequisites
    setup_environment
    
    # Execute tests based on tier
    case $TEST_TIER in
        "unit")
            run_unit_tests || failed_tests+=("unit")
            ;;
        "integration")
            run_integration_tests || failed_tests+=("integration")
            ;;
        "e2e")
            run_e2e_tests || failed_tests+=("e2e")
            ;;
        "performance")
            run_performance_tests || failed_tests+=("performance")
            ;;
        "security")
            run_security_tests || failed_tests+=("security")
            ;;
        "all")
            # Run all test tiers
            if [ "$PARALLEL_EXECUTION" = true ]; then
                log_info "Running test tiers in parallel..."
                # Note: Full parallel execution would require more sophisticated orchestration
                # For now, we'll run them sequentially but with parallel execution within each tier
                run_unit_tests || failed_tests+=("unit")
                run_integration_tests || failed_tests+=("integration")
                run_e2e_tests || failed_tests+=("e2e")
                run_security_tests || failed_tests+=("security")
                # Performance tests are optional for "all" tier
                log_info "Skipping performance tests in 'all' tier (run explicitly with -t performance)"
            else
                log_info "Running test tiers sequentially..."
                run_unit_tests || failed_tests+=("unit")
                run_integration_tests || failed_tests+=("integration")
                run_e2e_tests || failed_tests+=("e2e")
                run_security_tests || failed_tests+=("security")
            fi
            ;;
        *)
            log_error "Invalid test tier: $TEST_TIER"
            log_error "Valid tiers: all, unit, integration, e2e, performance, security"
            exit 1
            ;;
    esac
    
    # Generate report
    generate_report
    
    # Summary
    local overall_end_time=$(date +%s)
    local total_duration=$((overall_end_time - overall_start_time))
    
    echo
    log_info "=== TEST EXECUTION SUMMARY ==="
    log_info "Total duration: ${total_duration}s"
    log_info "Test tier: $TEST_TIER"
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        log_success "All tests passed successfully!"
        echo
        log_info "Results available in: $RESULTS_DIR"
        if [ "$GENERATE_REPORT" = true ]; then
            log_info "Reports available in: $REPORTS_DIR"
        fi
    else
        log_error "Some tests failed:"
        for test in "${failed_tests[@]}"; do
            log_error "  - $test"
        done
        echo
        log_info "Check logs in: $RESULTS_DIR"
        exit 1
    fi
    
    # Cleanup
    cleanup
}

# Trap for cleanup on script exit
trap cleanup EXIT

# Run main function
main "$@"