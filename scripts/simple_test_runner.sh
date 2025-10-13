#!/bin/bash

# Simple MyOrbit Test Runner
# Basic test execution and coverage reporting

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
CATEGORY=${1:-all}
COVERAGE=${2:-true}

echo -e "${BLUE}🚀 MyOrbit Test Runner${NC}"
echo "Category: $CATEGORY"
echo "Coverage: $COVERAGE"
echo ""

case $CATEGORY in
    "unit")
        echo -e "${BLUE}📋 Running unit tests...${NC}"
        flutter test test/services/ test/helpers/ test/*_test.dart
        ;;
    "widget")
        echo -e "${BLUE}🎨 Running widget tests...${NC}"
        flutter test test/widgets/ test/screens/
        ;;
    "integration")
        echo -e "${BLUE}🔗 Running integration tests...${NC}"
        flutter test test/integration/
        ;;
    "accessibility")
        echo -e "${BLUE}♿ Running accessibility tests...${NC}"
        flutter test test/widgets/accessibility/
        ;;
    "all")
        echo -e "${BLUE}🧪 Running all tests...${NC}"
        if [ "$COVERAGE" == "true" ]; then
            flutter test --coverage
        else
            flutter test
        fi
        ;;
    *)
        echo -e "${RED}❌ Unknown category: $CATEGORY${NC}"
        echo "Available categories: unit, widget, integration, accessibility, all"
        exit 1
        ;;
esac

if [ "$COVERAGE" == "true" ] && [ "$CATEGORY" != "all" ]; then
    echo -e "${BLUE}📊 Generating coverage report...${NC}"
    flutter test --coverage
fi

echo -e "${GREEN}✅ Test execution completed${NC}"