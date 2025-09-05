/**
 * Security Incident Response System
 * Handles automated response to security incidents and escalation procedures
 */

import { securityLogger, type SecurityEvent, type SecuritySeverity } from './event-logger';
import { securityAlerting } from './alerting-service';
import { getIncidentResponseConfig } from './production-config';

export interface SecurityIncident {
  id: string;
  timestamp: string;
  type: 'auth_bypass' | 'brute_force' | 'suspicious_activity' | 'data_breach' | 'system_compromise';
  severity: SecuritySeverity;
  title: string;
  description: string;
  affectedUsers: string[];
  relatedEvents: SecurityEvent[];
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  responseActions: IncidentAction[];
  assignedTo?: string;
  resolvedAt?: string;
  postMortemRequired: boolean;
}

export interface IncidentAction {
  id: string;
  timestamp: string;
  type: 'automated' | 'manual';
  action: string;
  description: string;
  executedBy: string;
  result: 'success' | 'failed' | 'pending';
  details?: Record<string, any>;
}

export interface AutoResponseRule {
  id: string;
  name: string;
  description: string;
  triggerConditions: {
    eventTypes: string[];
    severity: SecuritySeverity;
    threshold: number;
    timeWindow: number; // minutes
  };
  responseActions: {
    type: 'block_user' | 'lock_account' | 'invalidate_sessions' | 'rate_limit' | 'alert_admin';
    parameters: Record<string, any>;
  }[];
  enabled: boolean;
  cooldownMinutes: number;
}

class SecurityIncidentResponseService {
  private incidents: SecurityIncident[] = [];
  private autoResponseRules: AutoResponseRule[] = [];
  private lastResponseTimes: Map<string, number> = new Map();
  private readonly maxIncidents = 1000;

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default auto-response rules
   */
  private initializeDefaultRules(): void {
    this.autoResponseRules = [
      {
        id: 'auth_bypass_response',
        name: 'Authentication Bypass Response',
        description: 'Immediate response to authentication bypass attempts',
        triggerConditions: {
          eventTypes: ['auth_bypass_attempt'],
          severity: 'critical',
          threshold: 1,
          timeWindow: 5
        },
        responseActions: [
          {
            type: 'invalidate_sessions',
            parameters: { scope: 'affected_user' }
          },
          {
            type: 'alert_admin',
            parameters: { priority: 'critical', immediate: true }
          }
        ],
        enabled: true,
        cooldownMinutes: 1
      },
      {
        id: 'brute_force_response',
        name: 'Brute Force Attack Response',
        description: 'Response to brute force login attempts',
        triggerConditions: {
          eventTypes: ['auth_failure', 'login_attempt_failed'],
          severity: 'high',
          threshold: 5,
          timeWindow: 10
        },
        responseActions: [
          {
            type: 'lock_account',
            parameters: { duration: 15, unit: 'minutes' }
          },
          {
            type: 'rate_limit',
            parameters: { duration: 30, unit: 'minutes', factor: 10 }
          }
        ],
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'suspicious_activity_response',
        name: 'Suspicious Activity Response',
        description: 'Response to patterns of suspicious activity',
        triggerConditions: {
          eventTypes: ['suspicious_activity', 'unauthorized_access'],
          severity: 'medium',
          threshold: 3,
          timeWindow: 15
        },
        responseActions: [
          {
            type: 'alert_admin',
            parameters: { priority: 'high' }
          }
        ],
        enabled: true,
        cooldownMinutes: 10
      },
      {
        id: 'demo_mode_production_response',
        name: 'Demo Mode in Production Response',
        description: 'Immediate response to demo mode activation in production',
        triggerConditions: {
          eventTypes: ['demo_mode_activated'],
          severity: 'critical',
          threshold: 1,
          timeWindow: 1
        },
        responseActions: [
          {
            type: 'block_user',
            parameters: { immediate: true, reason: 'demo_mode_security_violation' }
          },
          {
            type: 'alert_admin',
            parameters: { priority: 'critical', immediate: true }
          }
        ],
        enabled: true,
        cooldownMinutes: 0
      }
    ];
  }

  /**
   * Process security events and trigger incident response if needed
   */
  async processSecurityEvents(events: SecurityEvent[]): Promise<void> {
    for (const rule of this.autoResponseRules.filter(r => r.enabled)) {
      await this.evaluateRule(rule, events);
    }
  }

  /**
   * Evaluate auto-response rule against recent events
   */
  private async evaluateRule(rule: AutoResponseRule, recentEvents: SecurityEvent[]): Promise<void> {
    const cutoff = new Date(Date.now() - rule.triggerConditions.timeWindow * 60 * 1000);
    
    const matchingEvents = recentEvents.filter(event => 
      rule.triggerConditions.eventTypes.includes(event.type) &&
      new Date(event.timestamp) > cutoff &&
      this.severityMatches(event.severity, rule.triggerConditions.severity)
    );

    if (matchingEvents.length >= rule.triggerConditions.threshold) {
      // Check cooldown
      const lastResponseKey = `${rule.id}_response`;
      const lastResponseTime = this.lastResponseTimes.get(lastResponseKey) || 0;
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      
      if (Date.now() - lastResponseTime < cooldownMs) {
        return; // Skip due to cooldown
      }

      // Create incident
      const incident = await this.createIncident(rule, matchingEvents);
      
      // Execute response actions
      await this.executeResponseActions(incident, rule.responseActions);
      
      // Update last response time
      this.lastResponseTimes.set(lastResponseKey, Date.now());
    }
  }

  /**
   * Create security incident
   */
  private async createIncident(rule: AutoResponseRule, events: SecurityEvent[]): Promise<SecurityIncident> {
    const incident: SecurityIncident = {
      id: this.generateIncidentId(),
      timestamp: new Date().toISOString(),
      type: this.determineIncidentType(events),
      severity: this.determineIncidentSeverity(events),
      title: `Auto-Response Triggered: ${rule.name}`,
      description: `${rule.description}. Detected ${events.length} matching events in ${rule.triggerConditions.timeWindow} minutes.`,
      affectedUsers: this.extractAffectedUsers(events),
      relatedEvents: events,
      status: 'open',
      responseActions: [],
      postMortemRequired: events.some(e => e.severity === 'critical')
    };

    this.incidents.push(incident);
    
    // Maintain incident limit
    if (this.incidents.length > this.maxIncidents) {
      this.incidents = this.incidents.slice(-this.maxIncidents);
    }

    // Log incident creation
    securityLogger.logEvent('security_incident_created', {
      incidentId: incident.id,
      incidentType: incident.type,
      severity: incident.severity,
      eventCount: events.length,
      affectedUserCount: incident.affectedUsers.length
    }, 'incident_response', incident.severity);

    console.error(`[INCIDENT-RESPONSE] Security incident created: ${incident.id}`, {
      type: incident.type,
      severity: incident.severity,
      eventCount: events.length
    });

    return incident;
  }

  /**
   * Execute response actions for an incident
   */
  private async executeResponseActions(
    incident: SecurityIncident, 
    actions: AutoResponseRule['responseActions']
  ): Promise<void> {
    for (const actionConfig of actions) {
      const action: IncidentAction = {
        id: this.generateActionId(),
        timestamp: new Date().toISOString(),
        type: 'automated',
        action: actionConfig.type,
        description: this.getActionDescription(actionConfig),
        executedBy: 'incident_response_system',
        result: 'pending'
      };

      try {
        await this.executeAction(actionConfig, incident);
        action.result = 'success';
        action.details = { executed: true, parameters: actionConfig.parameters };
      } catch (error) {
        action.result = 'failed';
        action.details = { error: error instanceof Error ? error.message : 'Unknown error' };
        console.error(`[INCIDENT-RESPONSE] Action failed: ${actionConfig.type}`, error);
      }

      incident.responseActions.push(action);

      // Log action execution
      securityLogger.logEvent('incident_response_action', {
        incidentId: incident.id,
        actionType: actionConfig.type,
        result: action.result,
        parameters: actionConfig.parameters
      }, 'incident_response', action.result === 'failed' ? 'high' : 'medium');
    }
  }

  /**
   * Execute individual response action
   */
  private async executeAction(
    actionConfig: AutoResponseRule['responseActions'][0], 
    incident: SecurityIncident
  ): Promise<void> {
    switch (actionConfig.type) {
      case 'block_user':
        await this.blockUsers(incident.affectedUsers, actionConfig.parameters);
        break;
      
      case 'lock_account':
        await this.lockAccounts(incident.affectedUsers, actionConfig.parameters);
        break;
      
      case 'invalidate_sessions':
        await this.invalidateSessions(incident.affectedUsers, actionConfig.parameters);
        break;
      
      case 'rate_limit':
        await this.applyRateLimit(incident.affectedUsers, actionConfig.parameters);
        break;
      
      case 'alert_admin':
        await this.alertAdministrators(incident, actionConfig.parameters);
        break;
      
      default:
        throw new Error(`Unknown action type: ${actionConfig.type}`);
    }
  }

  /**
   * Block users (placeholder - would integrate with auth system)
   */
  private async blockUsers(userIds: string[], parameters: Record<string, any>): Promise<void> {
    console.log(`[INCIDENT-RESPONSE] Blocking users:`, { userIds, parameters });
    // Implementation would integrate with your auth system
    // For now, just log the action
  }

  /**
   * Lock user accounts (placeholder - would integrate with auth system)
   */
  private async lockAccounts(userIds: string[], parameters: Record<string, any>): Promise<void> {
    console.log(`[INCIDENT-RESPONSE] Locking accounts:`, { userIds, parameters });
    // Implementation would integrate with your auth system
  }

  /**
   * Invalidate user sessions (placeholder - would integrate with auth system)
   */
  private async invalidateSessions(userIds: string[], parameters: Record<string, any>): Promise<void> {
    console.log(`[INCIDENT-RESPONSE] Invalidating sessions:`, { userIds, parameters });
    // Implementation would integrate with your session management system
  }

  /**
   * Apply rate limiting (placeholder - would integrate with rate limiting system)
   */
  private async applyRateLimit(userIds: string[], parameters: Record<string, any>): Promise<void> {
    console.log(`[INCIDENT-RESPONSE] Applying rate limits:`, { userIds, parameters });
    // Implementation would integrate with your rate limiting system
  }

  /**
   * Alert administrators
   */
  private async alertAdministrators(incident: SecurityIncident, parameters: Record<string, any>): Promise<void> {
    const config = getIncidentResponseConfig();
    
    // Send through alerting system
    await securityAlerting.sendAlert({
      id: `incident_${incident.id}`,
      timestamp: incident.timestamp,
      type: 'critical_event',
      severity: incident.severity,
      title: `Security Incident: ${incident.title}`,
      description: `${incident.description}\n\nAffected Users: ${incident.affectedUsers.length}\nRelated Events: ${incident.relatedEvents.length}`,
      events: incident.relatedEvents,
      acknowledged: false
    });

    console.error(`[INCIDENT-RESPONSE] Administrator alert sent for incident: ${incident.id}`);
  }

  /**
   * Manually create incident
   */
  createManualIncident(
    type: SecurityIncident['type'],
    severity: SecuritySeverity,
    title: string,
    description: string,
    affectedUsers: string[] = [],
    relatedEvents: SecurityEvent[] = []
  ): SecurityIncident {
    const incident: SecurityIncident = {
      id: this.generateIncidentId(),
      timestamp: new Date().toISOString(),
      type,
      severity,
      title,
      description,
      affectedUsers,
      relatedEvents,
      status: 'open',
      responseActions: [],
      postMortemRequired: severity === 'critical'
    };

    this.incidents.push(incident);
    
    securityLogger.logEvent('security_incident_created', {
      incidentId: incident.id,
      incidentType: incident.type,
      severity: incident.severity,
      manual: true
    }, 'incident_response', incident.severity);

    return incident;
  }

  /**
   * Update incident status
   */
  updateIncidentStatus(incidentId: string, status: SecurityIncident['status']): boolean {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident) {
      incident.status = status;
      if (status === 'resolved') {
        incident.resolvedAt = new Date().toISOString();
      }
      
      securityLogger.logEvent('incident_status_updated', {
        incidentId,
        newStatus: status,
        resolvedAt: incident.resolvedAt
      }, 'incident_response', 'medium');
      
      return true;
    }
    return false;
  }

  /**
   * Get all incidents
   */
  getIncidents(limit: number = 100): SecurityIncident[] {
    return this.incidents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get open incidents
   */
  getOpenIncidents(): SecurityIncident[] {
    return this.incidents
      .filter(incident => incident.status === 'open' || incident.status === 'investigating')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId: string): SecurityIncident | undefined {
    return this.incidents.find(i => i.id === incidentId);
  }

  /**
   * Helper methods
   */
  private severityMatches(eventSeverity: SecuritySeverity, ruleSeverity: SecuritySeverity): boolean {
    const levels = ['low', 'medium', 'high', 'critical'];
    const eventLevel = levels.indexOf(eventSeverity);
    const ruleLevel = levels.indexOf(ruleSeverity);
    return eventLevel >= ruleLevel;
  }

  private determineIncidentType(events: SecurityEvent[]): SecurityIncident['type'] {
    const types = events.map(e => e.type);
    if (types.includes('auth_bypass_attempt')) return 'auth_bypass';
    if (types.includes('auth_failure')) return 'brute_force';
    if (types.includes('suspicious_activity')) return 'suspicious_activity';
    return 'suspicious_activity';
  }

  private determineIncidentSeverity(events: SecurityEvent[]): SecuritySeverity {
    const severities = events.map(e => e.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  private extractAffectedUsers(events: SecurityEvent[]): string[] {
    const users = new Set<string>();
    events.forEach(event => {
      if (event.userId) users.add(event.userId);
      if (event.metadata?.affectedUserId) users.add(event.metadata.affectedUserId);
    });
    return Array.from(users);
  }

  private getActionDescription(actionConfig: AutoResponseRule['responseActions'][0]): string {
    switch (actionConfig.type) {
      case 'block_user': return 'Block affected users';
      case 'lock_account': return 'Lock affected user accounts';
      case 'invalidate_sessions': return 'Invalidate user sessions';
      case 'rate_limit': return 'Apply rate limiting';
      case 'alert_admin': return 'Alert administrators';
      default: return `Execute ${actionConfig.type}`;
    }
  }

  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const incidentResponse = new SecurityIncidentResponseService();

// Convenience functions
export const createSecurityIncident = (
  type: SecurityIncident['type'],
  severity: SecuritySeverity,
  title: string,
  description: string,
  affectedUsers?: string[],
  relatedEvents?: SecurityEvent[]
) => incidentResponse.createManualIncident(type, severity, title, description, affectedUsers, relatedEvents);

export const processSecurityEvents = (events: SecurityEvent[]) => 
  incidentResponse.processSecurityEvents(events);

export const getSecurityIncidents = (limit?: number) => incidentResponse.getIncidents(limit);
export const getOpenSecurityIncidents = () => incidentResponse.getOpenIncidents();
export const updateSecurityIncidentStatus = (incidentId: string, status: SecurityIncident['status']) => 
  incidentResponse.updateIncidentStatus(incidentId, status);