'use client';

/**
 * Cognitive Pattern Optimization System for Calendar App
 * Implements different thinking patterns for intelligent task optimization
 */

import { neuralModelSelector, NEURAL_MODELS, MODEL_SPECS } from '@/config/neural-models';

export type CognitivePattern = 
  | 'convergent'    // Goal-focused, structured, optimized solutions
  | 'divergent'     // Creative, exploratory, multiple possibilities
  | 'lateral'       // Creative problem-solving, indirect approaches
  | 'systems'       // Holistic, interconnected, long-term view
  | 'critical'      // Analytical, evaluative, detail-oriented
  | 'adaptive';     // Flexible, learning-based, context-aware

export interface CognitivePatternConfig {
  name: string;
  description: string;
  strengths: string[];
  useCases: string[];
  neuralModels: string[];
  optimizationStrategy: string;
  taskTypes: string[];
}

export interface TaskContext {
  type: 'scheduling' | 'relationship_management' | 'performance_analysis' | 'creative_planning' | 'goal_achievement' | 'conflict_resolution';
  complexity: 'low' | 'medium' | 'high';
  timeConstraint: 'flexible' | 'moderate' | 'urgent';
  stakeholders: number; // Number of people involved
  relationships: string[]; // IDs of involved relationships
  priority: 'low' | 'medium' | 'high' | 'critical';
  dataAvailable: boolean;
  requiresCreativity: boolean;
  requiresAnalysis: boolean;
}

export interface OptimizationResult {
  selectedPattern: CognitivePattern;
  confidence: number;
  reasoning: string[];
  recommendations: string[];
  neuralModel: string;
  estimatedEffectiveness: number;
  alternatives: Array<{
    pattern: CognitivePattern;
    score: number;
    reason: string;
  }>;
}

export interface PatternPerformanceMetrics {
  pattern: CognitivePattern;
  taskType: string;
  successRate: number;
  averageCompletionTime: number;
  userSatisfaction: number;
  efficiency: number;
  adaptability: number;
  lastUpdated: Date;
}

// Cognitive Pattern Configurations
export const COGNITIVE_PATTERNS: Record<CognitivePattern, CognitivePatternConfig> = {
  convergent: {
    name: 'Convergent Thinking',
    description: 'Goal-focused approach for finding optimal solutions',
    strengths: ['Problem-solving', 'Decision-making', 'Goal achievement', 'Efficiency'],
    useCases: ['Event scheduling', 'Time optimization', 'Resource allocation', 'Conflict resolution'],
    neuralModels: ['N-BEATS', 'TiDE', 'NHITS', 'DeepAR'],
    optimizationStrategy: 'minimize_conflicts_maximize_efficiency',
    taskTypes: ['goal_achievement', 'scheduling', 'performance_analysis']
  },
  
  divergent: {
    name: 'Divergent Thinking',
    description: 'Creative exploration of multiple possibilities and alternatives',
    strengths: ['Brainstorming', 'Creative solutions', 'Alternative exploration', 'Innovation'],
    useCases: ['Event planning', 'Date ideas', 'Relationship activities', 'Problem alternatives'],
    neuralModels: ['Autoformer', 'FEDformer', 'Pyraformer', 'TimesNet'],
    optimizationStrategy: 'maximize_options_encourage_creativity',
    taskTypes: ['creative_planning', 'relationship_management']
  },
  
  lateral: {
    name: 'Lateral Thinking',
    description: 'Indirect, creative problem-solving through unconventional approaches',
    strengths: ['Creative problem-solving', 'Pattern breaking', 'Insight generation', 'Innovation'],
    useCases: ['Relationship challenges', 'Communication issues', 'Schedule conflicts', 'Unique solutions'],
    neuralModels: ['Informer', 'PatchTST', 'SegRNN', 'LSTM-VAE'],
    optimizationStrategy: 'explore_unconventional_maximize_insight',
    taskTypes: ['conflict_resolution', 'relationship_management', 'creative_planning']
  },
  
  systems: {
    name: 'Systems Thinking',
    description: 'Holistic view considering interconnections and long-term effects',
    strengths: ['Holistic analysis', 'Interconnection mapping', 'Long-term planning', 'Complex coordination'],
    useCases: ['Multi-partner coordination', 'Long-term planning', 'Relationship dynamics', 'Complex scheduling'],
    neuralModels: ['TFT', 'TimesNet', 'Autoformer', 'FEDformer'],
    optimizationStrategy: 'optimize_whole_system_long_term_stability',
    taskTypes: ['relationship_management', 'scheduling', 'performance_analysis']
  },
  
  critical: {
    name: 'Critical Thinking',
    description: 'Analytical evaluation of information, logic, and evidence',
    strengths: ['Analysis', 'Evaluation', 'Logic', 'Evidence-based decisions', 'Quality assessment'],
    useCases: ['Performance analysis', 'Decision evaluation', 'Risk assessment', 'Quality control'],
    neuralModels: ['TCN', 'BiTCN', 'LSTM', 'Isolation Forest'],
    optimizationStrategy: 'maximize_accuracy_minimize_errors',
    taskTypes: ['performance_analysis', 'goal_achievement']
  },
  
  adaptive: {
    name: 'Adaptive Thinking',
    description: 'Flexible, learning-based approach that adjusts to context and feedback',
    strengths: ['Flexibility', 'Learning', 'Context-awareness', 'Continuous improvement'],
    useCases: ['Dynamic scheduling', 'Changing priorities', 'Learning preferences', 'Evolving relationships'],
    neuralModels: ['TFT', 'LSTM', 'DeepAR', 'TimesNet'],
    optimizationStrategy: 'maximize_adaptability_continuous_learning',
    taskTypes: ['scheduling', 'relationship_management', 'goal_achievement']
  }
};

/**
 * Cognitive Pattern Optimizer
 * Selects and applies optimal cognitive patterns for different calendar tasks
 */
export class CognitivePatternOptimizer {
  private performanceHistory: Map<string, PatternPerformanceMetrics[]> = new Map();
  private userPreferences: Map<string, number> = new Map(); // pattern -> preference score
  private contextMemory: Map<string, OptimizationResult[]> = new Map();

  constructor() {
    this.initializeDefaultPreferences();
  }

  /**
   * Select optimal cognitive pattern for a given task context
   */
  async selectOptimalPattern(
    taskContext: TaskContext,
    userPreferences?: Partial<Record<CognitivePattern, number>>
  ): Promise<OptimizationResult> {
    const scores = this.calculatePatternScores(taskContext, userPreferences);
    const sortedPatterns = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([pattern, score]) => ({ pattern: pattern as CognitivePattern, score }));

    const selectedPattern = sortedPatterns[0].pattern;
    const config = COGNITIVE_PATTERNS[selectedPattern];
    
    // Select appropriate neural model
    const neuralModel = await this.selectNeuralModel(selectedPattern, taskContext);
    
    // Generate reasoning and recommendations
    const reasoning = this.generateReasoning(selectedPattern, taskContext, scores[selectedPattern]);
    const recommendations = this.generateRecommendations(selectedPattern, taskContext);
    
    const result: OptimizationResult = {
      selectedPattern,
      confidence: scores[selectedPattern] / 100,
      reasoning,
      recommendations,
      neuralModel,
      estimatedEffectiveness: this.estimateEffectiveness(selectedPattern, taskContext),
      alternatives: sortedPatterns.slice(1, 4).map(({ pattern, score }) => ({
        pattern,
        score: score / 100,
        reason: this.getAlternativeReason(pattern, taskContext)
      }))
    };

    // Store in context memory for learning
    this.storeOptimizationResult(taskContext, result);
    
    return result;
  }

  /**
   * Switch cognitive pattern dynamically based on feedback or new context
   */
  async switchPattern(
    currentPattern: CognitivePattern,
    newContext: TaskContext,
    feedback?: 'positive' | 'negative' | 'mixed'
  ): Promise<OptimizationResult> {
    // Update performance metrics based on feedback
    if (feedback) {
      this.updatePatternPerformance(currentPattern, newContext.type, feedback);
    }

    // Re-evaluate with updated context
    return this.selectOptimalPattern(newContext);
  }

  /**
   * Learn from user feedback to improve pattern selection
   */
  updatePatternPreference(
    pattern: CognitivePattern,
    feedback: 'positive' | 'negative' | 'neutral',
    intensity: number = 1
  ): void {
    const currentScore = this.userPreferences.get(pattern) || 50;
    let adjustment = 0;

    switch (feedback) {
      case 'positive':
        adjustment = 5 * intensity;
        break;
      case 'negative':
        adjustment = -3 * intensity;
        break;
      case 'neutral':
        adjustment = 0.5 * intensity;
        break;
    }

    const newScore = Math.max(0, Math.min(100, currentScore + adjustment));
    this.userPreferences.set(pattern, newScore);
  }

  /**
   * Get pattern effectiveness for a specific task type
   */
  getPatternEffectiveness(pattern: CognitivePattern, taskType: string): number {
    const history = this.performanceHistory.get(`${pattern}-${taskType}`);
    if (!history || history.length === 0) {
      return this.getDefaultEffectiveness(pattern, taskType);
    }

    const recent = history.slice(-10); // Use last 10 data points
    const avgEffectiveness = recent.reduce((sum, metric) => sum + metric.efficiency, 0) / recent.length;
    return avgEffectiveness;
  }

  /**
   * Get performance metrics for all patterns
   */
  getPerformanceMetrics(): Map<CognitivePattern, PatternPerformanceMetrics[]> {
    const metrics = new Map<CognitivePattern, PatternPerformanceMetrics[]>();
    
    Object.keys(COGNITIVE_PATTERNS).forEach(pattern => {
      const patternKey = pattern as CognitivePattern;
      const patternMetrics: PatternPerformanceMetrics[] = [];
      
      ['scheduling', 'relationship_management', 'performance_analysis', 'creative_planning', 'goal_achievement'].forEach(taskType => {
        const history = this.performanceHistory.get(`${pattern}-${taskType}`) || [];
        if (history.length > 0) {
          patternMetrics.push(...history);
        }
      });
      
      metrics.set(patternKey, patternMetrics);
    });
    
    return metrics;
  }

  // Private helper methods

  private calculatePatternScores(
    context: TaskContext,
    userPrefs?: Partial<Record<CognitivePattern, number>>
  ): Record<CognitivePattern, number> {
    const scores: Record<CognitivePattern, number> = {} as any;

    Object.keys(COGNITIVE_PATTERNS).forEach(patternKey => {
      const pattern = patternKey as CognitivePattern;
      const config = COGNITIVE_PATTERNS[pattern];
      let score = 0;

      // Base score from pattern-task alignment
      if (config.taskTypes.includes(context.type)) {
        score += 30;
      }

      // Complexity alignment
      score += this.getComplexityScore(pattern, context.complexity);

      // Time constraint alignment
      score += this.getTimeConstraintScore(pattern, context.timeConstraint);

      // Historical performance
      score += this.getPatternEffectiveness(pattern, context.type) * 0.3;

      // User preferences
      const userPref = userPrefs?.[pattern] || this.userPreferences.get(pattern) || 50;
      score += (userPref / 100) * 20;

      // Context-specific bonuses
      score += this.getContextBonus(pattern, context);

      scores[pattern] = Math.max(0, Math.min(100, score));
    });

    return scores;
  }

  private async selectNeuralModel(pattern: CognitivePattern, context: TaskContext): Promise<string> {
    const config = COGNITIVE_PATTERNS[pattern];
    const taskType = this.mapTaskTypeToNeuralTask(context.type);
    
    // Use neural model selector to pick optimal model
    const modelContext = {
      real_time_required: context.timeConstraint === 'urgent',
      memory_constrained: context.complexity === 'high'
    };

    return neuralModelSelector.selectModel(taskType, modelContext);
  }

  private generateReasoning(pattern: CognitivePattern, context: TaskContext, score: number): string[] {
    const config = COGNITIVE_PATTERNS[pattern];
    const reasoning: string[] = [];

    reasoning.push(`Selected ${config.name} based on ${score.toFixed(1)}% match confidence`);
    
    if (config.taskTypes.includes(context.type)) {
      reasoning.push(`Optimal for ${context.type.replace('_', ' ')} tasks`);
    }

    if (context.requiresCreativity && ['divergent', 'lateral'].includes(pattern)) {
      reasoning.push('Creativity requirement aligns with pattern strengths');
    }

    if (context.requiresAnalysis && ['critical', 'systems'].includes(pattern)) {
      reasoning.push('Analysis requirement matches pattern capabilities');
    }

    if (context.stakeholders > 3 && pattern === 'systems') {
      reasoning.push('Multiple stakeholders benefit from systems approach');
    }

    return reasoning;
  }

  private generateRecommendations(pattern: CognitivePattern, context: TaskContext): string[] {
    const config = COGNITIVE_PATTERNS[pattern];
    const recommendations: string[] = [];

    switch (pattern) {
      case 'convergent':
        recommendations.push('Focus on clear goals and optimal solutions');
        recommendations.push('Prioritize efficiency and conflict minimization');
        if (context.type === 'scheduling') {
          recommendations.push('Use time-blocking and automated optimization');
        }
        break;

      case 'divergent':
        recommendations.push('Explore multiple options before deciding');
        recommendations.push('Encourage creative brainstorming sessions');
        if (context.type === 'creative_planning') {
          recommendations.push('Use mind-mapping and ideation techniques');
        }
        break;

      case 'lateral':
        recommendations.push('Look for unconventional solutions');
        recommendations.push('Challenge assumptions and try indirect approaches');
        if (context.type === 'conflict_resolution') {
          recommendations.push('Reframe the problem from different perspectives');
        }
        break;

      case 'systems':
        recommendations.push('Consider all stakeholders and interconnections');
        recommendations.push('Plan for long-term impacts and stability');
        if (context.stakeholders > 2) {
          recommendations.push('Map relationship dynamics and dependencies');
        }
        break;

      case 'critical':
        recommendations.push('Analyze all available data thoroughly');
        recommendations.push('Evaluate pros and cons systematically');
        if (context.type === 'performance_analysis') {
          recommendations.push('Use metrics and evidence-based assessment');
        }
        break;

      case 'adaptive':
        recommendations.push('Stay flexible and ready to adjust approach');
        recommendations.push('Monitor feedback and iterate frequently');
        if (context.timeConstraint === 'flexible') {
          recommendations.push('Implement gradual improvements based on learning');
        }
        break;
    }

    return recommendations;
  }

  private getComplexityScore(pattern: CognitivePattern, complexity: string): number {
    const complexityScores: Record<string, Record<CognitivePattern, number>> = {
      low: { convergent: 15, divergent: 10, lateral: 8, systems: 5, critical: 12, adaptive: 10 },
      medium: { convergent: 12, divergent: 15, lateral: 12, systems: 15, critical: 15, adaptive: 15 },
      high: { convergent: 8, divergent: 12, lateral: 15, systems: 20, critical: 18, adaptive: 12 }
    };

    return complexityScores[complexity]?.[pattern] || 10;
  }

  private getTimeConstraintScore(pattern: CognitivePattern, timeConstraint: string): number {
    const timeScores: Record<string, Record<CognitivePattern, number>> = {
      flexible: { convergent: 10, divergent: 18, lateral: 15, systems: 15, critical: 12, adaptive: 20 },
      moderate: { convergent: 15, divergent: 12, lateral: 12, systems: 12, critical: 15, adaptive: 15 },
      urgent: { convergent: 20, divergent: 8, lateral: 10, systems: 8, critical: 15, adaptive: 12 }
    };

    return timeScores[timeConstraint]?.[pattern] || 10;
  }

  private getContextBonus(pattern: CognitivePattern, context: TaskContext): number {
    let bonus = 0;

    // Creativity bonus
    if (context.requiresCreativity && ['divergent', 'lateral'].includes(pattern)) {
      bonus += 10;
    }

    // Analysis bonus
    if (context.requiresAnalysis && ['critical', 'systems'].includes(pattern)) {
      bonus += 10;
    }

    // Multi-stakeholder bonus
    if (context.stakeholders > 3 && pattern === 'systems') {
      bonus += 8;
    }

    // High priority urgency bonus
    if (context.priority === 'critical' && pattern === 'convergent') {
      bonus += 12;
    }

    return bonus;
  }

  private getAlternativeReason(pattern: CognitivePattern, context: TaskContext): string {
    const config = COGNITIVE_PATTERNS[pattern];
    
    if (config.taskTypes.includes(context.type)) {
      return `Good fit for ${context.type.replace('_', ' ')} tasks`;
    }
    
    if (context.requiresCreativity && ['divergent', 'lateral'].includes(pattern)) {
      return 'Strong creative problem-solving capabilities';
    }
    
    if (context.complexity === 'high' && ['systems', 'critical'].includes(pattern)) {
      return 'Handles complex scenarios effectively';
    }
    
    return `Suitable alternative with ${config.strengths[0].toLowerCase()} focus`;
  }

  private estimateEffectiveness(pattern: CognitivePattern, context: TaskContext): number {
    const baseEffectiveness = this.getPatternEffectiveness(pattern, context.type);
    const complexityModifier = context.complexity === 'high' ? 0.9 : context.complexity === 'low' ? 1.1 : 1.0;
    const urgencyModifier = context.timeConstraint === 'urgent' ? 0.95 : 1.0;
    
    return Math.min(100, baseEffectiveness * complexityModifier * urgencyModifier);
  }

  private getDefaultEffectiveness(pattern: CognitivePattern, taskType: string): number {
    const config = COGNITIVE_PATTERNS[pattern];
    return config.taskTypes.includes(taskType) ? 75 : 60;
  }

  private mapTaskTypeToNeuralTask(taskType: string): string {
    const mapping: Record<string, string> = {
      scheduling: 'schedule_optimization',
      relationship_management: 'relationship_mapping',
      performance_analysis: 'performance_analysis',
      creative_planning: 'pattern_recognition',
      goal_achievement: 'optimization_tasks',
      conflict_resolution: 'pattern_recognition'
    };

    return mapping[taskType] || 'pattern_recognition';
  }

  private updatePatternPerformance(
    pattern: CognitivePattern,
    taskType: string,
    feedback: 'positive' | 'negative' | 'mixed'
  ): void {
    const key = `${pattern}-${taskType}`;
    const history = this.performanceHistory.get(key) || [];
    
    const performance: PatternPerformanceMetrics = {
      pattern,
      taskType,
      successRate: feedback === 'positive' ? 0.9 : feedback === 'negative' ? 0.3 : 0.6,
      averageCompletionTime: 0, // Would be tracked in real implementation
      userSatisfaction: feedback === 'positive' ? 0.85 : feedback === 'negative' ? 0.4 : 0.65,
      efficiency: feedback === 'positive' ? 0.8 : feedback === 'negative' ? 0.4 : 0.6,
      adaptability: 0.7, // Default value, would be calculated
      lastUpdated: new Date()
    };

    history.push(performance);
    
    // Keep only last 50 entries to avoid memory bloat
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.performanceHistory.set(key, history);
  }

  private storeOptimizationResult(context: TaskContext, result: OptimizationResult): void {
    const key = `${context.type}-${context.complexity}`;
    const history = this.contextMemory.get(key) || [];
    
    history.push(result);
    
    // Keep only last 20 results
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    this.contextMemory.set(key, history);
  }

  private initializeDefaultPreferences(): void {
    // Set neutral preferences initially
    Object.keys(COGNITIVE_PATTERNS).forEach(pattern => {
      this.userPreferences.set(pattern as CognitivePattern, 50);
    });
  }
}

// Export singleton instance
export const cognitiveOptimizer = new CognitivePatternOptimizer();

// Export utility functions
export const getCognitivePatternInfo = (pattern: CognitivePattern) => COGNITIVE_PATTERNS[pattern];

export const getAllCognitivePatterns = () => Object.keys(COGNITIVE_PATTERNS) as CognitivePattern[];

export const createTaskContext = (
  type: TaskContext['type'],
  overrides: Partial<TaskContext> = {}
): TaskContext => ({
  type,
  complexity: 'medium',
  timeConstraint: 'moderate',
  stakeholders: 1,
  relationships: [],
  priority: 'medium',
  dataAvailable: true,
  requiresCreativity: false,
  requiresAnalysis: false,
  ...overrides
});