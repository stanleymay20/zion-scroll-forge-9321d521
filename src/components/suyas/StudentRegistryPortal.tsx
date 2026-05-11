/**
 * SUYAS - Student Registry Portal
 * Student lifecycle, holds, calendar, deadlines, transcript requests
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  GraduationCap,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
  Download,
  Search,
  BookOpen,
  TrendingUp
} from "lucide-react";
import { format, parseISO, differenceInDays, isBefore, isAfter } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

console.info("✝️ SUYAS Student Registry — Shepherding the student journey");

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  created_at: string;
  course?: {
    title: string;
    faculty?: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  due_at: string;
  course_id: string;
  total_points: number;
  course?: {
    title: string;
  };
}

interface Deadline {
  id: string;
  title: string;
  date: string;
  type: 'assignment' | 'exam' | 'registration' | 'payment';
  course?: string;
  urgent: boolean;
}

// Fetch student enrollments
const useStudentEnrollments = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['student-enrollments', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(title, faculty)
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as Enrollment[];
    },
    enabled: !!userId
  });
};

// Fetch upcoming assignments/deadlines
const useUpcomingDeadlines = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['upcoming-deadlines', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get assignments
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          id, title, due_at, total_points,
          course:courses(title)
        `)
        .gte('due_at', new Date().toISOString())
        .order('due_at', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      
      // Transform to deadlines
      const deadlines: Deadline[] = (assignments || []).map(a => {
        const dueDate = new Date(a.due_at);
        const daysUntil = differenceInDays(dueDate, new Date());
        
        return {
          id: a.id,
          title: a.title || 'Untitled Assignment',
          date: a.due_at,
          type: 'assignment' as const,
          course: a.course?.title,
          urgent: daysUntil <= 3
        };
      });
      
      return deadlines;
    },
    enabled: !!userId
  });
};

// Calculate student stats
const useStudentStats = (enrollments: Enrollment[] | undefined) => {
  const totalCourses = enrollments?.length || 0;
  const completedCourses = enrollments?.filter(e => e.progress >= 100).length || 0;
  const avgProgress = enrollments?.length 
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length)
    : 0;
  
  return {
    totalCourses,
    completedCourses,
    avgProgress,
    inProgress: totalCourses - completedCourses
  };
};

export default function StudentRegistryPortal() {
  const { user } = useAuth();
  const { data: enrollments, isLoading: enrollmentsLoading } = useStudentEnrollments(user?.id);
  const { data: deadlines, isLoading: deadlinesLoading } = useUpcomingDeadlines(user?.id);
  
  const stats = useStudentStats(enrollments);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEnrollments = enrollments?.filter(e => 
    e.course?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = enrollmentsLoading || deadlinesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Student Portal
        </h2>
        <p className="text-muted-foreground">
          Manage your academic journey, deadlines, and records
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalCourses}</p>
                <p className="text-sm text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completedCourses}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>

        {/* My Courses */}
        <TabsContent value="courses" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Enrolled Courses</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEnrollments && filteredEnrollments.length > 0 ? (
                <div className="space-y-4">
                  {filteredEnrollments.map((enrollment) => (
                    <div 
                      key={enrollment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{enrollment.course?.title || 'Untitled Course'}</p>
                        <p className="text-sm text-muted-foreground">
                          {enrollment.course?.faculty || 'General Studies'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{Math.round(enrollment.progress || 0)}%</p>
                          <Progress value={enrollment.progress || 0} className="w-24 h-2" />
                        </div>
                        {enrollment.progress >= 100 ? (
                          <Badge className="bg-green-500">Completed</Badge>
                        ) : (
                          <Badge variant="outline">In Progress</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No courses found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadlines */}
        <TabsContent value="deadlines" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
              <CardDescription>
                Assignments, exams, and important dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deadlines && deadlines.length > 0 ? (
                <div className="space-y-3">
                  {deadlines.map((deadline) => (
                    <div 
                      key={deadline.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        deadline.urgent ? 'border-destructive/50 bg-destructive/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {deadline.urgent && (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                        <div>
                          <p className="font-medium">{deadline.title}</p>
                          <p className="text-sm text-muted-foreground">{deadline.course}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(parseISO(deadline.date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {differenceInDays(parseISO(deadline.date), new Date())} days left
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                  <p>No upcoming deadlines</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar */}
        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Academic Calendar
              </CardTitle>
              <CardDescription>
                View your schedule and important dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No scheduled events for the current term.</p>
                <p className="text-sm mt-2">Export your schedule to Google Calendar or iCal once items are published.</p>
                <Button variant="outline" className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Export .ics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Records */}
        <TabsContent value="records" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Transcript Request
                </CardTitle>
                <CardDescription>
                  Request official academic transcripts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Official transcripts are processed within 5 business days. 
                  Digital and physical copies are available.
                </p>
                <div className="flex gap-3">
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Request Transcript
                  </Button>
                  <Button variant="outline">View History</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Degree Progress
                </CardTitle>
                <CardDescription>
                  Track your progress toward graduation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Credits Completed</span>
                    <span className="font-medium">24 / 120</span>
                  </div>
                  <Progress value={20} className="h-3" />
                </div>
                <Button variant="outline" className="w-full">
                  View Degree Audit
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
