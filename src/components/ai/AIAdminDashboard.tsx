/**
 * AI Admin Dashboard Component
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Comprehensive dashboard for monitoring AI services
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import {
  Activity,
  DollarSign,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Zap
} from 'lucide-react';

interface ServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  successRate: number;
  totalCost: number;
  avgConfidence: number;
  avgProcessingTime: number;
}

interface ServiceStatus {
  id: string;
  name: string;
  status: 'active' | 'degraded' | 'down';
  requestsToday: number;
  costToday: number;
  avgResponseTime: number;
}

export const AIAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      const [metricsRes, servicesRes] = await Promise.all([
        legacyApiCall('/api/ai-unified/metrics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        legacyApiCall('/api/ai-unified/services', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      const metricsData = await metricsRes.json();
      const servicesData = await servicesRes.json();

      if (metricsData.success) {
        setMetrics(metricsData.data);
      }

      if (servicesData.success) {
        setServices(servicesData.data.services);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Services Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage AI automation services</p>
        </div>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metrics.totalRequests.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-green-600">
                {metrics.successRate.toFixed(1)}% success rate
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${metrics.totalCost.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Avg: ${(metrics.totalCost / metrics.totalRequests).toFixed(4)} per request
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metrics.avgProcessingTime.toFixed(0)}ms
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Target: &lt;3000ms
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Confidence</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {(metrics.avgConfidence * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Target: &gt;85%
            </div>
          </div>
        </div>
      )}

      {/* Service Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Service Status</h2>
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                  {service.status}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-600">ID: {service.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-gray-600">Requests Today</p>
                  <p className="font-semibold text-gray-900">{service.requestsToday || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600">Cost Today</p>
                  <p className="font-semibold text-gray-900">${(service.costToday || 0).toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600">Avg Response</p>
                  <p className="font-semibold text-gray-900">{service.avgResponseTime || 0}ms</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts and Warnings */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          Alerts & Warnings
        </h2>
        <div className="space-y-3">
          {metrics && metrics.avgConfidence < 0.85 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Low Average Confidence</p>
                <p className="text-sm text-yellow-800 mt-1">
                  Average confidence is below 85%. Consider reviewing AI responses and retraining models.
                </p>
              </div>
            </div>
          )}

          {metrics && metrics.avgProcessingTime > 3000 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">High Response Time</p>
                <p className="text-sm text-red-800 mt-1">
                  Average response time exceeds 3 seconds. Check service performance and optimize prompts.
                </p>
              </div>
            </div>
          )}

          {metrics && metrics.successRate < 95 && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900">Low Success Rate</p>
                <p className="text-sm text-orange-800 mt-1">
                  Success rate is below 95%. Investigate error logs and improve error handling.
                </p>
              </div>
            </div>
          )}

          {metrics && metrics.successRate >= 95 && metrics.avgConfidence >= 0.85 && metrics.avgProcessingTime <= 3000 && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">All Systems Operational</p>
                <p className="text-sm text-green-800 mt-1">
                  All AI services are performing within expected parameters. Great work!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Cost Breakdown by Service</h2>
        <div className="space-y-2">
          {services.map((service) => (
            <div key={service.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{service.name}</span>
              <div className="flex items-center gap-4">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${((service.costToday || 0) / (metrics?.totalCost || 1)) * 100}%`
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-20 text-right">
                  ${(service.costToday || 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
