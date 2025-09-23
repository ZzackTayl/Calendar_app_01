# Claude AI Assistant Guidelines

## Core Project Identity

**Project**: PolyHarmony Calendar - Advanced polyamory relationship scheduling application
**Purpose**: Enable healthy polyamory relationships through intelligent scheduling, privacy controls, and conflict detection
**Technical Stack**: Next.js 14, Supabase, TypeScript, Tailwind CSS, shadcn/ui

## Development Philosophy

- **Mobile-First**: Design for mobile users while developing on desktop for testing
- **Security-First**: Multi-layered security with privacy boundaries and encryption
- **User-Centric**: Non-developer users require comprehensive guidance and validation
- **Quality-First**: Production-ready code, comprehensive testing, performance optimization

## AI Context Engineering Integration

This project implements advanced AI context engineering to optimize token usage and ensure accurate responses:

### Context Hierarchy System

**Layer 1: Core Identity (Always Included)**
- Project purpose, technical stack, development philosophy
- Ensures AI always understands the PolyHarmony Calendar context

**Layer 2: Session Context (Session-Specific)**
- Current git branch, active task, recent changes
- Maintains focus on current development work

**Layer 3: Task Context (Request-Specific)**
- Relevant files, dependencies, test status
- Provides exactly what's needed for the current task

**Layer 4: Reference Context (On-Demand)**
- Architecture decisions, security policies, implementation guides
- Loaded only when specifically needed

### Context Optimization Rules

1. **Smart Context Selection**: Analyze requests to provide only relevant context
2. **Token Budget Management**: Prioritize highest-value context within token limits
3. **Context Caching**: Cache frequently accessed context to avoid re-reading
4. **Relevance Scoring**: Score context by relevance to user requests

### Expected Benefits
- 40-60% reduction in token usage through smart context selection
- Faster response times through intelligent caching
- More accurate responses with relevant, focused context
- Reduced need for document lookups during development

## Communication Guidelines

### User Profile Requirements
- **Non-Developer User**: Provide comprehensive guidance, explain terminology, offer options
- **Validation-First**: Verify prerequisites, check completion status, validate environment
- **Step-by-Step**: Break complex tasks into clear sequential steps
- **Success Criteria**: Define what successful completion looks like

### Error Handling Protocol
1. **Analyze errors** and identify root causes based on expertise
2. **Reflect on 5-7 possible sources** and distill to 1-2 most likely
3. **Add logs** to validate assumptions about root causes
4. **Confirm diagnosis** before implementing fixes

### Development Standards
- **No Mocks/Placeholders**: Provide fully implemented, production-ready code
- **Complete Implementations**: No TODO comments or incomplete features
- **Security-First**: Input validation, error handling, security measures from start
- **Test-Ready**: All code must be accompanied by comprehensive tests
- **Production Standards**: Code must meet production quality requirements

## Testing & Validation Requirements

### Production Readiness Testing (CRITICAL)
- **Privacy Boundary Testing**: 4-level privacy system enforcement
- **Multi-Relationship Scenario Testing**: Complex polycule dynamics
- **Performance & Reliability Testing**: Sub-2 second conflict detection
- **Email/Invitation System Load Testing**: 1000+ simultaneous users
- **Data Integrity & Recovery Testing**: No lost or corrupted data
- **Production Monitoring Testing**: Critical failure mode alerting
- **User Journey Testing**: End-to-end alpha/beta user experience

### Development Workflow
- **Docker-First**: Use Docker for all testing environments
- **Test-Driven**: Write tests first, implement to pass
- **FAST Principles**: Fast, Independent, Repeatable, Self-Validating, Timely
- **Given-When-Then**: Structure tests with clear setup, action, verification

## Key Implementation Patterns

### Dual-Mode Architecture
- **Demo Store**: LocalStorage-based implementation for offline/demo usage
- **Supabase Integration**: Full production implementation with real-time features
- **Unified API Layer**: Components work seamlessly with either mode

### Privacy-First Design
- **4-Level Privacy System**: Private, Semi-Private, Visible, Public
- **Relationship-Aware Permissions**: Privacy controls based on relationship connections
- **Audit Logging**: Comprehensive tracking of permission changes

### Security Architecture
- **Middleware Security**: Route protection, session validation, CSRF protection
- **Rate Limiting**: Multi-tier protection (Auth: 5/15min, API: 100/min, Events: 30/min)
- **Input Validation**: Zod schemas with comprehensive validation
- **Encryption**: AES-256 encryption for sensitive data

## Context Engineering Best Practices

### When Providing Context
1. **Analyze Request Intent**: Understand what the user actually needs
2. **Select Relevant Files**: Include only files directly related to the task
3. **Provide Context Summaries**: Don't just dump entire files, provide summaries
4. **Use Context Hierarchy**: Apply the 4-layer system for optimal relevance

### Token Optimization
- **Cache Frequently Used Context**: Avoid re-reading the same files
- **Prioritize High-Value Content**: Focus on code examples over documentation
- **Use Context-Aware Prompts**: Tailor prompts to specific task types
- **Monitor Context Usage**: Track effectiveness and adjust as needed

### Context Quality Assurance
- **Relevance Validation**: Ensure provided context actually helps with the task
- **Freshness Checks**: Verify context is current and not stale
- **User Feedback Integration**: Use user feedback to improve context selection
- **Continuous Optimization**: Regularly review and improve context strategies

## Success Metrics

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

## Integration with AI Context Engineering Plan

This document integrates with the comprehensive `AI_CONTEXT_ENGINEERING_PLAN.md` which provides:
- Detailed context hierarchy implementation
- Smart context caching mechanisms
- Task-specific prompt templates
- Context usage monitoring and optimization
- Implementation phases and success metrics

Refer to `AI_CONTEXT_ENGINEERING_PLAN.md` for technical implementation details and advanced context optimization strategies.
