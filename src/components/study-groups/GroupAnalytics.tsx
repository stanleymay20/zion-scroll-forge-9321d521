/**
 * Group Analytics Component
 * Analytics dashboard for study group performance
 */

import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { BarChart3, TrendingUp, Users, FileText, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GroupAnalytics as GroupAnalyticsType } from '@/types/study-group';
import { useToast } from '@/hooks/use-toast';

interface GroupAnalyticsProps {
  groupId: string;
}

export const GroupAnalytics: React.FC<GroupAnalyticsProps> = ({ groupId }) => {
  const [analytics, setAnalytics] = useState<GroupAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [groupId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await legacyApiCall(`/api/study-groups/${groupId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No analytics available</h3>
        <p className="text-muted-foreground mt-2">
          Analytics will be available once the group has more activity
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeMembers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              Total messages sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Collaborative documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.completedAssignments}/{analytics.totalAssignments}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Participation Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Participation Metrics</CardTitle>
          <CardDescription>
            Group engagement and activity levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Average Participation</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(analytics.averageParticipation * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2"
                style={{ width: `${analytics.averageParticipation * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Average Response Time</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(analytics.averageResponseTime)} minutes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Contributors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Contributors</CardTitle>
          <CardDescription>
            Most active members in the group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.topContributors.slice(0, 5).map((contributor, index) => (
              <div key={contributor.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </div>
                  <span className="font-medium">Member {contributor.userId.slice(0, 8)}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {contributor.contributionScore} points
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity by Day */}
      <Card>
        <CardHeader>
          <CardTitle>Activity by Day</CardTitle>
          <CardDescription>
            Group activity throughout the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(analytics.activityByDay).map(([day, count]) => (
              <div key={day} className="flex items-center gap-4">
                <span className="text-sm font-medium w-24">{day}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2"
                    style={{
                      width: `${(count / Math.max(...Object.values(analytics.activityByDay))) * 100}%`
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Trend</CardTitle>
          <CardDescription>
            Group engagement over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {analytics.engagementTrend.map((point, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-primary rounded-t"
                  style={{
                    height: `${(point.score / Math.max(...analytics.engagementTrend.map(p => p.score))) * 100}%`,
                    minHeight: '4px'
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
