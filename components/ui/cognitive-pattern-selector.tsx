'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Progress } from './progress';
import { 
  Brain, 
  Target, 
  Lightbulb, 
  Network, 
  Search, 
  Shuffle,
  TrendingUp,
  Zap,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import {
  CognitivePattern,
  TaskContext,
  OptimizationResult,
  cognitiveOptimizer,
  COGNITIVE_PATTERNS,
  getAllCognitivePatterns,
  createTaskContext
} from '@/lib/cognitive-patterns';
import { cn } from '@/lib/utils';

interface CognitivePatternSelectorProps {
  taskContext?: TaskContext;
  currentPattern?: CognitivePattern;
  onPatternSelect?: (pattern: CognitivePattern, result: OptimizationResult) => void;
  onPatternSwitch?: (newPattern: CognitivePattern, result: OptimizationResult) => void;
  className?: string;
  showDetails?: boolean;
  autoOptimize?: boolean;
}

interface PatternCardProps {
  pattern: CognitivePattern;
  config: typeof COGNITIVE_PATTERNS[CognitivePattern];
  isSelected: boolean;
  isRecommended: boolean;
  confidence?: number;
  onClick: () => void;
  showPerformance?: boolean;
}

const PatternIcon: Record<CognitivePattern, React.ComponentType<{ className?: string }>> = {
  convergent: Target,
  divergent: Lightbulb,
  lateral: Shuffle,
  systems: Network,
  critical: Search,
  adaptive: TrendingUp
};

const PatternCard: React.FC<PatternCardProps> = ({
  pattern,
  config,
  isSelected,
  isRecommended,
  confidence,
  onClick,
  showPerformance = false
}) => {
  const IconComponent = PatternIcon[pattern];
  const [performance, setPerformance] = useState<number>(75);

  useEffect(() => {
    if (showPerformance) {
      // Get performance metrics for this pattern
      const effectiveness = cognitiveOptimizer.getPatternEffectiveness(pattern, 'scheduling');
      setPerformance(effectiveness);
    }
  }, [pattern, showPerformance]);

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary bg-primary/5",
        isRecommended && !isSelected && "ring-1 ring-orange-400 bg-orange-50",
        "relative overflow-hidden"
      )}
      onClick={onClick}
    >
      {isRecommended && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
            Recommended
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "p-2 rounded-lg",
            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-medium">{config.name}</CardTitle>
            {confidence !== undefined && (
              <div className="flex items-center mt-1 space-x-2">
                <Progress value={confidence * 100} className="h-1 flex-1" />
                <span className="text-xs text-muted-foreground">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {config.description}
        </p>
        
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {config.strengths.slice(0, 2).map((strength) => (
              <Badge key={strength} variant="outline" className="text-xs">
                {strength}
              </Badge>
            ))}
          </div>
          
          {showPerformance && (
            <div className="flex items-center space-x-2 text-xs">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-muted-foreground">
                {performance.toFixed(1)}% effective
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const CognitivePatternSelector: React.FC<CognitivePatternSelectorProps> = ({
  taskContext,
  currentPattern,
  onPatternSelect,
  onPatternSwitch,
  className,
  showDetails = true,
  autoOptimize = false
}) => {
  const [selectedPattern, setSelectedPattern] = useState<CognitivePattern | null>(currentPattern || null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);

  const patterns = useMemo(() => getAllCognitivePatterns(), []);

  // Auto-optimize when task context changes
  useEffect(() => {
    if (autoOptimize && taskContext) {
      handleOptimize();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskContext, autoOptimize]);

  const handleOptimize = useCallback(async () => {
    if (!taskContext) return;
    
    setIsOptimizing(true);
    try {
      const result = await cognitiveOptimizer.selectOptimalPattern(taskContext);
      setOptimizationResult(result);
      setSelectedPattern(result.selectedPattern);
      onPatternSelect?.(result.selectedPattern, result);
    } catch (error) {
      console.error('Failed to optimize cognitive pattern:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [taskContext, onPatternSelect]);

  const handlePatternSelect = useCallback(async (pattern: CognitivePattern) => {
    if (pattern === selectedPattern) return;

    if (currentPattern && currentPattern !== pattern) {
      // Switch pattern
      setIsOptimizing(true);
      try {
        const result = await cognitiveOptimizer.switchPattern(
          currentPattern,
          taskContext || createTaskContext('scheduling'),
          'mixed'
        );
        setOptimizationResult(result);
        setSelectedPattern(pattern);
        onPatternSwitch?.(pattern, result);
      } catch (error) {
        console.error('Failed to switch pattern:', error);
      } finally {
        setIsOptimizing(false);
      }
    } else {
      // Direct selection
      setSelectedPattern(pattern);
      if (taskContext) {
        const result = await cognitiveOptimizer.selectOptimalPattern(taskContext);
        setOptimizationResult(result);
        onPatternSelect?.(pattern, result);
      }
    }
  }, [selectedPattern, currentPattern, taskContext, onPatternSelect, onPatternSwitch]);

  const getPatternConfidence = useCallback((pattern: CognitivePattern): number | undefined => {
    if (!optimizationResult) return undefined;
    
    if (pattern === optimizationResult.selectedPattern) {
      return optimizationResult.confidence;
    }
    
    const alternative = optimizationResult.alternatives.find(alt => alt.pattern === pattern);
    return alternative?.score;
  }, [optimizationResult]);

  const isRecommended = useCallback((pattern: CognitivePattern): boolean => {
    return optimizationResult?.selectedPattern === pattern;
  }, [optimizationResult]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Cognitive Pattern Selection</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPerformance(!showPerformance)}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Performance
          </Button>
          
          {taskContext && (
            <Button
              size="sm"
              onClick={handleOptimize}
              disabled={isOptimizing}
            >
              {isOptimizing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <Zap className="w-4 h-4 mr-1" />
              )}
              Optimize
            </Button>
          )}
        </div>
      </div>

      {/* Task Context Info */}
      {taskContext && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Task:</span>
                <span className="font-medium">{taskContext.type.replace('_', ' ')}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Complexity:</span>
                <Badge variant="outline" className="text-xs">
                  {taskContext.complexity}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Urgency:</span>
                <Badge variant="outline" className="text-xs">
                  {taskContext.timeConstraint}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Stakeholders:</span>
                <span className="font-medium">{taskContext.stakeholders}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patterns.map((pattern) => (
          <PatternCard
            key={pattern}
            pattern={pattern}
            config={COGNITIVE_PATTERNS[pattern]}
            isSelected={selectedPattern === pattern}
            isRecommended={isRecommended(pattern)}
            confidence={getPatternConfidence(pattern)}
            onClick={() => handlePatternSelect(pattern)}
            showPerformance={showPerformance}
          />
        ))}
      </div>

      {/* Optimization Results */}
      {showDetails && optimizationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Optimization Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Pattern Summary */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-primary">
                  {COGNITIVE_PATTERNS[optimizationResult.selectedPattern].name}
                </h4>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {Math.round(optimizationResult.confidence * 100)}% confidence
                  </Badge>
                  <Badge variant="outline">
                    {Math.round(optimizationResult.estimatedEffectiveness)}% effective
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {COGNITIVE_PATTERNS[optimizationResult.selectedPattern].description}
              </p>
              
              {/* Neural Model */}
              <div className="flex items-center space-x-2 text-sm">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Neural Model:</span>
                <Badge variant="outline" className="text-xs">
                  {optimizationResult.neuralModel}
                </Badge>
              </div>
            </div>

            {/* Reasoning */}
            <div>
              <h5 className="font-medium text-sm mb-2 flex items-center">
                <Info className="w-4 h-4 mr-1" />
                Why this pattern?
              </h5>
              <ul className="space-y-1">
                {optimizationResult.reasoning.map((reason, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-2 flex-shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div>
              <h5 className="font-medium text-sm mb-2 flex items-center">
                <Lightbulb className="w-4 h-4 mr-1" />
                Recommendations
              </h5>
              <ul className="space-y-1">
                {optimizationResult.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>

            {/* Alternative Patterns */}
            {optimizationResult.alternatives.length > 0 && (
              <div>
                <h5 className="font-medium text-sm mb-2">Alternative Patterns</h5>
                <div className="space-y-2">
                  {optimizationResult.alternatives.map((alt, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                          {React.createElement(PatternIcon[alt.pattern], { className: "w-4 h-4" })}
                        </div>
                        <div>
                          <span className="text-sm font-medium">
                            {COGNITIVE_PATTERNS[alt.pattern].name}
                          </span>
                          <p className="text-xs text-muted-foreground">{alt.reason}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(alt.score * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};