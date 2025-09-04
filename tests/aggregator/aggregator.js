/**
 * Test Result Aggregator Service
 * 
 * Centralized service for collecting, analyzing, and reporting
 * test results from all testing tiers in the PolyHarmony Calendar.
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.AGGREGATOR_PORT || 8080;
const RESULTS_DIR = process.env.RESULTS_DIR || '/results';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Logging utility
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data || '');
  return logEntry;
};

/**
 * Test Result Aggregator Class
 */
class TestResultAggregator {
  constructor(resultsDir) {
    this.resultsDir = resultsDir;
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      performance: null,
      security: null
    };
    this.aggregatedReport = null;
    this.lastAggregation = null;
  }

  /**
   * Load test results from all tiers
   */
  async loadAllResults() {
    log('info', 'Loading test results from all tiers...');
    
    try {
      const tiers = ['unit', 'integration', 'e2e', 'performance', 'security'];
      
      for (const tier of tiers) {
        try {
          this.results[tier] = await this.loadTierResults(tier);
          log('info', `Loaded ${tier} test results`);
        } catch (error) {
          log('warn', `Failed to load ${tier} results: ${error.message}`);
          this.results[tier] = { error: error.message, available: false };
        }
      }
      
      log('success', 'All available test results loaded');
      return this.results;
      
    } catch (error) {
      log('error', 'Failed to load test results', error);
      throw error;
    }
  }

  /**
   * Load results for a specific test tier
   */
  async loadTierResults(tier) {
    const tierDir = path.join(this.resultsDir, tier);
    
    try {
      const stats = await fs.stat(tierDir);
      if (!stats.isDirectory()) {
        throw new Error(`${tier} results directory not found`);
      }
      
      const files = await fs.readdir(tierDir);
      const results = {
        tier,
        available: true,
        timestamp: stats.mtime,
        files: files,
        summary: null,
        details: {},
        coverage: null,
        metrics: {}
      };
      
      // Load summary file if available
      const summaryFile = path.join(tierDir, 'summary.json');
      try {
        const summaryContent = await fs.readFile(summaryFile, 'utf8');
        results.summary = JSON.parse(summaryContent);
      } catch (error) {
        log('warn', `No summary file for ${tier}: ${error.message}`);
      }
      
      // Load coverage data for unit tests
      if (tier === 'unit') {
        try {
          const coverageFile = path.join(tierDir, 'coverage-summary.json');
          const coverageContent = await fs.readFile(coverageFile, 'utf8');
          results.coverage = JSON.parse(coverageContent);
        } catch (error) {
          log('warn', `No coverage data for ${tier}: ${error.message}`);
        }
      }
      
      // Load performance metrics
      if (tier === 'performance') {
        try {
          const metricsFile = path.join(tierDir, 'metrics.json');
          const metricsContent = await fs.readFile(metricsFile, 'utf8');
          results.metrics = JSON.parse(metricsContent);
        } catch (error) {
          log('warn', `No metrics data for ${tier}: ${error.message}`);
        }
      }
      
      // Load detailed results for each file
      for (const file of files) {
        if (file.endsWith('.json') && file !== 'summary.json' && file !== 'coverage-summary.json') {
          try {
            const filePath = path.join(tierDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            results.details[file] = JSON.parse(content);
          } catch (error) {
            log('warn', `Failed to load ${file} in ${tier}: ${error.message}`);
          }
        }
      }
      
      return results;
      
    } catch (error) {
      log('error', `Error loading ${tier} results`, error);
      throw error;
    }
  }

  /**
   * Aggregate all test results into comprehensive report
   */
  async aggregateResults() {
    log('info', 'Aggregating test results...');
    
    try {
      await this.loadAllResults();
      
      const aggregation = {
        timestamp: new Date().toISOString(),
        framework: 'PolyHarmony Calendar Testing Suite',
        version: '1.0.0',
        summary: {
          totalTiers: 0,
          passedTiers: 0,
          failedTiers: 0,
          skippedTiers: 0,
          overallSuccess: false,
          overallCoverage: null,
          executionTime: null,
          qualityGates: []
        },
        tiers: {},
        metrics: {
          performance: {},
          coverage: {},
          security: {},
          reliability: {}
        },
        recommendations: [],
        qualityAssurance: {
          codeQuality: null,
          securityPosture: null,
          performanceBenchmarks: null,
          testCoverage: null
        }
      };
      
      // Process each tier
      for (const [tierName, tierResults] of Object.entries(this.results)) {
        if (!tierResults || !tierResults.available) {
          aggregation.summary.skippedTiers++;
          aggregation.tiers[tierName] = {
            status: 'skipped',
            reason: tierResults?.error || 'No results available'
          };
          continue;
        }
        
        aggregation.summary.totalTiers++;
        
        const tierAnalysis = this.analyzeTierResults(tierName, tierResults);
        aggregation.tiers[tierName] = tierAnalysis;
        
        if (tierAnalysis.success) {
          aggregation.summary.passedTiers++;
        } else {
          aggregation.summary.failedTiers++;
        }
      }
      
      // Calculate overall success
      aggregation.summary.overallSuccess = 
        aggregation.summary.failedTiers === 0 && 
        aggregation.summary.passedTiers > 0;
      
      // Aggregate metrics
      await this.aggregateMetrics(aggregation);
      
      // Generate quality gates
      await this.evaluateQualityGates(aggregation);
      
      // Generate recommendations
      aggregation.recommendations = this.generateRecommendations(aggregation);
      
      this.aggregatedReport = aggregation;
      this.lastAggregation = new Date();
      
      // Save aggregated report
      await this.saveAggregatedReport(aggregation);
      
      log('success', 'Test result aggregation completed');
      return aggregation;
      
    } catch (error) {
      log('error', 'Failed to aggregate test results', error);
      throw error;
    }
  }

  /**
   * Analyze results for a specific tier
   */
  analyzeTierResults(tierName, tierResults) {
    const analysis = {
      tier: tierName,
      success: false,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      testsSkipped: 0,
      executionTime: 0,
      coverage: null,
      errors: [],
      warnings: [],
      metrics: {}
    };

    try {
      // Analyze based on tier type
      switch (tierName) {
        case 'unit':
          this.analyzeUnitTestResults(tierResults, analysis);
          break;
        case 'integration':
          this.analyzeIntegrationTestResults(tierResults, analysis);
          break;
        case 'e2e':
          this.analyzeE2ETestResults(tierResults, analysis);
          break;
        case 'performance':
          this.analyzePerformanceTestResults(tierResults, analysis);
          break;
        case 'security':
          this.analyzeSecurityTestResults(tierResults, analysis);
          break;
      }
      
      // Determine overall success for this tier
      analysis.success = analysis.testsFailed === 0 && analysis.testsRun > 0;
      
    } catch (error) {
      log('error', `Failed to analyze ${tierName} results`, error);
      analysis.errors.push(`Analysis error: ${error.message}`);
    }

    return analysis;
  }

  /**
   * Analyze unit test results
   */
  analyzeUnitTestResults(tierResults, analysis) {
    if (tierResults.summary) {
      analysis.testsRun = tierResults.summary.numTotalTests || 0;
      analysis.testsPassed = tierResults.summary.numPassedTests || 0;
      analysis.testsFailed = tierResults.summary.numFailedTests || 0;
      analysis.testsSkipped = tierResults.summary.numSkippedTests || 0;
      analysis.executionTime = tierResults.summary.executionTime || 0;
    }
    
    if (tierResults.coverage && tierResults.coverage.total) {
      analysis.coverage = {
        lines: tierResults.coverage.total.lines.pct,
        functions: tierResults.coverage.total.functions.pct,
        branches: tierResults.coverage.total.branches.pct,
        statements: tierResults.coverage.total.statements.pct
      };
    }
  }

  /**
   * Analyze integration test results
   */
  analyzeIntegrationTestResults(tierResults, analysis) {
    // Integration test analysis logic
    if (tierResults.summary) {
      analysis.testsRun = tierResults.summary.tests || 0;
      analysis.testsPassed = tierResults.summary.passed || 0;
      analysis.testsFailed = tierResults.summary.failed || 0;
      analysis.executionTime = tierResults.summary.duration || 0;
    }
  }

  /**
   * Analyze E2E test results
   */
  analyzeE2ETestResults(tierResults, analysis) {
    // E2E test analysis logic
    if (tierResults.summary) {
      analysis.testsRun = tierResults.summary.tests || 0;
      analysis.testsPassed = tierResults.summary.passed || 0;
      analysis.testsFailed = tierResults.summary.failed || 0;
      analysis.executionTime = tierResults.summary.duration || 0;
    }
  }

  /**
   * Analyze performance test results
   */
  analyzePerformanceTestResults(tierResults, analysis) {
    if (tierResults.metrics) {
      analysis.metrics = {
        averageResponseTime: tierResults.metrics.averageResponseTime,
        throughput: tierResults.metrics.throughput,
        errorRate: tierResults.metrics.errorRate,
        concurrentUsers: tierResults.metrics.concurrentUsers
      };
    }
    
    // Performance tests are successful if they meet benchmarks
    analysis.success = true; // Default to true, specific benchmarks would determine this
  }

  /**
   * Analyze security test results
   */
  analyzeSecurityTestResults(tierResults, analysis) {
    if (tierResults.summary) {
      analysis.testsRun = tierResults.summary.securityTests || 0;
      analysis.testsPassed = tierResults.summary.passed || 0;
      analysis.testsFailed = tierResults.summary.vulnerabilities || 0;
      
      analysis.metrics = {
        vulnerabilities: tierResults.summary.vulnerabilities || 0,
        rlsPoliciesTested: tierResults.summary.rlsPolicies || 0,
        authTestsPassed: tierResults.summary.authTests || 0
      };
    }
  }

  /**
   * Aggregate metrics from all tiers
   */
  async aggregateMetrics(aggregation) {
    // Performance metrics
    if (this.results.performance && this.results.performance.available) {
      aggregation.metrics.performance = this.results.performance.metrics || {};
    }
    
    // Coverage metrics
    if (this.results.unit && this.results.unit.coverage) {
      aggregation.metrics.coverage = this.results.unit.coverage.total;
      aggregation.summary.overallCoverage = this.results.unit.coverage.total.lines.pct;
    }
    
    // Security metrics
    if (this.results.security && this.results.security.available) {
      aggregation.metrics.security = {
        vulnerabilities: aggregation.tiers.security?.metrics?.vulnerabilities || 0,
        rlsCoverage: aggregation.tiers.security?.metrics?.rlsPoliciesTested || 0
      };
    }
  }

  /**
   * Evaluate quality gates
   */
  async evaluateQualityGates(aggregation) {
    const gates = [
      {
        name: 'Unit Test Coverage',
        threshold: 90,
        value: aggregation.summary.overallCoverage,
        unit: '%',
        passed: aggregation.summary.overallCoverage >= 90
      },
      {
        name: 'Zero Security Vulnerabilities',
        threshold: 0,
        value: aggregation.metrics.security?.vulnerabilities || 0,
        unit: 'vulnerabilities',
        passed: (aggregation.metrics.security?.vulnerabilities || 0) === 0
      },
      {
        name: 'Performance Response Time',
        threshold: 500,
        value: aggregation.metrics.performance?.averageResponseTime || 0,
        unit: 'ms',
        passed: (aggregation.metrics.performance?.averageResponseTime || 0) <= 500
      },
      {
        name: 'Test Success Rate',
        threshold: 95,
        value: this.calculateOverallTestSuccessRate(aggregation),
        unit: '%',
        passed: this.calculateOverallTestSuccessRate(aggregation) >= 95
      }
    ];
    
    aggregation.summary.qualityGates = gates;
  }

  /**
   * Calculate overall test success rate
   */
  calculateOverallTestSuccessRate(aggregation) {
    let totalTests = 0;
    let passedTests = 0;
    
    Object.values(aggregation.tiers).forEach(tier => {
      if (tier.testsRun) {
        totalTests += tier.testsRun;
        passedTests += tier.testsPassed;
      }
    });
    
    return totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations(aggregation) {
    const recommendations = [];
    
    // Coverage recommendations
    if (aggregation.summary.overallCoverage < 90) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        message: `Test coverage is ${aggregation.summary.overallCoverage}%, below the 90% threshold. Increase unit test coverage.`
      });
    }
    
    // Security recommendations
    const vulnerabilities = aggregation.metrics.security?.vulnerabilities || 0;
    if (vulnerabilities > 0) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: `${vulnerabilities} security vulnerabilities detected. Address immediately.`
      });
    }
    
    // Performance recommendations
    const responseTime = aggregation.metrics.performance?.averageResponseTime;
    if (responseTime && responseTime > 500) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `Average response time is ${responseTime}ms, above 500ms threshold. Consider performance optimization.`
      });
    }
    
    // Failed test recommendations
    if (aggregation.summary.failedTiers > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: `${aggregation.summary.failedTiers} test tier(s) failed. Review and fix failing tests.`
      });
    }
    
    return recommendations;
  }

  /**
   * Save aggregated report to file
   */
  async saveAggregatedReport(aggregation) {
    try {
      const outputDir = path.join(this.resultsDir, 'comprehensive');
      await fs.mkdir(outputDir, { recursive: true });
      
      // Save full report
      const reportPath = path.join(outputDir, 'comprehensive-report.json');
      await fs.writeFile(reportPath, JSON.stringify(aggregation, null, 2));
      
      // Save summary
      const summaryPath = path.join(outputDir, 'summary.json');
      await fs.writeFile(summaryPath, JSON.stringify({
        success: aggregation.summary.overallSuccess,
        timestamp: aggregation.timestamp,
        summary: aggregation.summary,
        qualityGates: aggregation.summary.qualityGates,
        recommendations: aggregation.recommendations
      }, null, 2));
      
      // Generate JUnit XML for CI/CD integration
      const junitXml = this.generateJUnitXML(aggregation);
      const junitPath = path.join(outputDir, 'junit-results.xml');
      await fs.writeFile(junitPath, junitXml);
      
      log('success', `Reports saved to ${outputDir}`);
      
    } catch (error) {
      log('error', 'Failed to save aggregated report', error);
      throw error;
    }
  }

  /**
   * Generate JUnit XML for CI/CD integration
   */
  generateJUnitXML(aggregation) {
    const totalTests = Object.values(aggregation.tiers).reduce((sum, tier) => sum + (tier.testsRun || 0), 0);
    const totalFailures = Object.values(aggregation.tiers).reduce((sum, tier) => sum + (tier.testsFailed || 0), 0);
    const totalTime = Object.values(aggregation.tiers).reduce((sum, tier) => sum + (tier.executionTime || 0), 0);
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="${totalTests}" failures="${totalFailures}" time="${totalTime / 1000}">`;
    
    Object.entries(aggregation.tiers).forEach(([tierName, tierData]) => {
      xml += `
  <testsuite name="${tierName}" tests="${tierData.testsRun || 0}" failures="${tierData.testsFailed || 0}" time="${(tierData.executionTime || 0) / 1000}">`;
      
      if (tierData.testsFailed > 0) {
        xml += `
    <testcase name="${tierName} Tests" classname="TestSuite">
      <failure message="${tierData.testsFailed} tests failed">${tierData.errors.join('\n')}</failure>
    </testcase>`;
      } else {
        xml += `
    <testcase name="${tierName} Tests" classname="TestSuite"/>`;
      }
      
      xml += `
  </testsuite>`;
    });
    
    xml += `
</testsuites>`;
    
    return xml;
  }
}

// Initialize aggregator
const aggregator = new TestResultAggregator(RESULTS_DIR);

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'test-result-aggregator',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/results', async (req, res) => {
  try {
    const results = await aggregator.loadAllResults();
    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load test results',
      message: error.message
    });
  }
});

app.get('/aggregate', async (req, res) => {
  try {
    const aggregatedReport = await aggregator.aggregateResults();
    res.json(aggregatedReport);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to aggregate test results',
      message: error.message
    });
  }
});

app.get('/report', (req, res) => {
  if (!aggregator.aggregatedReport) {
    return res.status(404).json({
      error: 'No aggregated report available',
      message: 'Run /aggregate first to generate a report'
    });
  }
  
  res.json(aggregator.aggregatedReport);
});

app.get('/summary', (req, res) => {
  if (!aggregator.aggregatedReport) {
    return res.status(404).json({
      error: 'No aggregated report available',
      message: 'Run /aggregate first to generate a report'
    });
  }
  
  res.json({
    success: aggregator.aggregatedReport.summary.overallSuccess,
    timestamp: aggregator.aggregatedReport.timestamp,
    summary: aggregator.aggregatedReport.summary,
    recommendations: aggregator.aggregatedReport.recommendations
  });
});

// Start server
app.listen(PORT, () => {
  log('info', `Test Result Aggregator Service started on port ${PORT}`);
  
  // Auto-aggregate results if available
  setTimeout(async () => {
    try {
      await aggregator.aggregateResults();
      log('info', 'Initial aggregation completed');
    } catch (error) {
      log('warn', 'Initial aggregation failed - results may not be available yet');
    }
  }, 5000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('info', 'Received SIGINT, shutting down gracefully...');
  process.exit(0);
});