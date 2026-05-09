import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, BookOpen, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { CourseHistoryEntry } from '@/types/student-profile';

interface CourseHistoryListProps {
  studentId: string;
}

const CourseHistoryList: React.FC<CourseHistoryListProps> = ({ studentId }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseHistoryEntry[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');

  useEffect(() => {
    loadCourseHistory();
  }, [studentId]);

  useEffect(() => {
    filterAndSortCourses();
  }, [courses, searchTerm, statusFilter, sortBy]);

  const loadCourseHistory = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const response = await legacyApiCall(`/api/profile/${studentId}/course-history`, {
        headers: {
          'Authorization': `Bearer ${session?.session?.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load course history');
      
      const data = await response.json();
      setCourses(data.data);
    } catch (error) {
      console.error('Error loading course history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCourses = () => {
    let filtered = [...courses];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(course => course.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.year - a.year || b.term.localeCompare(a.term);
        case 'oldest':
          return a.year - b.year || a.term.localeCompare(b.term);
        case 'grade':
          return b.gradePoints - a.gradePoints;
        case 'name':
          return a.courseName.localeCompare(b.courseName);
        default:
          return 0;
      }
    });

    setFilteredCourses(filtered);
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A' || grade === 'A+') return 'bg-green-500';
    if (grade === 'B' || grade === 'B+' || grade === 'B-') return 'bg-blue-500';
    if (grade === 'C' || grade === 'C+' || grade === 'C-') return 'bg-yellow-500';
    if (grade === 'D' || grade === 'D+' || grade === 'D-') return 'bg-orange-500';
    if (grade === 'F') return 'bg-red-500';
    return 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (courses.length === 0) {
    return (
      <Card className="p-8 text-center">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Course History</h3>
        <p className="text-muted-foreground">
          Your course history will appear here once you enroll in courses.
        </p>
      </Card>
    );
  }

  const stats = {
    totalCourses: courses.length,
    completed: courses.filter(c => c.status === 'completed').length,
    inProgress: courses.filter(c => c.status === 'in_progress').length,
    averageGrade: courses.reduce((sum, c) => sum + c.gradePoints, 0) / courses.length,
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Courses</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalCourses}</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold">{stats.completed}</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">In Progress</span>
          </div>
          <p className="text-2xl font-bold">{stats.inProgress}</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Average Grade</span>
          </div>
          <p className="text-2xl font-bold">{stats.averageGrade.toFixed(2)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="grade">Highest Grade</SelectItem>
              <SelectItem value="name">Course Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Course List */}
      <div className="space-y-4">
        {filteredCourses.map((course) => (
          <Card key={course.courseId} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{course.courseName}</h3>
                  <Badge variant="outline">{course.courseCode}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Instructor: {course.instructor}
                </p>
                <p className="text-sm text-muted-foreground">
                  {course.term} {course.year} • {course.credits} credits
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <Badge className={`${getGradeColor(course.grade)} text-white border-0 text-lg px-3 py-1`}>
                  {course.grade}
                </Badge>
                <Badge variant={
                  course.status === 'completed' ? 'default' :
                  course.status === 'in_progress' ? 'secondary' :
                  'outline'
                }>
                  {course.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Attendance</p>
                <p className="text-sm font-semibold">{course.attendanceRate.toFixed(0)}%</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assignments</p>
                <p className="text-sm font-semibold">
                  {course.assignmentsCompleted} / {course.totalAssignments}
                </p>
              </div>
              
              {course.spiritualGrowthScore !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Spiritual Growth</p>
                  <p className="text-sm font-semibold">{course.spiritualGrowthScore.toFixed(0)}%</p>
                </div>
              )}
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Grade Points</p>
                <p className="text-sm font-semibold">{course.gradePoints.toFixed(2)}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
              <span>Enrolled: {new Date(course.enrollmentDate).toLocaleDateString()}</span>
              {course.completionDate && (
                <>
                  <span>•</span>
                  <span>Completed: {new Date(course.completionDate).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No courses match your search criteria.
          </p>
        </Card>
      )}
    </div>
  );
};

export default CourseHistoryList;
