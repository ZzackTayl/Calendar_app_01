# AI Context Engineering & Token Optimization Plan

## Executive Summary

Your current setup has good foundational elements (Mem0 memory system, Cursor rules, comprehensive documentation) but lacks a structured approach to AI context engineering. This plan provides a systematic framework for optimizing AI interactions while reducing token usage and preventing context fragmentation.

## Current State Analysis

### ✅ What's Working Well
- **Mem0 Integration**: Good memory persistence across sessions
- **Cursor Rules**: Clear behavioral guidelines for AI assistants
- **Comprehensive Documentation**: Extensive project knowledge base
- **Development Optimization**: Streamlined environment configuration

### ❌ Missing Context Engineering
- **No Context Hierarchy**: All information treated with equal importance
- **No Context Caching**: Models must re-read documents on each request
- **No Prompt Optimization**: No structured prompt templates
- **No Context Monitoring**: No token usage tracking or optimization

---

## 🏗️ Context Engineering Architecture

### 1. Context Hierarchy System

**Layer 1: Core Identity (Always Included)**
- Project purpose: "PolyHarmony Calendar - Polyamory relationship scheduling"
- Technical stack: "Next.js 14, Supabase, TypeScript, Tailwind"
- Development philosophy: "Mobile-first, security-first, privacy-first"

**Layer 2: Current Session Context (Session-Specific)**
- Active branch: `current-git-branch`
- Current focus: `active-task-or-feature`
- Recent changes: `last-5-commits-summary`
- Known issues: `active-bugs-or-warnings`

**Layer 3: Task-Specific Context (Request-Specific)**
- File being worked on: `current-file-context`
- Related files: `dependency-chain`
- Recent modifications: `last-changes-in-session`
- Test status: `current-test-results`

**Layer 4: Reference Context (On-Demand)**
- Architecture decisions: `docs/ARCHITECTURE.md`
- Security policies: `docs/SECURITY.md`
- Implementation guides: `IMPLEMENTATION_PLAN.md`

### 2. Context Caching System

**Smart Context Loading:**
```typescript
// Context cache with TTL and relevance scoring
interface ContextCache {
  key: string;              // Hash of context content
  content: string;          // Actual context text
  lastAccessed: number;     // Last access timestamp
  accessCount: number;      // How often accessed
  relevanceScore: number;   // Context relevance score
  size: number;             // Token count
  expiresAt: number;        // Expiration time
}
```

**Context Selection Algorithm:**
1. **Static Analysis**: Parse file dependencies and imports
2. **Semantic Similarity**: Match request content to document topics
3. **Recency Weighting**: Prioritize recently accessed context
4. **Size Optimization**: Select highest relevance within token budget

### 3. Prompt Template System

**Structured Prompt Architecture:**
```typescript
// Base prompt template with context injection points
const BASE_PROMPT = `
You are an expert full-stack developer working on PolyHarmony Calendar.
Project Context: {core_identity}

Current Session: {session_context}
Task Context: {task_context}

Relevant Code: {relevant_code}
Related Files: {related_files}

User Request: {user_request}

Instructions:
1. Analyze the request in the context of the project
2. Use provided context to inform your response
3. If context is insufficient, request specific additional information
4. Maintain consistency with existing patterns and architecture
`;

interface PromptBuilder {
  buildPrompt(request: UserRequest, context: ContextData): string;
  optimizeContext(context: ContextData, maxTokens: number): ContextData;
}
```

---

## 🚀 Implementation Plan

### Phase 1: Context Infrastructure (Week 1)

#### 1.1 Context Hierarchy Implementation
**Files to Create/Modify:**
- `lib/ai-context/core-identity.ts` - Define project identity and rules
- `lib/ai-context/session-manager.ts` - Track current session state
- `lib/ai-context/context-hierarchy.ts` - Implement layered context system
- `lib/ai-context/context-cache.ts` - Context caching with TTL

#### 1.2 Context Selection Engine
**Algorithm Implementation:**
```typescript
// TODO: Implement calculateRelevance function
// calculateRelevance should:
// - Accept (request: string, content: string) as inputs
// - Return a number between 0-1 representing relevance score
// - Use semantic similarity, keyword matching, or other heuristics
// - Higher scores indicate more relevant content to the request

// Context selection based on relevance and token budget
function selectOptimalContext(
  request: string,
  availableContexts: ContextItem[],
  maxTokens: number = 4000,
  relevanceThreshold: number = 0.3  // Only include contexts above this relevance score
): ContextItem[] {
  // Score contexts by relevance
  const scored = availableContexts.map(ctx => ({
    ...ctx,
    relevance: calculateRelevance(request, ctx.content)
  }));

  // Filter by relevance threshold and sort by relevance
  return scored
    .filter(ctx => ctx.relevance >= relevanceThreshold)  // Skip low-relevance contexts
    .sort((a, b) => b.relevance - a.relevance)
    .reduce((selected, ctx) => {
      const currentTokens = selected.reduce((sum, c) => sum + c.size, 0);
      if (currentTokens + ctx.size <= maxTokens) {
        selected.push(ctx);
      }
      return selected;
    }, [] as ContextItem[]);
}
```

#### 1.3 Context Monitoring
**Token Usage Tracking:**
- Track tokens used per request type
- Monitor context hit rates and cache efficiency
- Alert when context becomes stale or insufficient

### Phase 2: Prompt Optimization (Week 1-2)

#### 2.1 Template System

**Prompt Templates by Task Type:**
- **Feature Implementation**: Focus on business logic and integration
- **Bug Fix**: Emphasize error patterns and debugging context
- **Refactoring**: Highlight architectural patterns and consistency
- **Documentation**: Include related documentation context

#### 2.2 Context-Aware Prompts

**Dynamic Prompt Construction:**
```typescript
// Example: Context-aware feature implementation prompt
const FEATURE_PROMPT = `
Implement {feature_name} for the PolyHarmony Calendar.

Core Requirements: {feature_requirements}
Privacy Considerations: {privacy_constraints}
Security Requirements: {security_requirements}

Existing Similar Features: {similar_features_context}
Integration Points: {integration_context}
Testing Requirements: {testing_context}

Current Implementation: {current_code_context}

Please implement this feature following the established patterns and ensuring:
1. Multi-partner privacy boundaries are respected
2. Real-time updates work correctly
3. Security validation is included
4. Comprehensive tests are added
`;
```

### Phase 3: Integration & Optimization (Week 2)

#### 3.1 Cursor Integration

**Update Cursor Configuration:**

- Add context-aware prompt templates
- Implement context caching for Cursor requests
- Set up context monitoring and analytics

#### 3.2 Performance Optimization

**Context Preloading:**

- Preload frequently accessed context on session start
- Cache context for active files and related dependencies
- Optimize context updates based on file change patterns

#### 3.3 Quality Assurance

**Context Quality Metrics:**
- Track context relevance accuracy
- Monitor false positive/negative rates
- Measure token efficiency improvements
- Validate context freshness

---

## 📊 Success Metrics

### Context Engineering Metrics

- **Context Hit Rate**: >90% of requests have sufficient context
- **Cache Efficiency**: >80% of context requests served from cache
- **Relevance Accuracy**: >95% of provided context is actually relevant
- **Token Reduction**: 40-60% reduction in average token usage

### User Experience Metrics

- **Response Quality**: Consistent, contextually appropriate responses
- **Speed Improvement**: Faster response times due to cached context
- **Error Reduction**: Fewer mistakes due to insufficient context
- **Consistency**: Maintained architectural consistency across sessions

### Development Workflow Metrics

- **Reduced Document References**: <20% of requests require additional document lookup
- **Context Continuity**: Maintain context across sessions
- **Knowledge Retention**: No loss of project-specific knowledge
- **Onboarding Speed**: New AI assistants quickly understand project context

---

## 🛠️ Implementation Files

### Core Context System
```
lib/ai-context/
├── core-identity.ts          # Project identity and rules
├── session-manager.ts        # Session state tracking
├── context-hierarchy.ts      # Layered context system
├── context-cache.ts          # Context caching system
├── context-selector.ts       # Context selection algorithm
└── context-monitor.ts        # Context usage monitoring

lib/ai-prompts/
├── prompt-builder.ts         # Dynamic prompt construction
├── templates/                # Task-specific prompt templates
│   ├── feature-implementation.md
│   ├── bug-fix.md
│   ├── refactoring.md
│   └── documentation.md
└── context-optimizer.ts      # Context optimization logic

scripts/
├── setup-ai-context.js       # Context system initialization
├── validate-context-cache.js # Context cache validation
└── monitor-context-usage.js  # Usage monitoring and reporting
```

### Configuration Files

```
.cursor/
├── context-rules.mdc         # Context engineering rules
└── environment.json          # Updated with context settings

docs/
├── AI_CONTEXT_GUIDE.md       # AI assistant usage guide
└── CONTEXT_ENGINEERING.md    # Technical documentation
```

---

## 🎯 Quick Wins (Immediate Impact)

### 1. Context-Aware File Reading

**Problem**: AI reads entire files without context
**Solution**: Add context-aware file reading with summaries

```typescript
// Define interface for context-aware file reading result
interface FileWithContext {
  summary: string;
  relevant: string[];
  full?: string;  // Optional, only included when specifically requested
}

// Context-aware file reading with proper typing and error handling
async function readFileWithContext(filePath: string, context: string): Promise<FileWithContext> {
  try {
    // Use fs/promises for typed async file operations
    const { readFile } = await import('fs/promises');
    const fileContent: string = await readFile(filePath, 'utf-8');
    
    // Generate context-aware summaries and relevant sections
    let contextSummary: string;
    let relevantSections: string[];
    
    try {
      contextSummary = await generateContextSummary(fileContent, context);
      relevantSections = await extractRelevantSections(fileContent, context);
    } catch (processingError) {
      // If processing fails, provide graceful degradation
      console.error(`Failed to process context for ${filePath}:`, processingError);
      throw new Error(`Context processing failed for ${filePath}: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`);
    }

    return {
      summary: contextSummary,
      relevant: relevantSections,
      full: fileContent // Only when specifically requested
    };
  } catch (error) {
    // Handle file reading errors
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(`Failed to read file with context: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### 2. Session Context Persistence

**Problem**: Context lost between AI requests
**Solution**: Maintain session context across requests

```typescript
// Session context manager
class SessionContext {
  constructor() {
    this.activeFiles = new Set();
    this.recentChanges = [];
    this.currentFocus = null;
  }

  addFile(filePath: string) {
    this.activeFiles.add(filePath);
    // Maintain context for recently accessed files
  }

  setFocus(task: string) {
    this.currentFocus = task;
  }

  getRelevantContext(): ContextData {
    // Return context relevant to current task
    return this.buildContextFromSession();
  }
}
```

### 3. Smart Context Caching
**Problem**: Same context re-read multiple times
**Solution**: Implement intelligent caching with relevance scoring

```typescript
// Define CacheEntry interface with all required properties
interface CacheEntry {
  content: string;
  lastAccessed: number;
  accessCount: number;
  relevance: number;
  ttl?: number;  // Optional TTL override per entry
}

// Smart context cache with concurrency protection and proper typing
class ContextCache {
  private cache = new Map<string, CacheEntry>();
  private loadingPromises = new Map<string, Promise<string>>();  // Track in-flight loads
  private readonly DEFAULT_TTL = 30 * 60 * 1000;  // 30 minutes default TTL

  async getOrLoad(key: string, loader: () => Promise<string>): Promise<string> {
    const entry = this.cache.get(key);

    // Return cached entry if valid and not expired
    if (entry && !this.isExpired(entry)) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();  // Update last accessed time
      return entry.content;
    }

    // Check if already loading to prevent concurrent loads
    const existingLoader = this.loadingPromises.get(key);
    if (existingLoader) {
      return existingLoader;
    }

    // Create loading promise to prevent duplicate loads
    const loadPromise = (async () => {
      try {
        const content = await loader();
        
        // Store in cache with metadata
        this.cache.set(key, {
          content,
          lastAccessed: Date.now(),
          accessCount: 1,
          relevance: this.calculateRelevance(key, content)
        });
        
        return content;
      } finally {
        // Always clean up loading promise, even if loader fails
        this.loadingPromises.delete(key);
      }
    })();

    // Store loading promise for concurrent callers
    this.loadingPromises.set(key, loadPromise);
    
    return loadPromise;
  }

  // Check if cache entry is expired
  private isExpired(entry: CacheEntry): boolean {
    const ttl = entry.ttl ?? this.DEFAULT_TTL;
    return Date.now() > entry.lastAccessed + ttl;
  }

  // Calculate relevance score for content (placeholder implementation)
  private calculateRelevance(key: string, content: string): number {
    // TODO: Implement actual relevance calculation
    // For now, use a simple heuristic based on key/content length ratio
    const keyWords = key.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    let matches = 0;
    
    keyWords.forEach(word => {
      if (contentLower.includes(word)) matches++;
    });
    
    return Math.min(1, matches / keyWords.length);
  }
}
```

---

## 🚨 Risk Mitigation

### Context Quality Risks
- **Stale Context**: Implement context freshness checks and automatic invalidation
- **Irrelevant Context**: Use relevance scoring and user feedback to improve accuracy
- **Context Overload**: Set reasonable token limits and prioritize most relevant content

### Implementation Risks
- **Performance Impact**: Cache aggressively and optimize context loading
- **Memory Usage**: Monitor cache size and implement LRU eviction
- **Integration Issues**: Start with non-breaking changes and gradual rollout

### Migration Risks
- **Existing Workflow Disruption**: Maintain backward compatibility
- **Learning Curve**: Provide clear documentation and migration guides
- **Error Recovery**: Implement fallback mechanisms for context failures

---

## 📈 Expected Benefits

### Immediate Benefits (Week 1)
- **30-50% reduction** in token usage through smart context selection
- **Faster response times** through context caching
- **More accurate responses** with relevant context
- **Reduced document lookups** as AI has sufficient context

### Long-term Benefits (Week 2+)
- **Consistent architecture** maintained across development sessions
- **Knowledge retention** even with AI assistant changes
- **Improved productivity** through better context understanding
- **Reduced mistakes** from insufficient context

---

## 🎯 Next Steps

1. **Start with Core Context**: Implement the basic context hierarchy and caching
2. **Add Session Management**: Track current session state and recent changes
3. **Implement Smart Caching**: Cache frequently accessed context with relevance scoring
4. **Create Prompt Templates**: Build task-specific prompt templates
5. **Monitor and Optimize**: Track usage patterns and continuously improve

This approach will give your AI models the context they need while dramatically reducing token usage and eliminating the need to constantly reference documents.
