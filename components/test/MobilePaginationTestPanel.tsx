'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Monitor,
  Tablet,
  Activity,
  Download,
  Upload,
  Network,
  Eye,
  TouchpadIcon
} from 'lucide-react'

interface PaginationTestResult {
  endpoint: string
  method: string
  status: number
  responseTime: number
  dataSize: number
  success: boolean
  error?: string
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface NetworkCondition {
  name: string
  downloadSpeed: number // Mbps
  uploadSpeed: number // Mbps
  latency: number // ms
  icon: React.ComponentType<any>
}

const NETWORK_CONDITIONS: NetworkCondition[] = [
  { name: '5G', downloadSpeed: 100, uploadSpeed: 50, latency: 10, icon: Network },
  { name: '4G', downloadSpeed: 10, uploadSpeed: 5, latency: 50, icon: Network },
  { name: '3G', downloadSpeed: 1, uploadSpeed: 0.5, latency: 200, icon: Network },
  { name: 'WiFi', downloadSpeed: 50, uploadSpeed: 25, latency: 20, icon: Wifi },
  { name: 'Slow WiFi', downloadSpeed: 2, uploadSpeed: 1, latency: 100, icon: WifiOff }
]

const DEVICE_TYPES = [
  { name: 'iPhone', width: 390, height: 844, userAgent: 'iPhone Safari' },
  { name: 'Android', width: 360, height: 800, userAgent: 'Android Chrome' },
  { name: 'iPad', width: 820, height: 1180, userAgent: 'iPad Safari' },
  { name: 'Desktop', width: 1920, height: 1080, userAgent: 'Desktop Chrome' }
]

const PAGINATION_ENDPOINTS = [
  { path: '/api/events', name: 'Events' },
  { path: '/api/contacts', name: 'Contacts' },
  { path: '/api/attachments', name: 'Attachments' }
]

export default function MobilePaginationTestPanel() {
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState('')
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<PaginationTestResult[]>([])
  const [networkCondition, setNetworkCondition] = useState(NETWORK_CONDITIONS[0])
  const [deviceType, setDeviceType] = useState(DEVICE_TYPES[0])
  const [isOnline, setIsOnline] = useState(navigator.onLine !== false)
  const [touchSupported, setTouchSupported] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Detect touch support
    setTouchSupported('ontouchstart' in window || navigator.maxTouchPoints > 0)

    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const simulateNetworkDelay = (condition: NetworkCondition) => {
    return new Promise(resolve => setTimeout(resolve, condition.latency))
  }

  const makeTestRequest = useCallback(async (
    endpoint: string,
    params: URLSearchParams = new URLSearchParams()
  ): Promise<PaginationTestResult> => {
    const startTime = performance.now()

    // Add default pagination parameters if not present
    if (!params.has('page')) params.set('page', '1')
    if (!params.has('pageSize')) params.set('pageSize', '20')

    const url = `${endpoint}?${params.toString()}`

    try {
      // Simulate network conditions
      await simulateNetworkDelay(networkCondition)

      const response = await fetch(url, {
        headers: {
          'User-Agent': getDeviceUserAgent(deviceType.userAgent),
          'Accept': 'application/json',
          'X-Test-Device': deviceType.name,
          'X-Test-Network': networkCondition.name
        }
      })

      const endTime = performance.now()
      const responseTime = endTime - startTime

      let data = null
      let dataSize = 0

      if (response.headers.get('content-type')?.includes('application/json')) {
        const text = await response.text()
        dataSize = new Blob([text]).size
        data = JSON.parse(text)
      }

      return {
        endpoint,
        method: 'GET',
        status: response.status,
        responseTime,
        dataSize,
        success: response.ok && data?.pagination !== undefined,
        pagination: data?.pagination,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      const endTime = performance.now()
      const responseTime = endTime - startTime

      return {
        endpoint,
        method: 'GET',
        status: 0,
        responseTime,
        dataSize: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }, [networkCondition, deviceType])

  const getDeviceUserAgent = (userAgentType: string): string => {
    const userAgents = {
      'iPhone Safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Android Chrome': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'iPad Safari': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Desktop Chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    return userAgents[userAgentType as keyof typeof userAgents] || userAgents['iPhone Safari']
  }

  const runPaginationTests = async () => {
    setIsRunning(true)
    setResults([])
    setProgress(0)

    const tests = []

    // Generate test cases
    for (const endpoint of PAGINATION_ENDPOINTS) {
      // Basic pagination test
      tests.push({
        name: `${endpoint.name} - Basic pagination`,
        endpoint: endpoint.path,
        params: new URLSearchParams({ page: '1', pageSize: '10' })
      })

      // Large page size test
      tests.push({
        name: `${endpoint.name} - Large page size`,
        endpoint: endpoint.path,
        params: new URLSearchParams({ page: '1', pageSize: '50' })
      })

      // Legacy parameters test
      tests.push({
        name: `${endpoint.name} - Legacy parameters`,
        endpoint: endpoint.path,
        params: new URLSearchParams({ limit: '10', offset: '0' })
      })

      // Invalid parameters test
      tests.push({
        name: `${endpoint.name} - Invalid parameters`,
        endpoint: endpoint.path,
        params: new URLSearchParams({ page: '0', pageSize: '1000' })
      })

      // Page navigation test
      tests.push({
        name: `${endpoint.name} - Page navigation`,
        endpoint: endpoint.path,
        params: new URLSearchParams({ page: '2', pageSize: '10' })
      })
    }

    const testResults: PaginationTestResult[] = []

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]
      setCurrentTest(test.name)

      try {
        const result = await makeTestRequest(test.endpoint, test.params)
        testResults.push(result)
        setResults([...testResults])
      } catch (error) {
        console.error(`Test failed: ${test.name}`, error)
      }

      setProgress(((i + 1) / tests.length) * 100)
    }

    setIsRunning(false)
    setCurrentTest('Tests completed')
  }

  const testTouchInteractions = async () => {
    if (!touchSupported) {
      alert('Touch interactions not supported on this device')
      return
    }

    setCurrentTest('Testing touch interactions...')

    // Simulate touch scroll test
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 100
      setScrollPosition(scrollRef.current.scrollTop)
    }

    // Test pull-to-refresh gesture (simulated)
    setLoadingStates({ pullToRefresh: true })
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoadingStates({ pullToRefresh: false })

    setCurrentTest('Touch interaction tests completed')
  }

  const testInfiniteScroll = useCallback(async () => {
    setCurrentTest('Testing infinite scroll...')

    for (let page = 1; page <= 3; page++) {
      setLoadingStates({ infiniteScroll: true })

      const result = await makeTestRequest('/api/events', new URLSearchParams({
        page: page.toString(),
        pageSize: '10'
      }))

      setResults(prev => [...prev, result])

      // Simulate scroll delay between pages
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setLoadingStates({ infiniteScroll: false })
    setCurrentTest('Infinite scroll test completed')
  }, [makeTestRequest])

  const testOfflineMode = async () => {
    setCurrentTest('Testing offline behavior...')

    // Simulate offline request
    try {
      const result = await makeTestRequest('/api/events', new URLSearchParams({
        page: '1',
        pageSize: '10'
      }))

      // In a real offline test, this would fail or return cached data
      setResults(prev => [...prev, {
        ...result,
        error: isOnline ? undefined : 'Offline - using cached data'
      }])
    } catch (error) {
      setResults(prev => [...prev, {
        endpoint: '/api/events',
        method: 'GET',
        status: 0,
        responseTime: 0,
        dataSize: 0,
        success: false,
        error: 'Network unavailable - offline mode'
      }])
    }

    setCurrentTest('Offline test completed')
  }

  const getSuccessRate = () => {
    if (results.length === 0) return 0
    const successCount = results.filter(r => r.success).length
    return (successCount / results.length) * 100
  }

  const getAverageResponseTime = () => {
    if (results.length === 0) return 0
    const total = results.reduce((sum, r) => sum + r.responseTime, 0)
    return total / results.length
  }

  const getTotalDataTransfer = () => {
    return results.reduce((sum, r) => sum + r.dataSize, 0)
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Pagination API Testing Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Device Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Device Type</label>
              <div className="grid grid-cols-2 gap-2">
                {DEVICE_TYPES.map((device) => (
                  <Button
                    key={device.name}
                    variant={deviceType.name === device.name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDeviceType(device)}
                    className="flex items-center gap-2"
                  >
                    {device.name === 'iPad' ? <Tablet className="h-4 w-4" /> :
                     device.name === 'Desktop' ? <Monitor className="h-4 w-4" /> :
                     <Smartphone className="h-4 w-4" />}
                    {device.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Network Condition */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Network Condition</label>
              <div className="grid grid-cols-1 gap-2">
                {NETWORK_CONDITIONS.map((condition) => (
                  <Button
                    key={condition.name}
                    variant={networkCondition.name === condition.name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNetworkCondition(condition)}
                    className="flex items-center gap-2"
                  >
                    <condition.icon className="h-4 w-4" />
                    {condition.name}
                    <Badge variant="secondary" className="text-xs">
                      {condition.latency}ms
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* Status Indicators */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </Badge>
                )}

                {touchSupported ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <TouchpadIcon className="h-3 w-3" />
                    Touch
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Monitor className="h-3 w-3" />
                    Mouse
                  </Badge>
                )}
              </div>

              <div className="text-sm space-y-1">
                <div>Device: {deviceType.width}×{deviceType.height}</div>
                <div>Network: {networkCondition.downloadSpeed} Mbps</div>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              onClick={runPaginationTests}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              Run API Tests
            </Button>

            <Button
              onClick={testTouchInteractions}
              disabled={isRunning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TouchpadIcon className="h-4 w-4" />
              Test Touch
            </Button>

            <Button
              onClick={testInfiniteScroll}
              disabled={isRunning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Test Infinite Scroll
            </Button>

            <Button
              onClick={testOfflineMode}
              disabled={isRunning}
              variant="outline"
              className="flex items-center gap-2"
            >
              <WifiOff className="h-4 w-4" />
              Test Offline
            </Button>
          </div>

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span>{currentTest}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results Summary */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Success Rate</div>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold">
                    {getSuccessRate().toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Avg Response Time</div>
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold">
                    {getAverageResponseTime().toFixed(0)}ms
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Total Tests</div>
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold">
                    {results.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Data Transfer</div>
                    <Download className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold">
                    {(getTotalDataTransfer() / 1024).toFixed(1)}KB
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="table" className="w-full">
              <TabsList>
                <TabsTrigger value="table">Table View</TabsTrigger>
                <TabsTrigger value="details">Detailed View</TabsTrigger>
              </TabsList>

              <TabsContent value="table">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Endpoint</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Response Time</th>
                        <th className="text-left p-2">Data Size</th>
                        <th className="text-left p-2">Pagination</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{result.endpoint}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {result.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              {result.status}
                            </div>
                          </td>
                          <td className="p-2">{result.responseTime.toFixed(0)}ms</td>
                          <td className="p-2">{(result.dataSize / 1024).toFixed(1)}KB</td>
                          <td className="p-2">
                            {result.pagination ? (
                              <Badge variant="default">
                                Page {result.pagination.page}/{result.pagination.totalPages}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">N/A</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="details">
                <div className="space-y-4" ref={scrollRef}>
                  {results.map((result, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{result.endpoint}</h4>
                          {result.success ? (
                            <Badge variant="default">Success</Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>

                        {result.error && (
                          <Alert className="mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{result.error}</AlertDescription>
                          </Alert>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="font-medium">Response Time</div>
                            <div>{result.responseTime.toFixed(0)}ms</div>
                          </div>
                          <div>
                            <div className="font-medium">Data Size</div>
                            <div>{(result.dataSize / 1024).toFixed(1)}KB</div>
                          </div>
                          <div>
                            <div className="font-medium">Status</div>
                            <div>{result.status}</div>
                          </div>
                          <div>
                            <div className="font-medium">Method</div>
                            <div>{result.method}</div>
                          </div>
                        </div>

                        {result.pagination && (
                          <div className="mt-4 p-3 bg-muted rounded-lg">
                            <h5 className="font-medium mb-2">Pagination Details</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              <div>Page: {result.pagination.page}</div>
                              <div>Page Size: {result.pagination.pageSize}</div>
                              <div>Total Items: {result.pagination.totalItems}</div>
                              <div>Total Pages: {result.pagination.totalPages}</div>
                              <div>Has Next: {result.pagination.hasNext ? 'Yes' : 'No'}</div>
                              <div>Has Prev: {result.pagination.hasPrev ? 'Yes' : 'No'}</div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Loading States */}
      {Object.keys(loadingStates).some(key => loadingStates[key]) && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>
                {loadingStates.pullToRefresh && 'Testing pull-to-refresh...'}
                {loadingStates.infiniteScroll && 'Testing infinite scroll...'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}