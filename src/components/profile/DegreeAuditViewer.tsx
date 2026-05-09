import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  GraduationCap, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Calendar,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { DegreeAudit, DegreeRequirement } from '@/types/student-profile';

interface DegreeAuditViewerProps {
  studentId: string;
}

const DegreeAuditViewer: React.FC<DegreeAuditViewerProps> = ({ studentId }) => {
  const { user } = useAuth();
  const [audit, setAudit] = useState<DegreeAudit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDegreeAudit();
  }, [studentId]);

  const loadDegreeAudit = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await legacyApiCall(`/api/profile/${studentId}/degree-audit`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load degree audit');
      
      const data = await response.json();
      setAudit(data.data);
    } catch (error) {
      console.error('Error loading degree audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRequirementIcon = (requirement: DegreeRequirement) => {
    if (requirement.isComplete) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    } else if (requirement.progress > 0) {
      return <Circle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      core: 'bg-blue-500',
      major: 'bg-purple-500',
      minor: 'bg-pink-500',
      elective: 'bg-green-500',
      general_education: 'bg-yellow-500',
      spiritual_formation: 'bg-indigo-500',
      capstone: 'bg-red-500',
    };
    return colors[category] || 'bg-gray-500';
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

  if (!audit) {
    return (
      <Card className="p-8 text-center">
        <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Degree Audit Available</h3>
        <p className="text-muted-foreground">
          Your degree audit will be available once you enroll in a degree program.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Degree Audit</h2>
            <p className="text-muted-foreground">
              {audit.degreeProgram.name} • {audit.degreeProgram.type}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Last Updated: {new Date(audit.lastUpdated).toLocaleDateString()}
            </p>
          </div>
          {audit.isEligibleForGraduation && (
            <Badge variant="default" className="text-base px-4 py-2">
              <GraduationCap className="h-4 w-4 mr-2" />
              Eligible for Graduation
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">{audit.overallProgress.toFixed(1)}%</span>
          </div>
          <Progress value={audit.overallProgress} className="h-3" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{audit.creditsCompleted} of {audit.creditsRequired} credits completed</span>
            <span>{audit.creditsRequired - audit.creditsCompleted} credits remaining</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Projected Graduation</span>
            </div>
            <p className="text-lg font-bold">
              {audit.projectedGraduationDate 
                ? new Date(audit.projectedGraduationDate).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })
                : 'Not set'}
            </p>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Remaining Terms</span>
            </div>
            <p className="text-lg font-bold">{audit.remainingTerms} terms</p>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Requirements Complete</span>
            </div>
            <p className="text-lg font-bold">
              {audit.requirements.filter(r => r.isComplete).length} / {audit.requirements.length}
            </p>
          </div>
        </div>
      </Card>

      {/* Outstanding Requirements */}
      {audit.outstandingRequirements.length > 0 && (
        <Card className="p-6 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Outstanding Requirements</h3>
              <ul className="space-y-1">
                {audit.outstandingRequirements.map((req, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    • {req}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Requirements by Category */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Degree Requirements</h3>
        
        <Accordion type="multiple" className="w-full">
          {audit.requirements.map((requirement) => (
            <AccordionItem key={requirement.id} value={requirement.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-1 text-left">
                  {getRequirementIcon(requirement)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{requirement.name}</span>
                      <Badge 
                        variant="outline" 
                        className={`${getCategoryColor(requirement.category)} text-white border-0`}
                      >
                        {requirement.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {requirement.creditsCompleted} / {requirement.creditsRequired} credits
                      </span>
                      <span>•</span>
                      <span>{requirement.progress.toFixed(0)}% complete</span>
                    </div>
                  </div>
                  <div className="w-32">
                    <Progress value={requirement.progress} className="h-2" />
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent>
                <div className="pl-8 pt-4 space-y-4">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground">
                    {requirement.description}
                  </p>

                  {/* Required Courses */}
                  {requirement.requiredCourses.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Required Courses</h4>
                      <div className="space-y-2">
                        {requirement.requiredCourses.map((course, index) => {
                          const isCompleted = requirement.completedCourses.some(
                            c => c.courseId === course.courseId || 
                                 c.courseCode === course.courseCode
                          );
                          
                          return (
                            <div 
                              key={index}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="font-medium">
                                    {course.courseCode && `${course.courseCode}: `}
                                    {course.courseName}
                                  </p>
                                  {course.alternatives && course.alternatives.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      Alternatives available
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                  {course.credits} credits
                                </span>
                                {course.isRequired && (
                                  <Badge variant="outline" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Completed Courses */}
                  {requirement.completedCourses.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Completed Courses</h4>
                      <div className="space-y-2">
                        {requirement.completedCourses.map((course) => (
                          <div 
                            key={course.courseId}
                            className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <div>
                                <p className="font-medium">
                                  {course.courseCode}: {course.courseName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {course.term} {course.year}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant="secondary">{course.grade}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {course.credits} credits
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      {/* Graduation Eligibility */}
      <Card className={`p-6 ${
        audit.isEligibleForGraduation 
          ? 'border-green-500/50 bg-green-500/5' 
          : 'border-muted'
      }`}>
        <div className="flex items-start gap-3">
          {audit.isEligibleForGraduation ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <AlertCircle className="h-6 w-6 text-yellow-500" />
          )}
          <div className="flex-1">
            <h3 className="font-semibold mb-2">
              {audit.isEligibleForGraduation 
                ? 'Congratulations! You are eligible for graduation' 
                : 'Graduation Requirements'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {audit.isEligibleForGraduation 
                ? 'You have completed all requirements for your degree program. Contact your academic advisor to begin the graduation process.'
                : `Complete the outstanding requirements above to become eligible for graduation. You are ${audit.overallProgress.toFixed(1)}% of the way there!`}
            </p>
            {audit.isEligibleForGraduation && (
              <Button className="mt-4">
                Apply for Graduation
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DegreeAuditViewer;
