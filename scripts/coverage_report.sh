#!/bin/bash

# MyOrbit Coverage Report Generator
# Generates comprehensive coverage reports with HTML output and threshold enforcement

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COVERAGE_DIR="coverage"
RESULTS_DIR="test_results"
HTML_DIR="$COVERAGE_DIR/html"
LCOV_FILE="$COVERAGE_DIR/lcov.info"

# Thresholds (can be overridden by test_config.yaml)
LINE_THRESHOLD=${LINE_THRESHOLD:-80}
FUNCTION_THRESHOLD=${FUNCTION_THRESHOLD:-85}
BRANCH_THRESHOLD=${BRANCH_THRESHOLD:-75}

print_banner() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}    MyOrbit Coverage Report Generator${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"
    
    # Check if lcov is installed
    if ! command -v genhtml &> /dev/null; then
        echo -e "${YELLOW}Warning: genhtml not found. Installing lcov for HTML reports...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew &> /dev/null; then
                brew install lcov
            else
                echo -e "${RED}Error: Homebrew not found. Please install lcov manually:${NC}"
                echo "  brew install lcov"
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            if command -v apt-get &> /dev/null; then
                sudo apt-get update && sudo apt-get install -y lcov
            elif command -v yum &> /dev/null; then
                sudo yum install -y lcov
            else
                echo -e "${RED}Error: Could not install lcov. Please install manually.${NC}"
                exit 1
            fi
        fi
    fi
    
    echo -e "${GREEN}✅ Dependencies checked${NC}"
}

setup_directories() {
    echo -e "${BLUE}Setting up directories...${NC}"
    
    mkdir -p "$COVERAGE_DIR"
    mkdir -p "$RESULTS_DIR"
    mkdir -p "$HTML_DIR"
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

run_tests_with_coverage() {
    echo -e "${BLUE}Running tests with coverage...${NC}"
    
    # Clean previous coverage data
    if [ -f "$LCOV_FILE" ]; then
        rm "$LCOV_FILE"
    fi
    
    # Run Flutter tests with coverage
    flutter test --coverage || {
        echo -e "${RED}❌ Tests failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Tests completed with coverage${NC}"
}

generate_html_report() {
    echo -e "${BLUE}Generating HTML coverage report...${NC}"
    
    if [ ! -f "$LCOV_FILE" ]; then
        echo -e "${RED}Error: No coverage data found at $LCOV_FILE${NC}"
        exit 1
    fi
    
    # Generate HTML report
    genhtml "$LCOV_FILE" \
        --output-directory "$HTML_DIR" \
        --title "MyOrbit Coverage Report" \
        --show-details \
        --legend \
        --branch-coverage \
        --function-coverage \
        --demangle-cpp \
        --prefix "$(pwd)" \
        --ignore-errors source,deprecated \
        --synthesize-missing || {
        echo -e "${RED}❌ Failed to generate HTML report${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ HTML report generated: $HTML_DIR/index.html${NC}"
}

parse_coverage_data() {
    echo -e "${BLUE}Parsing coverage data...${NC}"
    
    if [ ! -f "$LCOV_FILE" ]; then
        echo -e "${RED}Error: No coverage data found${NC}"
        return 1
    fi
    
    # Extract coverage percentages
    local lines_found=$(grep -o "LF:[0-9]*" "$LCOV_FILE" | cut -d: -f2 | awk '{sum+=$1} END {print sum}')
    local lines_hit=$(grep -o "LH:[0-9]*" "$LCOV_FILE" | cut -d: -f2 | awk '{sum+=$1} END {print sum}')
    local functions_found=$(grep -o "FNF:[0-9]*" "$LCOV_FILE" | cut -d: -f2 | awk '{sum+=$1} END {print sum}' || echo "0")
    local functions_hit=$(grep -o "FNH:[0-9]*" "$LCOV_FILE" | cut -d: -f2 | awk '{sum+=$1} END {print sum}' || echo "0")
    local branches_found=$(grep -o "BRF:[0-9]*" "$LCOV_FILE" | cut -d: -f2 | awk '{sum+=$1} END {print sum}' || echo "0")
    local branches_hit=$(grep -o "BRH:[0-9]*" "$LCOV_FILE" | cut -d: -f2 | awk '{sum+=$1} END {print sum}' || echo "0")
    
    # Calculate percentages
    if [ "$lines_found" -gt 0 ]; then
        LINE_COVERAGE=$(echo "scale=2; $lines_hit * 100 / $lines_found" | bc)
    else
        LINE_COVERAGE="0.00"
    fi
    
    if [ "$functions_found" -gt 0 ]; then
        FUNCTION_COVERAGE=$(echo "scale=2; $functions_hit * 100 / $functions_found" | bc)
    else
        FUNCTION_COVERAGE="0.00"
    fi
    
    if [ "$branches_found" -gt 0 ]; then
        BRANCH_COVERAGE=$(echo "scale=2; $branches_hit * 100 / $branches_found" | bc)
    else
        BRANCH_COVERAGE="0.00"
    fi
    
    echo -e "${GREEN}✅ Coverage data parsed${NC}"
}

generate_coverage_summary() {
    echo -e "${BLUE}Coverage Summary:${NC}"
    echo "================================================"
    printf "Lines:     %8s%% (threshold: %d%%)\n" "$LINE_COVERAGE" "$LINE_THRESHOLD"
    printf "Functions: %8s%% (threshold: %d%%)\n" "$FUNCTION_COVERAGE" "$FUNCTION_THRESHOLD"
    printf "Branches:  %8s%% (threshold: %d%%)\n" "$BRANCH_COVERAGE" "$BRANCH_THRESHOLD"
    echo "================================================"
    
    # Generate JSON summary
    cat > "$RESULTS_DIR/coverage_summary.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "line_coverage": $LINE_COVERAGE,
  "function_coverage": $FUNCTION_COVERAGE,
  "branch_coverage": $BRANCH_COVERAGE,
  "thresholds": {
    "line_threshold": $LINE_THRESHOLD,
    "function_threshold": $FUNCTION_THRESHOLD,
    "branch_threshold": $BRANCH_THRESHOLD
  },
  "files": {
    "lcov": "$LCOV_FILE",
    "html_report": "$HTML_DIR/index.html"
  }
}
EOF
    
    echo -e "${GREEN}✅ Coverage summary saved: $RESULTS_DIR/coverage_summary.json${NC}"
}

check_thresholds() {
    echo -e "${BLUE}Checking coverage thresholds...${NC}"
    
    local failed=0
    
    # Check line coverage
    if (( $(echo "$LINE_COVERAGE < $LINE_THRESHOLD" | bc -l) )); then
        echo -e "${RED}❌ Line coverage ($LINE_COVERAGE%) below threshold ($LINE_THRESHOLD%)${NC}"
        failed=1
    else
        echo -e "${GREEN}✅ Line coverage ($LINE_COVERAGE%) meets threshold${NC}"
    fi
    
    # Check function coverage
    if (( $(echo "$FUNCTION_COVERAGE < $FUNCTION_THRESHOLD" | bc -l) )); then
        echo -e "${RED}❌ Function coverage ($FUNCTION_COVERAGE%) below threshold ($FUNCTION_THRESHOLD%)${NC}"
        failed=1
    else
        echo -e "${GREEN}✅ Function coverage ($FUNCTION_COVERAGE%) meets threshold${NC}"
    fi
    
    # Check branch coverage
    if (( $(echo "$BRANCH_COVERAGE < $BRANCH_THRESHOLD" | bc -l) )); then
        echo -e "${RED}❌ Branch coverage ($BRANCH_COVERAGE%) below threshold ($BRANCH_THRESHOLD%)${NC}"
        failed=1
    else
        echo -e "${GREEN}✅ Branch coverage ($BRANCH_COVERAGE%) meets threshold${NC}"
    fi
    
    if [ $failed -eq 1 ]; then
        echo -e "${RED}❌ Coverage thresholds not met${NC}"
        return 1
    else
        echo -e "${GREEN}✅ All coverage thresholds met${NC}"
        return 0
    fi
}

generate_badge() {
    echo -e "${BLUE}Generating coverage badge...${NC}"
    
    local color="red"
    local coverage_int=$(echo "$LINE_COVERAGE" | cut -d. -f1)
    
    if [ "$coverage_int" -ge 90 ]; then
        color="brightgreen"
    elif [ "$coverage_int" -ge 80 ]; then
        color="green"
    elif [ "$coverage_int" -ge 70 ]; then
        color="yellow"
    elif [ "$coverage_int" -ge 60 ]; then
        color="orange"
    fi
    
    # Create badge URL (shields.io format)
    local badge_url="https://img.shields.io/badge/coverage-${LINE_COVERAGE}%25-${color}"
    echo "$badge_url" > "$RESULTS_DIR/coverage_badge.txt"
    
    echo -e "${GREEN}✅ Coverage badge URL saved: $RESULTS_DIR/coverage_badge.txt${NC}"
}

print_final_summary() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}           Coverage Report Complete${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo "📊 Reports generated:"
    echo "   • LCOV data: $LCOV_FILE"
    echo "   • HTML report: $HTML_DIR/index.html"
    echo "   • JSON summary: $RESULTS_DIR/coverage_summary.json"
    echo "   • Coverage badge: $RESULTS_DIR/coverage_badge.txt"
    echo ""
    echo "🌐 View HTML report:"
    echo "   open $HTML_DIR/index.html"
    echo ""
}

# Main execution
main() {
    local skip_tests=false
    local fail_on_threshold=true
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --no-fail-on-threshold)
                fail_on_threshold=false
                shift
                ;;
            --line-threshold)
                LINE_THRESHOLD="$2"
                shift 2
                ;;
            --function-threshold)
                FUNCTION_THRESHOLD="$2"
                shift 2
                ;;
            --branch-threshold)
                BRANCH_THRESHOLD="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --skip-tests              Skip running tests, use existing coverage data"
                echo "  --no-fail-on-threshold    Don't exit with error if thresholds not met"
                echo "  --line-threshold NUM      Set line coverage threshold (default: 80)"
                echo "  --function-threshold NUM  Set function coverage threshold (default: 85)"
                echo "  --branch-threshold NUM    Set branch coverage threshold (default: 75)"
                echo "  --help                    Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    print_banner
    check_dependencies
    setup_directories
    
    if [ "$skip_tests" = false ]; then
        run_tests_with_coverage
    fi
    
    parse_coverage_data
    generate_html_report
    generate_coverage_summary
    generate_badge
    
    if [ "$fail_on_threshold" = true ]; then
        if ! check_thresholds; then
            exit 1
        fi
    else
        check_thresholds || true
    fi
    
    print_final_summary
    
    echo -e "${GREEN}🎉 Coverage report generation complete!${NC}"
}

# Run main function
main "$@"