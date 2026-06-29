/**
 * Admin Dashboard Page
 * Main admin interface with system health, user management, and configuration
 */

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Flag,
  Settings,
  FileText,
  Database,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SystemHealthOverview } from '@/components/admin/SystemHealthOverview';
import { UserManagement } from '@/components/admin/UserManagement';
import { CourseApprovalWorkflow } from '@/components/admin/CourseApprovalWorkflow';
import { ContentModerationQueue } from '@/components/admin/ContentModerationQueue';
import { SystemConfiguration } from '@/components/admin/SystemConfiguration';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
import { BackupRestoreInterface } from '@/components/admin/BackupRestoreInterface';
import adminService from '@/services/adminService';
import type { AdminDashboardStats } from '@/types/admin';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [openIntegrityAlerts, setOpenIntegrityAlerts] = useState<{ total: number; critical: number }>({ total: 0, critical: 0 });

  useEffect(() => {
    loadDashboardStats();
    loadIntegrityAlerts();
    const interval = setInterval(() => { loadDashboardStats(); loadIntegrityAlerts(); }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardStats = async () => {
    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrityAlerts = async () => {
    const { data } = await supabase
      .from('academic_integrity_alerts' as any)
      .select('severity, status')
      .eq('status', 'open');
    const rows = (data ?? []) as unknown as Array<{ severity: string }>;
    setOpenIntegrityAlerts({
      total: rows.length,
      critical: rows.filter(r => r.severity === 'critical').length,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <LayoutDashboard className="h-8 w-8" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          System administration and management console
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Activity className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Operations Command Center</CardTitle>
              <CardDescription>
                Incidents, maintenance, jobs, queues, releases, backups, restore drills, runbooks
              </CardDescription>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/ops">Open</Link>
          </Button>
        </CardHeader>
      </Card>

      {openIntegrityAlerts.total > 0 && (
        <Card className={openIntegrityAlerts.critical > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className={`h-6 w-6 ${openIntegrityAlerts.critical > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <div>
                <CardTitle className="text-base">Academic Integrity Alerts</CardTitle>
                <CardDescription>
                  {openIntegrityAlerts.total} open ({openIntegrityAlerts.critical} critical) — review governance drift
                </CardDescription>
              </div>
            </div>
            <Button asChild size="sm" variant={openIntegrityAlerts.critical > 0 ? 'destructive' : 'outline'}>
              <Link to="/admin/integrity-alerts">Review</Link>
            </Button>
          </CardHeader>
        </Card>
      )}

      {/* Quick Stats */}
      {!loading && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.users.active} active, {stats.users.new} new
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.courses.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.courses.pending} pending approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Moderation Queue</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.moderation.pending}</div>
              <p className="text-xs text-muted-foreground">
                {stats.moderation.flagged} flagged items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.system.uptime.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.system.responseTime}ms avg response
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="courses">
            <BookOpen className="h-4 w-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="moderation">
            <Flag className="h-4 w-4 mr-2" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-2" />
            Config
          </TabsTrigger>
          <TabsTrigger value="audit">
            <FileText className="h-4 w-4 mr-2" />
            Audit
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="h-4 w-4 mr-2" />
            Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SystemHealthOverview />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="courses">
          <CourseApprovalWorkflow />
        </TabsContent>

        <TabsContent value="moderation">
          <ContentModerationQueue />
        </TabsContent>

        <TabsContent value="config">
          <SystemConfiguration />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="backup">
          <BackupRestoreInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
