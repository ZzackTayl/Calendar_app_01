/**
 * Agent Archetypes Testing Suite
 * Comprehensive testing for specialized agent coordination system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  AGENT_ARCHETYPES, 
  AgentArchetypeManager,
  agentArchetypeManager 
} from '../../config/agent-archetypes.js';

describe('Agent Archetypes Configuration', () => {
  describe('AGENT_ARCHETYPES constant', () => {
    it('should contain all required specialized agent types', () => {
      const requiredAgentTypes = [
        'neural_architect',
        'wasm_performance_engineer',
        'cognitive_coordinator',
        'calendar_intelligence',
        'relationship_analyst',
        'performance_optimizer'
      ];

      requiredAgentTypes.forEach(agentType => {
        expect(AGENT_ARCHETYPES).toHaveProperty(agentType);
      });
    });

    it('should have properly structured agent definitions', () => {
      Object.values(AGENT_ARCHETYPES).forEach(agent => {
        // Required properties
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('capabilities');
        expect(agent).toHaveProperty('cognitive_pattern');
        expect(agent).toHaveProperty('neural_models');
        expect(agent).toHaveProperty('specializations');
        expect(agent).toHaveProperty('performance_metrics');

        // Type validations
        expect(typeof agent.id).toBe('string');
        expect(typeof agent.name).toBe('string');
        expect(typeof agent.description).toBe('string');
        expect(Array.isArray(agent.capabilities)).toBe(true);
        expect(typeof agent.cognitive_pattern).toBe('string');
        expect(Array.isArray(agent.neural_models)).toBe(true);
        expect(Array.isArray(agent.specializations)).toBe(true);
        expect(typeof agent.performance_metrics).toBe('object');

        // Content validations
        expect(agent.capabilities.length).toBeGreaterThan(0);
        expect(agent.neural_models.length).toBeGreaterThan(0);
        expect(agent.specializations.length).toBeGreaterThan(0);
      });
    });

    it('should have valid cognitive patterns', () => {
      const validPatterns = [
        'systems',
        'convergent', 
        'adaptive',
        'predictive',
        'empathetic',
        'analytical'
      ];

      Object.values(AGENT_ARCHETYPES).forEach(agent => {
        expect(validPatterns).toContain(agent.cognitive_pattern);
      });
    });

    it('should reference valid neural models', () => {
      const { MODEL_SPECS } = require('../../config/neural-models.js');
      
      Object.values(AGENT_ARCHETYPES).forEach(agent => {
        agent.neural_models.forEach(model => {
          expect(MODEL_SPECS).toHaveProperty(model);
        });
      });
    });

    it('should have performance targets for speed improvements', () => {
      const performanceAgent = AGENT_ARCHETYPES.wasm_performance_engineer;
      expect(performanceAgent.performance_metrics.speed_improvement).toBeGreaterThanOrEqual(2.8);
      expect(performanceAgent.performance_metrics.speed_improvement).toBeLessThanOrEqual(4.4);

      const optimizerAgent = AGENT_ARCHETYPES.performance_optimizer;
      expect(optimizerAgent.performance_metrics.performance_improvement).toBeGreaterThanOrEqual(2.8);
    });

    it('should have memory efficiency targets', () => {
      const performanceAgent = AGENT_ARCHETYPES.wasm_performance_engineer;
      expect(performanceAgent.performance_metrics.memory_reduction).toBe(0.32); // 32% reduction
    });
  });
});

describe('AgentArchetypeManager', () => {
  let manager: AgentArchetypeManager;

  beforeEach(() => {
    manager = new AgentArchetypeManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Selection', () => {
    it('should select appropriate agent for task type', () => {
      const taskMappings = [
        { task: 'neural_architecture', expected: 'neural_architect' },
        { task: 'performance_optimization', expected: 'wasm_performance_engineer' },
        { task: 'coordination', expected: 'cognitive_coordinator' },
        { task: 'calendar_optimization', expected: 'calendar_intelligence' },
        { task: 'relationship_analysis', expected: 'relationship_analyst' },
        { task: 'system_optimization', expected: 'performance_optimizer' }
      ];

      taskMappings.forEach(({ task, expected }) => {
        const selectedAgent = manager.selectAgent(task);
        expect(selectedAgent.id).toBe(expected);
      });
    });

    it('should fallback to cognitive_coordinator for unknown tasks', () => {
      const unknownAgent = manager.selectAgent('unknown_task_type');
      expect(unknownAgent.id).toBe('cognitive_coordinator');
    });
  });

  describe('Agent Initialization', () => {
    it('should initialize agent with neural model selection', async () => {
      const agentId = 'neural_architect';
      const taskContext = { real_time_required: true };

      const agent = await manager.initializeAgent(agentId, taskContext);

      expect(agent).toBeDefined();
      expect(agent.id).toBe(agentId);
      expect(agent.selectedModel).toBeDefined();
      expect(agent.modelInstance).toBeDefined();
      expect(agent.status).toBe('active');
      expect(agent.initialized).toBeDefined();
      expect(Array.isArray(agent.taskHistory)).toBe(true);
    });

    it('should throw error for unknown agent ID', async () => {
      await expect(manager.initializeAgent('unknown_agent')).rejects.toThrow('Unknown agent archetype: unknown_agent');
    });

    it('should cache initialized agents', async () => {
      const agentId = 'calendar_intelligence';
      
      const agent1 = await manager.initializeAgent(agentId);
      expect(manager.activeAgents.has(agentId)).toBe(true);
      
      const cached = manager.activeAgents.get(agentId);
      expect(cached).toBe(agent1);
    });
  });

  describe('Agent Coordination', () => {
    it('should coordinate multiple agents for complex tasks', async () => {
      const agentIds = ['neural_architect', 'wasm_performance_engineer', 'cognitive_coordinator'];
      const task = {
        name: 'Optimize Neural Performance',
        complexity: 5,
        context: { real_time_required: true }
      };

      const coordinationPlan = await manager.coordinateAgents(agentIds, task);

      expect(coordinationPlan).toBeDefined();
      expect(coordinationPlan.task).toBe(task);
      expect(coordinationPlan.agents).toHaveLength(3);
      expect(coordinationPlan.executionOrder).toHaveLength(3);
      expect(coordinationPlan.estimatedDuration).toBeGreaterThan(0);
    });

    it('should optimize execution order based on dependencies', async () => {
      const agentIds = ['cognitive_coordinator', 'neural_architect', 'wasm_performance_engineer'];
      const task = { name: 'Test Task', complexity: 3, context: {} };

      const coordinationPlan = await manager.coordinateAgents(agentIds, task);
      const executionOrder = coordinationPlan.executionOrder.map(agent => agent.id);

      // Neural architect should come before performance engineer
      const architectIndex = executionOrder.indexOf('neural_architect');
      const performanceIndex = executionOrder.indexOf('wasm_performance_engineer');
      const coordinatorIndex = executionOrder.indexOf('cognitive_coordinator');

      expect(architectIndex).toBeLessThan(performanceIndex);
      expect(coordinatorIndex).toBe(executionOrder.length - 1); // Coordinator should be last
    });

    it('should estimate task duration based on agent capabilities', async () => {
      const agentIds = ['neural_architect'];
      const simpleTask = { name: 'Simple Task', complexity: 1, context: {} };
      const complexTask = { name: 'Complex Task', complexity: 10, context: {} };

      const simplePlan = await manager.coordinateAgents(agentIds, simpleTask);
      const complexPlan = await manager.coordinateAgents(agentIds, complexTask);

      expect(complexPlan.estimatedDuration).toBeGreaterThan(simplePlan.estimatedDuration);
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics for active agents', async () => {
      await manager.initializeAgent('neural_architect');
      await manager.initializeAgent('calendar_intelligence');

      const metrics = manager.getPerformanceMetrics();

      expect(metrics.totalAgents).toBe(2);
      expect(metrics.activeAgents).toBe(2);
      expect(metrics.averagePerformance).toBeGreaterThan(0);
      expect(metrics.coordinationEfficiency).toBeGreaterThan(0);
      expect(Object.keys(metrics.agentDetails)).toHaveLength(2);
    });

    it('should calculate coordination efficiency', () => {
      // Initially should have default efficiency
      const initialEfficiency = manager.calculateCoordinationEfficiency();
      expect(initialEfficiency).toBe(0.8);

      // Add some coordination history
      manager.coordinationHistory.push(
        { status: 'completed' },
        { status: 'completed' },
        { status: 'failed' }
      );

      const updatedEfficiency = manager.calculateCoordinationEfficiency();
      expect(updatedEfficiency).toBeGreaterThan(0.7); // 2/3 success rate + 0.1 bonus
    });
  });

  describe('Task Type Mapping', () => {
    it('should map agent types to appropriate neural model task types', () => {
      const expectedMappings = {
        neural_architect: 'pattern_recognition',
        wasm_performance_engineer: 'performance_prediction',
        cognitive_coordinator: 'optimization_tasks',
        calendar_intelligence: 'forecasting',
        relationship_analyst: 'pattern_recognition',
        performance_optimizer: 'performance_prediction'
      };

      Object.entries(expectedMappings).forEach(([agentId, expectedTaskType]) => {
        const taskType = manager.mapAgentToTaskType(agentId);
        expect(taskType).toBe(expectedTaskType);
      });
    });

    it('should fallback to pattern_recognition for unknown agents', () => {
      const taskType = manager.mapAgentToTaskType('unknown_agent');
      expect(taskType).toBe('pattern_recognition');
    });
  });
});

describe('Calendar-Specific Agent Functionality', () => {
  let manager: AgentArchetypeManager;

  beforeEach(() => {
    manager = new AgentArchetypeManager();
  });

  describe('Calendar Intelligence Agent', () => {
    it('should have calendar-specific capabilities', () => {
      const agent = AGENT_ARCHETYPES.calendar_intelligence;
      
      const expectedCapabilities = [
        'event_prediction',
        'schedule_optimization',
        'pattern_recognition',
        'user_behavior_analysis',
        'conflict_detection',
        'smart_scheduling'
      ];

      expectedCapabilities.forEach(capability => {
        expect(agent.capabilities).toContain(capability);
      });
    });

    it('should use appropriate neural models for forecasting', () => {
      const agent = AGENT_ARCHETYPES.calendar_intelligence;
      const forecastingModels = ['TFT', 'N-BEATS', 'Autoformer'];
      
      forecastingModels.forEach(model => {
        expect(agent.neural_models).toContain(model);
      });
    });

    it('should have high prediction accuracy targets', () => {
      const agent = AGENT_ARCHETYPES.calendar_intelligence;
      expect(agent.performance_metrics.prediction_accuracy).toBeGreaterThan(0.85);
      expect(agent.performance_metrics.schedule_efficiency).toBeGreaterThan(0.9);
    });
  });

  describe('Relationship Analyst Agent', () => {
    it('should have polyamory-specific capabilities', () => {
      const agent = AGENT_ARCHETYPES.relationship_analyst;
      
      const expectedCapabilities = [
        'relationship_mapping',
        'communication_analysis',
        'pattern_detection',
        'emotion_tracking',
        'conflict_prediction',
        'harmony_optimization'
      ];

      expectedCapabilities.forEach(capability => {
        expect(agent.capabilities).toContain(capability);
      });
    });

    it('should use empathetic cognitive pattern', () => {
      const agent = AGENT_ARCHETYPES.relationship_analyst;
      expect(agent.cognitive_pattern).toBe('empathetic');
    });

    it('should have relationship-focused neural models', () => {
      const agent = AGENT_ARCHETYPES.relationship_analyst;
      const relationshipModels = ['LSTM', 'BiTCN', 'SegRNN'];
      
      relationshipModels.forEach(model => {
        expect(agent.neural_models).toContain(model);
      });
    });
  });
});

describe('Performance Requirements Validation', () => {
  it('should meet 2.8-4.4x speed improvement targets', () => {
    const performanceAgent = AGENT_ARCHETYPES.wasm_performance_engineer;
    const optimizerAgent = AGENT_ARCHETYPES.performance_optimizer;

    expect(performanceAgent.performance_metrics.speed_improvement).toBeGreaterThanOrEqual(2.8);
    expect(performanceAgent.performance_metrics.speed_improvement).toBeLessThanOrEqual(4.4);
    
    expect(optimizerAgent.performance_metrics.performance_improvement).toBeGreaterThanOrEqual(3.0);
  });

  it('should target 32MB memory efficiency', () => {
    const performanceAgent = AGENT_ARCHETYPES.wasm_performance_engineer;
    
    // 32% memory reduction target
    expect(performanceAgent.performance_metrics.memory_reduction).toBe(0.32);
    expect(performanceAgent.performance_metrics.memory_efficiency).toBeGreaterThan(0.8);
  });

  it('should have agents optimized for WASM performance', () => {
    const wasmAgent = AGENT_ARCHETYPES.wasm_performance_engineer;
    
    const expectedCapabilities = [
      'memory_optimization',
      'simd_tuning',
      'performance_profiling',
      'wasm_compilation',
      'parallel_processing',
      'cache_optimization'
    ];

    expectedCapabilities.forEach(capability => {
      expect(wasmAgent.capabilities).toContain(capability);
    });
  });
});

describe('Singleton agentArchetypeManager', () => {
  it('should be properly initialized', () => {
    expect(agentArchetypeManager).toBeInstanceOf(AgentArchetypeManager);
    expect(agentArchetypeManager.activeAgents).toBeDefined();
    expect(agentArchetypeManager.agentPerformance).toBeDefined();
    expect(agentArchetypeManager.coordinationHistory).toBeDefined();
  });

  it('should maintain state across operations', async () => {
    const agentId = 'neural_architect';
    await agentArchetypeManager.initializeAgent(agentId);
    
    expect(agentArchetypeManager.activeAgents.has(agentId)).toBe(true);
    
    const metrics = agentArchetypeManager.getPerformanceMetrics();
    expect(metrics.totalAgents).toBeGreaterThan(0);
  });
});