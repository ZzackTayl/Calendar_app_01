'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Progress } from './progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  BarChart3,
  RefreshCw,
  Settings,
  Zap,
  Target,
  Users,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import {
  CognitivePattern,
  PatternPerformanceMetrics,
  cognitiveOptimizer,
  COGNITIVE_PATTERNS
} from '@/lib/cognitive-patterns';
import { cn } from '@/lib/utils';

interface CognitivePatternMonitorProps {
  className?: string;
  refreshInterval?: number; // in milliseconds
  showDetailedMetrics?: boolean;
  compactView?: boolean;
}

interface MetricCardProps {
  label: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'poor';
  icon?: React.ComponentType<{ className?: string }>;
}

interface PatternPerformanceCardProps {
  pattern: CognitivePattern;
  metrics: PatternPerformanceMetrics[];
  isSelected?: boolean;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit = '%',
  trend,
  status = 'good',
  icon: Icon
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;
  
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-orange-600';
      case 'poor': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <TrendIcon className={cn("w-4 h-4", getStatusColor())} />
      </div>
      <div className="flex items-end space-x-1">
        <span className={cn("text-2xl font-bold", getStatusColor())}>
          {value.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
};

const PatternPerformanceCard: React.FC<PatternPerformanceCardProps> = ({
  pattern,
  metrics,
  isSelected,
  onClick
}) => {
  const config = COGNITIVE_PATTERNS[pattern];
  
  const averageMetrics = useMemo(() => {
    if (metrics.length === 0) {
      return {
        successRate: 0,
        efficiency: 0,
        userSatisfaction: 0,
        adaptability: 0
      };
    }

    const totals = metrics.reduce(
      (acc, metric) => ({
        successRate: acc.successRate + metric.successRate,
        efficiency: acc.efficiency + metric.efficiency,
        userSatisfaction: acc.userSatisfaction + metric.userSatisfaction,
        adaptability: acc.adaptability + metric.adaptability
      }),
      { successRate: 0, efficiency: 0, userSatisfaction: 0, adaptability: 0 }
    );

    return {
      successRate: (totals.successRate / metrics.length) * 100,
      efficiency: (totals.efficiency / metrics.length) * 100,
      userSatisfaction: (totals.userSatisfaction / metrics.length) * 100,
      adaptability: (totals.adaptability / metrics.length) * 100
    };
  }, [metrics]);

  const overallScore = useMemo(() => {
    const scores = Object.values(averageMetrics);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }, [averageMetrics]);

  const getScoreStatus = (score: number) => {
    if (score >= 80) return 'good';
    if (score >= 60) return 'warning';
    return 'poor';
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{config.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{metrics.length} data points</p>
          </div>
          <div className="text-right">
            <div className={cn(
              "text-xl font-bold",
              overallScore >= 80 ? "text-green-600" : 
              overallScore >= 60 ? "text-orange-600" : "text-red-600"
            )}>
              {overallScore.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Overall</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Success Rate</span>
              <span className="text-xs font-medium">{averageMetrics.successRate.toFixed(0)}%</span>
            </div>
            <Progress 
              value={averageMetrics.successRate} 
              className="h-1.5"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Efficiency</span>
              <span className="text-xs font-medium">{averageMetrics.efficiency.toFixed(0)}%</span>
            </div>
            <Progress 
              value={averageMetrics.efficiency} 
              className="h-1.5"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Satisfaction</span>
              <span className="text-xs font-medium">{averageMetrics.userSatisfaction.toFixed(0)}%</span>
            </div>
            <Progress 
              value={averageMetrics.userSatisfaction} 
              className="h-1.5"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Adaptability</span>
              <span className="text-xs font-medium">{averageMetrics.adaptability.toFixed(0)}%</span>
            </div>
            <Progress 
              value={averageMetrics.adaptability} 
              className="h-1.5"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CognitivePatternMonitor: React.FC<CognitivePatternMonitorProps> = ({
  className,
  refreshInterval = 30000, // 30 seconds
  showDetailedMetrics = true,
  compactView = false
}) => {
  const [performanceData, setPerformanceData] = useState<Map<CognitivePattern, PatternPerformanceMetrics[]>>(new Map());
  const [selectedPattern, setSelectedPattern] = useState<CognitivePattern | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Refresh performance data
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const data = cognitiveOptimizer.getPerformanceMetrics();
      setPerformanceData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh performance data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    refreshData();
    
    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Calculate overall system metrics
  const systemMetrics = useMemo(() => {
    let totalDataPoints = 0;
    let totalSuccessRate = 0;
    let totalEfficiency = 0;
    let totalSatisfaction = 0;
    let totalAdaptability = 0;

    performanceData.forEach((metrics) => {
      metrics.forEach((metric) => {
        totalDataPoints++;
        totalSuccessRate += metric.successRate;
        totalEfficiency += metric.efficiency;
        totalSatisfaction += metric.userSatisfaction;
        totalAdaptability += metric.adaptability;
      });
    });

    if (totalDataPoints === 0) {
      return {
        avgSuccessRate: 0,
        avgEfficiency: 0,
        avgSatisfaction: 0,
        avgAdaptability: 0,
        totalTasks: 0
      };
    }

    return {
      avgSuccessRate: (totalSuccessRate / totalDataPoints) * 100,
      avgEfficiency: (totalEfficiency / totalDataPoints) * 100,
      avgSatisfaction: (totalSatisfaction / totalDataPoints) * 100,
      avgAdaptability: (totalAdaptability / totalDataPoints) * 100,
      totalTasks: totalDataPoints
    };
  }, [performanceData]);

  // Get the best performing pattern
  const bestPattern = useMemo(() => {
    let bestScore = 0;
    let bestPatternName: CognitivePattern | null = null;

    performanceData.forEach((metrics, pattern) => {
      if (metrics.length === 0) return;

      const avgScore = metrics.reduce((sum, metric) => {
        return sum + (metric.successRate + metric.efficiency + metric.userSatisfaction + metric.adaptability) / 4;
      }, 0) / metrics.length;

      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestPatternName = pattern;
      }
    });

    return { pattern: bestPatternName, score: bestScore * 100 };
  }, [performanceData]);

  if (compactView) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Cognitive Patterns</div>
                <div className="text-sm text-muted-foreground">
                  {systemMetrics.totalTasks} tasks processed
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium">
                  {systemMetrics.avgEfficiency.toFixed(0)}% efficient
                </div>
                <div className="text-xs text-muted-foreground">
                  {systemMetrics.avgSatisfaction.toFixed(0)}% satisfaction
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Cognitive Pattern Monitor</h2>
            <p className="text-sm text-muted-foreground">
              Real-time performance tracking and optimization insights
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          
          <div className="text-xs text-muted-foreground">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>System Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Success Rate"
              value={systemMetrics.avgSuccessRate}
              icon={CheckCircle}
              status={systemMetrics.avgSuccessRate >= 80 ? 'good' : systemMetrics.avgSuccessRate >= 60 ? 'warning' : 'poor'}
            />
            
            <MetricCard
              label="Efficiency"
              value={systemMetrics.avgEfficiency}
              icon={Zap}
              status={systemMetrics.avgEfficiency >= 80 ? 'good' : systemMetrics.avgEfficiency >= 60 ? 'warning' : 'poor'}
            />
            
            <MetricCard
              label="User Satisfaction"
              value={systemMetrics.avgSatisfaction}
              icon={Users}
              status={systemMetrics.avgSatisfaction >= 80 ? 'good' : systemMetrics.avgSatisfaction >= 60 ? 'warning' : 'poor'}
            />
            
            <MetricCard
              label="Adaptability"
              value={systemMetrics.avgAdaptability}
              icon={RefreshCw}
              status={systemMetrics.avgAdaptability >= 80 ? 'good' : systemMetrics.avgAdaptability >= 60 ? 'warning' : 'poor'}
            />
          </div>
          
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Best Performing Pattern</div>
                <div className="text-sm text-muted-foreground">
                  {bestPattern.pattern ? COGNITIVE_PATTERNS[bestPattern.pattern].name : 'No data available'}
                </div>
              </div>
              {bestPattern.pattern && (
                <Badge variant="secondary">
                  {bestPattern.score.toFixed(1)}% effective
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Performance Grid */}
      {showDetailedMetrics && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Pattern Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(performanceData.entries()).map(([pattern, metrics]) => (
              <PatternPerformanceCard
                key={pattern}
                pattern={pattern}
                metrics={metrics}
                isSelected={selectedPattern === pattern}
                onClick={() => setSelectedPattern(pattern === selectedPattern ? null : pattern)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detailed Pattern Analysis */}
      {selectedPattern && showDetailedMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>
              {COGNITIVE_PATTERNS[selectedPattern].name} - Detailed Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Recent Performance Trend */}
              <div>
                <h4 className="font-medium mb-2">Recent Performance Trend</h4>
                <div className="space-y-2">
                  {performanceData.get(selectedPattern)?.slice(-5).map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {metric.taskType.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {metric.lastUpdated.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">
                          {((metric.successRate + metric.efficiency + metric.userSatisfaction + metric.adaptability) / 4 * 100).toFixed(0)}%
                        </span>
                        {metric.efficiency > 0.7 ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No recent data available</p>
                  )}
                </div>
              </div>

              {/* Optimization Suggestions */}
              <div>
                <h4 className="font-medium mb-2">Optimization Suggestions</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Consider using {selectedPattern} pattern for {COGNITIVE_PATTERNS[selectedPattern].useCases[0]} tasks</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Monitor performance in {COGNITIVE_PATTERNS[selectedPattern].useCases[1]} scenarios</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span>Leverage {COGNITIVE_PATTERNS[selectedPattern].strengths[0]} capabilities for better results</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};