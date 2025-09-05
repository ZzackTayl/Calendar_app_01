'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  auditLogger,
  type AuditEvent,
  type AuditCategory
} from '@/lib/security/audit-logger';

export function AuditDashboard() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory | 'all'>('all');
  const [selectedOutcome, setSelectedOutcome] = useState<'all' | 'success' | 'failure' | 'pending'>('all');
  const [searchUserId, setSearchUserId] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 24 hours
    end: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState<any>(null);

  // Load audit events
  useEffect(() => {
    const loadEvents = () => {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end + 'T23:59:59');
      
      const allEvents = auditLogger.getAuditEventsInRange(startDate, endDate);
      setEvents(allEvents);
    };

    loadEvents();
    const interval = setInterval(loadEvents, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [dateRange]);

  // Filter events based on criteria
  useEffect(() => {
    let filtered = events;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }

    if (selectedOutcome !== 'all') {
      filtered = filtered.filter(event => event.outcome === selectedOutcome);
    }

    if (searchUserId.trim()) {
      filtered = filtered.filter(event => 
        event.userId?.includes(searchUserId.trim()) ||
        event.details.adminUserId?.includes(searchUserId.trim())
      );
    }

    setFilteredEvents(filtered);
  }, [events, selectedCategory, selectedOutcome, searchUserId]);

  // Generate audit report
  const generateReport = () => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end + 'T23:59:59');
    
    const report = auditLogger.generateAuditReport({
      startDate,
      endDate,
      categories: selectedCategory !== 'all' ? [selectedCategory] : undefined,
      includeFailures: selectedOutcome !== 'success'
    });

    setReportData(report);
  };

  const getCategoryColor = (category: AuditCategory) => {
    const colors = {
      authentication: 'bg-blue-100 text-blue-800',
      authorization: 'bg-green-100 text-green-800',
      session_management: 'bg-purple-100 text-purple-800',
      user_management: 'bg-orange-100 text-orange-800',
      security_event: 'bg-red-100 text-red-800',
      data_access: 'bg-yellow-100 text-yellow-800',
      configuration_change: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success': return 'bg-green-500 text-white';
      case 'failure': return 'bg-red-500 text-white';
      case 'pending': return 'bg-yellow-500 text-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getComplianceColor = (classification: string) => {
    switch (classification) {
      case 'public': return 'bg-blue-100 text-blue-800';
      case 'internal': return 'bg-green-100 text-green-800';
      case 'confidential': return 'bg-orange-100 text-orange-800';
      case 'restricted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audit Dashboard</h1>
        <Button onClick={generateReport} variant="outline">
          Generate Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="authentication">Authentication</SelectItem>
                  <SelectItem value="authorization">Authorization</SelectItem>
                  <SelectItem value="session_management">Session Management</SelectItem>
                  <SelectItem value="user_management">User Management</SelectItem>
                  <SelectItem value="security_event">Security Events</SelectItem>
                  <SelectItem value="data_access">Data Access</SelectItem>
                  <SelectItem value="configuration_change">Config Changes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Outcome</label>
              <Select value={selectedOutcome} onValueChange={(value: any) => setSelectedOutcome(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Search by User ID"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredEvents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {filteredEvents.length > 0 
                ? Math.round((filteredEvents.filter(e => e.outcome === 'success').length / filteredEvents.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {filteredEvents.filter(e => e.outcome === 'failure').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Set(filteredEvents.filter(e => e.userId).map(e => e.userId)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Audit Events</TabsTrigger>
          <TabsTrigger value="report">Audit Report</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Events ({filteredEvents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredEvents.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No audit events found for the selected criteria
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryColor(event.category)}>
                            {event.category.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className={getOutcomeColor(event.outcome)}>
                            {event.outcome}
                          </Badge>
                          <Badge className={getComplianceColor(event.compliance.classification)}>
                            {event.compliance.classification}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-medium">{event.action.replace(/_/g, ' ')}</h3>
                        {event.userId && (
                          <p className="text-sm text-gray-600">User: {event.userId}</p>
                        )}
                        {event.route && (
                          <p className="text-sm text-gray-600">Route: {event.route}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Context:</strong> {event.context.component}
                        </div>
                        <div>
                          <strong>Environment:</strong> {event.context.environment}
                        </div>
                        {event.context.correlationId && (
                          <div>
                            <strong>Correlation ID:</strong> {event.context.correlationId}
                          </div>
                        )}
                        <div>
                          <strong>Regulations:</strong> {event.compliance.regulations.join(', ') || 'None'}
                        </div>
                      </div>

                      {Object.keys(event.details).length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-blue-600">View Details</summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          {reportData ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Report Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{reportData.summary.totalEvents}</div>
                      <div className="text-sm text-gray-600">Total Events</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{reportData.summary.uniqueUsers}</div>
                      <div className="text-sm text-gray-600">Unique Users</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {new Date(reportData.summary.timeRange.start).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600">Start Date</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {new Date(reportData.summary.timeRange.end).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600">End Date</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Events by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(reportData.summary.eventsByCategory).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm">{category.replace(/_/g, ' ')}</span>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Events by Outcome</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(reportData.summary.eventsByOutcome).map(([outcome, count]) => (
                        <div key={outcome} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{outcome}</span>
                          <Badge className={getOutcomeColor(outcome)}>
                            {count as number}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Click "Generate Report" to create an audit report</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}