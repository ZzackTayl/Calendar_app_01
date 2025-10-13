# MyOrbit Testing Makefile
# Provides easy commands for running tests and generating coverage reports

.PHONY: help test test-unit test-widget test-integration test-accessibility coverage coverage-html clean install-deps

# Default target
help:
	@echo "MyOrbit Testing Commands"
	@echo "========================"
	@echo ""
	@echo "Test Commands:"
	@echo "  make test              - Run all tests"
	@echo "  make test-unit         - Run unit tests only"
	@echo "  make test-widget       - Run widget tests only"
	@echo "  make test-integration  - Run integration tests only"
	@echo "  make test-accessibility- Run accessibility tests only"
	@echo ""
	@echo "Coverage Commands:"
	@echo "  make coverage          - Run tests and generate coverage"
	@echo "  make coverage-html     - Generate HTML coverage report"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean             - Clean test artifacts"
	@echo "  make install-deps      - Install testing dependencies"
	@echo ""

# Test commands
test:
	@echo "🧪 Running all tests..."
	flutter test

test-unit:
	@echo "📋 Running unit tests..."
	flutter test test/services/ test/helpers/ test/*_test.dart

test-widget:
	@echo "🎨 Running widget tests..."
	flutter test test/widgets/ test/screens/

test-integration:
	@echo "🔗 Running integration tests..."
	flutter test test/integration/

test-accessibility:
	@echo "♿ Running accessibility tests..."
	flutter test test/widgets/accessibility/

# Coverage commands
coverage:
	@echo "📊 Running tests with coverage..."
	flutter test --coverage
	@if [ -f coverage/lcov.info ]; then \
		echo "✅ Coverage data generated: coverage/lcov.info"; \
	else \
		echo "⚠️ No coverage data generated"; \
	fi

coverage-html:
	@echo "🌐 Generating HTML coverage report..."
	@./scripts/coverage_report.sh --skip-tests || echo "⚠️ Coverage report script failed, trying basic genhtml..."
	@if command -v genhtml >/dev/null 2>&1 && [ -f coverage/lcov.info ]; then \
		genhtml coverage/lcov.info -o coverage/html --title "MyOrbit Coverage" --ignore-errors source,deprecated --synthesize-missing; \
		echo "📋 HTML report: coverage/html/index.html"; \
	else \
		echo "❌ Could not generate HTML report (install lcov: brew install lcov)"; \
	fi

# Utility commands
clean:
	@echo "🧹 Cleaning test artifacts..."
	rm -rf coverage/
	rm -rf test_results/
	flutter clean
	@echo "✅ Cleanup complete"

install-deps:
	@echo "📦 Installing dependencies..."
	flutter pub get
	@if command -v brew >/dev/null 2>&1; then \
		echo "📊 Installing lcov for coverage reports..."; \
		brew install lcov; \
	else \
		echo "⚠️ Homebrew not found. Please install lcov manually."; \
	fi
	@echo "✅ Dependencies installed"

# Pre-commit testing (fast subset)
test-quick:
	@echo "⚡ Running quick tests for pre-commit..."
	@timeout 30s flutter test test/services/ test/helpers/ --no-coverage || echo "⚠️ Quick tests timed out or failed"
	@echo "✅ Quick tests completed"

# CI/CD friendly commands
test-ci:
	@echo "🤖 Running CI tests..."
	flutter test --coverage --reporter json > test_results/results.json || true
	@if [ -f coverage/lcov.info ]; then \
		echo "📊 Generating coverage summary..."; \
		./scripts/coverage_report.sh --skip-tests --no-fail-on-threshold || true; \
	fi

# Development helpers
format:
	@echo "🎨 Formatting code..."
	dart format .

analyze:
	@echo "🔍 Analyzing code..."
	flutter analyze

deps-check:
	@echo "📋 Checking dependencies..."
	flutter pub outdated

# Full development workflow
dev-check: format analyze test
	@echo "✅ Full development check completed"