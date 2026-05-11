/**
 * AI Monitoring Dashboard Component
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Comprehensive monitoring dashboard for all AI services including:
 * - Service health status
 * - Cost tracking and alerts
 * - Quality metrics
 * - Performance trends
 * - Review queue management
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceHealth>;
  timestamp: Date;
}

interface ServiceHealth {
  status: 'operational' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
}

interface CostAlert {
  type: 'budget_warning' | 'budget_exceeded' | 'unusual_spike';
  service: string;
  currentCost: number;
  threshold: number;
  message: string;
}

interface QualityAlert {
  type: 'low_confidence' | 'high_error_rate' | 'slow_response';
  service: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

interface DashboardMetrics {
  overall: {
    totalRequests: number;
    successRate: number;
    avgConfidence: number;
    avgProcessingTime: number;
    totalCost: number;
  };
  health: HealthStatus;
  alerts: {
    cost: CostAlert[];
    quality: QualityAlert[];
  };
  pendingReviews: number;
  timestamp: Date;
}

export const AIMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async (): Promise<void> => {
    try {
      const response = await legacyApiCall('/api/ai-monitoring/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'unhealthy':
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
      case 'down':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Services Monitoring</h1>
          <p className="text-gray-600">Real-time monitoring and alerting for all AI services</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Disable' : 'Enable'} Auto-Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(metrics.health.status)}
              <span className={`text-2xl font-bold ${getStatusColor(metrics.health.status)}`}>
                {metrics.health.status.toUpperCase()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overall.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overall.successRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-600">Target: 95%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overall.avgProcessingTime.toFixed(0)}ms</div>
            <p className="text-xs text-gray-600">Target: &lt;3000ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.overall.totalCost.toFixed(2)}</div>
            <p className="text-xs text-gray-600">Budget: $263/day</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(metrics.alerts.cost.length > 0 || metrics.alerts.quality.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Active Alerts</h2>
          
          {metrics.alerts.cost.map((alert, index) => (
            <Alert key={`cost-${index}`} variant={alert.type === 'budget_exceeded' ? 'destructive' : 'default'}>
              <DollarSign className="h-4 w-4" />
              <AlertTitle>{alert.type.replace('_', ' ').toUpperCase()}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}

          {metrics.alerts.quality.map((alert, index) => (
            <Alert key={`quality-${index}`} variant="default">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.type.replace('_', ' ').toUpperCase()}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Service Health Details */}
      <Tabs defaultValue="services" className="w-full">
        <TabsList>
          <TabsTrigger value="services">Service Health</TabsTrigger>
          <TabsTrigger value="reviews">Review Queue ({metrics.pendingReviews})</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metrics.health.services).map(([serviceName, health]) => (
              <Card key={serviceName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{serviceName}</CardTitle>
                    {getStatusIcon(health.status)}
                  </div>
                  <CardDescription className={getStatusColor(health.status)}>
                    {health.status.toUpperCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Response Time:</span>
                    <span className="font-medium">{health.responseTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Error Rate:</span>
                    <span className="font-medium">{(health.errorRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Check:</span>
                    <span className="font-medium">
                      {new Date(health.lastCheck).toLocaleTimeString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Pending Human Reviews</CardTitle>
              <CardDescription>
                Items requiring human review and approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold">{metrics.pendingReviews}</p>
                  <p className="text-sm text-gray-600">items pending review</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>
                Historical performance data and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">No trend data captured for the selected window yet.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600">
        Last updated: {new Date(metrics.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default AIMonitoringDashboard;
