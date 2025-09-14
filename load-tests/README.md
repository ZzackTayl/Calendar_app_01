# 🚀 Conflict Detection Load Testing Suite

Comprehensive performance validation suite for the Calendar App's conflict detection system, designed to ensure production readiness under high-load scenarios.

## 📋 Overview

This load testing suite validates the conflict detection performance across multiple dimensions:

- **Concurrent User Scenarios** with conflicting operations
- **Database Locking Mechanisms** under high load
- **Race Condition Detection** and resolution
- **API Response Times** during conflict scenarios
- **Memory Usage** and resource consumption
- **Scalability Limits** for conflict detection
- **Edge Cases** with simultaneous conflicting requests

## 🛠️ Prerequisites

### Required Tools
- [k6](https://k6.io/docs/get-started/installation/) - Load testing tool
- Node.js (v14+) - For report generation
- Bash shell - For test execution scripts

### Installation

```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Ubuntu/Debian)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Install k6 (Windows)
# Download and install from https://k6.io/docs/get-started/installation/
```

### Verify Installation
```bash
k6 version
```

## 🏃‍♂️ Quick Start

### 1. Basic Test Run
```bash
# Make script executable (Unix systems)
chmod +x run-tests.sh

# Run complete test suite
./run-tests.sh

# Run with custom base URL
./run-tests.sh --base-url http://localhost:3000
```

### 2. Individual Test Execution
```bash
# Conflict detection tests only
npm run test:conflict-detection

# Database stress tests only
npm run test:database-stress

# Memory and resource tests only
npm run test:memory-resource
```

### 3. Quick Validation
```bash
# Validate test scripts
npm run validate-tests

# Run quick test suite
npm run test:quick
```

## 📊 Test Components

### 🎯 Conflict Detection Tests (`conflict-detection-load-test.js`)

**Purpose**: Validates conflict detection accuracy and performance under concurrent load

**Test Scenarios**:
- **Concurrent Conflict Detection**: 30 VUs ramping to test simultaneous operations
- **Race Condition Testing**: 20 VUs with 200 shared iterations
- **Database Lock Testing**: 15 VUs constant load for 2 minutes
- **Scalability Limits**: Ramping arrival rate up to 100 VUs
- **Edge Case Testing**: 10 VUs with 50 iterations each

**Key Metrics**:
- Conflict detection response time
- Conflict accuracy rate
- Race condition detection
- Concurrent operation success rate

### 🗄️ Database Stress Tests (`database-stress-test.js`)

**Purpose**: Tests database performance, locking mechanisms, and transaction handling

**Test Scenarios**:
- **Database Concurrency**: 20 req/sec constant arrival rate
- **Connection Pool Stress**: Ramping VUs to 60 maximum
- **Deadlock Simulation**: 10 VUs with 100 shared iterations

**Key Metrics**:
- Database query response time
- Connection pool utilization
- Transaction deadlock detection
- Query retry patterns

### 🧠 Memory & Resource Tests (`memory-resource-test.js`)

**Purpose**: Monitors memory consumption, cache efficiency, and resource cleanup

**Test Scenarios**:
- **Memory Baseline**: 10 VUs constant for 2 minutes
- **Batch Memory Testing**: Ramping VUs to 25 maximum
- **Memory Leak Detection**: 5 VUs constant for 5 minutes
- **Cache Efficiency**: 10 req/sec arrival rate
- **Resource Cleanup**: 8 VUs with 80 shared iterations

**Key Metrics**:
- Memory usage patterns
- Cache hit/miss ratios
- Resource cleanup efficiency
- Batch processing performance

## 📈 Performance Thresholds

| Metric | Threshold | Impact |
|--------|-----------|---------|
| HTTP Request Duration | p(95)<5000ms | Critical |
| HTTP Request Failure Rate | <5% | Critical |
| Conflict Detection Time | p(95)<2000ms | High |
| Database Query Time | p(95)<1500ms | High |
| Memory Usage | Avg<512MB | Medium |
| Cache Hit Rate | >30% | Medium |

## 📋 Results and Reporting

### Automated Report Generation

After test completion, reports are automatically generated:

```
load-test-results/YYYYMMDD_HHMMSS/
├── conflict-detection/
│   ├── conflict-detection-load-test-report.html
│   ├── conflict-detection-analysis.json
│   └── execution.log
├── database-stress/
│   ├── database-stress-test-analysis.json
│   └── execution.log
├── memory-resource/
│   ├── memory-resource-analysis.json
│   └── execution.log
├── summary/
│   ├── index.html                    # Executive dashboard
│   └── test-summary.txt             # Text summary
└── reports/
    ├── comprehensive-performance-analysis.json
    ├── frontend-engineer-report.json
    ├── deployment-specialist-report.json
    └── executive-summary.md
```

### Stakeholder Reports

#### 👨‍💻 Frontend Engineer Report
- API performance metrics
- Recommended timeout settings
- UX impact analysis
- Client-side optimization recommendations

#### 🚀 Deployment Specialist Report
- Infrastructure requirements
- Scaling configuration
- Monitoring setup guidelines
- Production optimization checklist

### Generate Additional Reports
```bash
# Generate comprehensive analysis
node performance-report-generator.js ./load-test-results/latest

# Serve results via HTTP
npm run serve-results
# Then visit http://localhost:8080
```

## 🎛️ Configuration Options

### Environment Variables
```bash
BASE_URL=http://localhost:3000          # Application base URL
MAX_VUS=50                             # Maximum virtual users
DURATION=5m                            # Test duration
MEMORY_THRESHOLD_MB=512                # Memory usage threshold
RESPONSE_SIZE_THRESHOLD_KB=100         # Response size threshold
```

### Custom Test Configuration
Edit `package.json` to modify default thresholds:

```json
{
  "loadTestConfig": {
    "thresholds": {
      "conflictDetectionTime": "2000ms",
      "databaseQueryTime": "1500ms",
      "memoryUsage": "512MB",
      "errorRate": "5%"
    }
  }
}
```

## 🔧 Advanced Usage

### Custom Load Patterns
```javascript
// Example: Custom ramping pattern
scenarios: {
  custom_load: {
    executor: 'ramping-vus',
    stages: [
      { duration: '2m', target: 10 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 0 }
    ]
  }
}
```

### Production Testing
```bash
# Test against production environment
npm run test:production

# Or with custom URL
./run-tests.sh --base-url https://your-production-domain.com
```

### Continuous Integration
```yaml
# Example GitHub Actions workflow
name: Load Tests
on: [push, pull_request]
jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run Load Tests
        run: |
          cd load-tests
          ./run-tests.sh --base-url ${{ secrets.TEST_BASE_URL }}
```

## 🐛 Troubleshooting

### Common Issues

#### Tests Failing to Start
```bash
# Check if application is running
curl http://localhost:3000/api/health

# Verify k6 installation
k6 version

# Check permissions (Unix)
chmod +x run-tests.sh
```

#### High Error Rates
- Verify application can handle the load
- Check database connection limits
- Review rate limiting configuration
- Monitor server resources during tests

#### Memory Issues
- Reduce MAX_VUS if running on limited hardware
- Increase server memory allocation
- Check for memory leaks in application

### Performance Debugging

```bash
# Enable verbose logging
k6 run --verbose conflict-detection-load-test.js

# Run single user test for debugging
k6 run --vus 1 --duration 30s conflict-detection-load-test.js

# Check HTTP response details
k6 run --http-debug conflict-detection-load-test.js
```

## 📊 Interpreting Results

### Performance Ratings

| Rating | Description | Action Required |
|--------|-------------|-----------------|
| **Excellent** | All metrics within optimal ranges | Ready for production |
| **Good** | Minor issues, within acceptable limits | Monitor in production |
| **Acceptable** | Some performance concerns | Address issues before production |
| **Needs Improvement** | Several performance issues | Optimization required |
| **Critical** | Major performance problems | Significant fixes needed |

### Key Performance Indicators

#### ✅ Healthy System
- Conflict detection < 2s (95th percentile)
- Database queries < 1.5s (95th percentile)
- Memory usage < 80% of allocated
- Cache hit rate > 60%
- Error rate < 2%

#### ⚠️ Warning Signs
- Increasing response times under load
- High database connection pool utilization
- Memory usage trending upward
- Low cache hit rates
- Intermittent errors during peak load

#### 🚨 Critical Issues
- Response times > 5s consistently
- Database deadlocks detected
- Memory leaks identified
- High error rates (>5%)
- System instability under load

## 🤝 Contributing

### Adding New Tests
1. Create test file in appropriate category
2. Follow existing naming conventions
3. Include proper metrics and thresholds
4. Add documentation for new scenarios
5. Update this README with new test information

### Test Best Practices
- Use realistic test data
- Implement proper cleanup
- Monitor resource usage
- Include error handling
- Document expected behavior

## 📚 References

- [k6 Documentation](https://k6.io/docs/)
- [Load Testing Best Practices](https://k6.io/docs/testing-guides/load-testing-best-practices/)
- [Performance Testing Guidelines](https://k6.io/docs/testing-guides/performance-testing/)

## 📞 Support

For questions or issues with the load testing suite:

1. Check this README for common solutions
2. Review the troubleshooting section
3. Examine test execution logs
4. Create an issue with:
   - Test configuration used
   - Error messages or logs
   - System specifications
   - Expected vs actual behavior

---

*Last updated: $(date)*

## 📄 License

This load testing suite is part of the Calendar App project and follows the same licensing terms.