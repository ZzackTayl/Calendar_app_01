/**
 * Neural Configuration System - Main Entry Point
 * Calendar App with Enhanced AI Coordination
 */

// Core neural system imports
import neuralModelsConfig from './neural-models.js';
import agentArchetypesConfig from './agent-archetypes.js';
import neuralInitializationConfig from './neural-initialization.js';

// Export all neural configurations
export const {
  NEURAL_MODELS,
  MODEL_SPECS,
  NeuralModelSelector,
  neuralModelSelector
} = neuralModelsConfig;

export const {
  AGENT_ARCHETYPES,
  AgentArchetypeManager,
  agentArchetypeManager
} = agentArchetypesConfig;

export const {
  NEURAL_CONFIG,
  NeuralSystemInitializer,
  neuralSystemInitializer
} = neuralInitializationConfig;

// Neural System API
export class NeuralSystemAPI {
  constructor() {
    this.initialized = false;
    this.systemStatus = null;
  }

  /**
   * Initialize the complete neural system
   * @param {Object} options - Initialization options
   * @returns {Promise<Object>} - Initialization result
   */
  async initialize(options = {}) {
    try {
      console.log('🚀 Starting Neural System Initialization...');
      
      const result = await neuralSystemInitializer.initialize(options);
      this.initialized = result.success;
      this.systemStatus = result;

      if (result.success) {
        console.log('✅ Neural System Ready');
        console.log(`📊 Models: ${result.modelsLoaded}, Agents: ${result.agentsReady}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Neural System Initialization Failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current system status
   * @returns {Object} - System status information
   */
  getStatus() {
    return neuralSystemInitializer.getSystemStatus();
  }

  /**
   * Select optimal model for a task
   * @param {string} taskType - Type of task
   * @param {Object} context - Task context
   * @returns {string} - Selected model name
   */
  selectModel(taskType, context = {}) {
    return neuralModelSelector.selectModel(taskType, context);
  }

  /**
   * Initialize an agent for a specific task
   * @param {string} agentType - Type of agent archetype
   * @param {Object} taskContext - Context for the task
   * @returns {Promise<Object>} - Initialized agent instance
   */
  async initializeAgent(agentType, taskContext = {}) {
    return await agentArchetypeManager.initializeAgent(agentType, taskContext);
  }

  /**
   * Coordinate multiple agents for complex tasks
   * @param {Array} agentTypes - List of agent types to coordinate
   * @param {Object} task - Task definition
   * @returns {Promise<Object>} - Coordination plan
   */
  async coordinateAgents(agentTypes, task) {
    return await agentArchetypeManager.coordinateAgents(agentTypes, task);
  }

  /**
   * Get performance metrics for the entire system
   * @returns {Object} - Comprehensive performance metrics
   */
  getPerformanceMetrics() {
    const systemMetrics = this.getStatus();
    const agentMetrics = agentArchetypeManager.getPerformanceMetrics();
    
    return {
      system: systemMetrics,
      agents: agentMetrics,
      timestamp: Date.now()
    };
  }

  /**
   * Shutdown the neural system gracefully
   * @returns {Promise<void>}
   */
  async shutdown() {
    await neuralSystemInitializer.shutdown();
    this.initialized = false;
    this.systemStatus = null;
  }
}

// Export singleton API instance
export const neuralSystemAPI = new NeuralSystemAPI();

// Calendar-specific neural utilities
export const CalendarNeuralUtils = {
  /**
   * Get recommended models for calendar tasks
   * @param {string} calendarTaskType - Type of calendar task
   * @returns {Array} - Recommended models
   */
  getCalendarModels(calendarTaskType) {
    const calendarModelMapping = {
      event_prediction: NEURAL_MODELS.forecasting,
      schedule_optimization: NEURAL_MODELS.optimization_tasks,
      user_behavior_analysis: NEURAL_MODELS.pattern_recognition,
      relationship_analysis: NEURAL_MODELS.pattern_recognition,
      conflict_detection: NEURAL_MODELS.anomaly_detection
    };

    return calendarModelMapping[calendarTaskType] || NEURAL_MODELS.pattern_recognition;
  },

  /**
   * Get recommended agent for calendar functionality
   * @param {string} calendarFunction - Calendar function type
   * @returns {string} - Recommended agent archetype ID
   */
  getCalendarAgent(calendarFunction) {
    const agentMapping = {
      event_management: 'calendar_intelligence',
      relationship_tracking: 'relationship_analyst',
      performance_optimization: 'performance_optimizer',
      system_coordination: 'cognitive_coordinator',
      neural_optimization: 'neural_architect'
    };

    return agentMapping[calendarFunction] || 'calendar_intelligence';
  },

  /**
   * Initialize calendar-specific neural setup
   * @returns {Promise<Object>} - Setup result
   */
  async initializeCalendarNeural() {
    const calendarAgents = [
      'calendar_intelligence',
      'relationship_analyst',
      'performance_optimizer'
    ];

    const task = {
      type: 'calendar_system_optimization',
      context: {
        real_time_required: true,
        memory_constrained: false,
        complexity: 3
      }
    };

    return await neuralSystemAPI.coordinateAgents(calendarAgents, task);
  }
};

// Development utilities
export const NeuralDevUtils = {
  /**
   * List all available models and their specifications
   * @returns {Object} - All models with their specs
   */
  listAllModels() {
    return Object.entries(MODEL_SPECS).map(([name, spec]) => ({
      name,
      type: spec.type,
      accuracy: spec.accuracy,
      real_time: spec.real_time,
      memory_efficient: spec.memory_efficient,
      use_cases: spec.use_cases
    }));
  },

  /**
   * List all available agent archetypes
   * @returns {Object} - All agent archetypes with their capabilities
   */
  listAllAgents() {
    return Object.entries(AGENT_ARCHETYPES).map(([id, archetype]) => ({
      id,
      name: archetype.name,
      description: archetype.description,
      capabilities: archetype.capabilities,
      cognitive_pattern: archetype.cognitive_pattern,
      neural_models: archetype.neural_models
    }));
  },

  /**
   * Get neural system configuration
   * @returns {Object} - Current neural configuration
   */
  getConfiguration() {
    return NEURAL_CONFIG;
  },

  /**
   * Test neural system components
   * @returns {Promise<Object>} - Test results
   */
  async runTests() {
    const tests = {
      model_selection: false,
      agent_initialization: false,
      coordination: false,
      performance: false
    };

    try {
      // Test model selection
      const selectedModel = neuralModelSelector.selectModel('pattern_recognition');
      tests.model_selection = !!selectedModel;

      // Test agent initialization
      const agent = await agentArchetypeManager.initializeAgent('cognitive_coordinator');
      tests.agent_initialization = !!agent;

      // Test coordination
      const coordination = await agentArchetypeManager.coordinateAgents(['cognitive_coordinator'], {
        type: 'test',
        context: { complexity: 1 }
      });
      tests.coordination = !!coordination;

      // Test performance metrics
      const metrics = agentArchetypeManager.getPerformanceMetrics();
      tests.performance = !!metrics;

    } catch (error) {
      console.error('Neural system test failed:', error);
    }

    return tests;
  }
};

// Auto-initialize for browser environments
if (typeof window !== 'undefined' && NEURAL_CONFIG.system.autoInitialize) {
  neuralSystemAPI.initialize().catch(console.error);
}

// Export default configuration
export default {
  neuralSystemAPI,
  CalendarNeuralUtils,
  NeuralDevUtils,
  NEURAL_MODELS,
  MODEL_SPECS,
  AGENT_ARCHETYPES,
  NEURAL_CONFIG
};