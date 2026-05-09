import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileText, 
  Eye,
  Briefcase,
  GraduationCap,
  Award,
  Heart,
  Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile, ResumeData } from '@/types/student-profile';

interface ResumeGeneratorProps {
  profile: StudentProfile;
}

const ResumeGenerator: React.FC<ResumeGeneratorProps> = ({ profile }) => {
  const { user } = useAuth();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [template, setTemplate] = useState<string>('professional');
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');

  useEffect(() => {
    loadResumeData();
  }, [profile.userId]);

  const loadResumeData = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const response = await legacyApiCall(`/api/profile/${profile.userId}/resume-data`, {
        headers: {
          'Authorization': `Bearer ${session?.session?.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load resume data');
      
      const data = await response.json();
      setResumeData(data.data);
    } catch (error) {
      console.error('Error loading resume data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateResume = async () => {
    try {
      setGenerating(true);
      const { data: session } = await supabase.auth.getSession();
      const response = await legacyApiCall(`/api/profile/${profile.userId}/resume/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`
        },
        body: JSON.stringify({
          template,
          format
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate resume');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${profile.firstName}_${profile.lastName}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating resume:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = () => {
    toast.info?.('Resume preview is not yet available.');
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

  if (!resumeData) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Resume Data Not Available</h3>
        <p className="text-muted-foreground">
          Complete your profile to generate a professional resume.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generator Controls */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Resume/CV Generator</h2>
        <p className="text-muted-foreground mb-6">
          Generate a professional resume from your profile data. Choose a template and format, then download or preview.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Template</label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="ministry">Ministry Focus</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={(v: 'pdf' | 'docx') => setFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="docx">Word Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Actions</label>
            <div className="flex gap-2">
              <Button onClick={handlePreview} variant="outline" className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleGenerateResume} disabled={generating} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Download'}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Your resume is automatically generated from your profile data. 
            Update your profile, education, experience, and skills to keep your resume current.
          </p>
        </div>
      </Card>

      {/* Resume Preview */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="ministry">Ministry</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Personal Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{resumeData.personalInfo.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{resumeData.personalInfo.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{resumeData.personalInfo.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{resumeData.personalInfo.location}</p>
              </div>
              {resumeData.personalInfo.linkedIn && (
                <div>
                  <p className="text-sm text-muted-foreground">LinkedIn</p>
                  <p className="font-medium">{resumeData.personalInfo.linkedIn}</p>
                </div>
              )}
              {resumeData.personalInfo.website && (
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <p className="font-medium">{resumeData.personalInfo.website}</p>
                </div>
              )}
            </div>
            
            {resumeData.summary && (
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Professional Summary</h4>
                <p className="text-muted-foreground">{resumeData.summary}</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="education">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Education
            </h3>
            <div className="space-y-6">
              {resumeData.education.map((edu, index) => (
                <div key={index} className="pb-6 border-b last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{edu.degree} in {edu.major}</h4>
                      <p className="text-muted-foreground">{edu.institution}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(edu.startDate).getFullYear()} - {
                          edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'
                        }
                      </p>
                      {edu.gpa && (
                        <Badge variant="secondary">GPA: {edu.gpa.toFixed(2)}</Badge>
                      )}
                    </div>
                  </div>
                  {edu.minor && (
                    <p className="text-sm text-muted-foreground mb-2">Minor in {edu.minor}</p>
                  )}
                  {edu.honors && (
                    <Badge variant="default" className="mb-2">{edu.honors}</Badge>
                  )}
                  {edu.relevantCourses.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Relevant Coursework:</p>
                      <div className="flex flex-wrap gap-2">
                        {edu.relevantCourses.map((course, i) => (
                          <Badge key={i} variant="outline">{course}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="experience">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Professional Experience
            </h3>
            <div className="space-y-6">
              {resumeData.experience.map((exp, index) => (
                <div key={index} className="pb-6 border-b last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{exp.title}</h4>
                      <p className="text-muted-foreground">{exp.organization}</p>
                      <p className="text-sm text-muted-foreground">{exp.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(exp.startDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          year: 'numeric' 
                        })} - {
                          exp.isCurrent ? 'Present' : 
                          new Date(exp.endDate!).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: 'numeric' 
                          })
                        }
                      </p>
                      {exp.isCurrent && (
                        <Badge variant="default" className="mt-1">Current</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3">{exp.description}</p>
                  {exp.achievements.length > 0 && (
                    <ul className="list-disc list-inside space-y-1">
                      {exp.achievements.map((achievement, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Skills & Expertise
            </h3>
            <div className="space-y-6">
              {Object.entries(
                resumeData.skills.reduce((acc, skill) => {
                  if (!acc[skill.category]) acc[skill.category] = [];
                  acc[skill.category].push(skill);
                  return acc;
                }, {} as Record<string, typeof resumeData.skills>)
              ).map(([category, skills]) => (
                <div key={category}>
                  <h4 className="font-semibold mb-3 capitalize">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {skills.map((skill, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{skill.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {skill.proficiency}
                          </p>
                        </div>
                        {skill.endorsements > 0 && (
                          <Badge variant="secondary">
                            {skill.endorsements} endorsements
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ministry">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Ministry Experience
            </h3>
            <div className="space-y-6">
              {resumeData.ministryExperience.map((ministry, index) => (
                <div key={index} className="pb-6 border-b last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-lg">{ministry.role}</h4>
                      <p className="text-muted-foreground">{ministry.ministry}</p>
                      <p className="text-sm text-muted-foreground">{ministry.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(ministry.startDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          year: 'numeric' 
                        })} - {
                          ministry.isCurrent ? 'Present' : 
                          new Date(ministry.endDate!).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: 'numeric' 
                          })
                        }
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3">{ministry.description}</p>
                  {ministry.impact.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Impact & Achievements:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {ministry.impact.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="certifications">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications & Achievements
            </h3>
            
            {/* Certifications */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Certifications</h4>
              <div className="space-y-3">
                {resumeData.certifications.map((cert, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium">{cert.name}</h5>
                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                        {cert.credentialId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {cert.credentialId}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(cert.dateIssued).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                        {cert.expirationDate && (
                          <p className="text-xs text-muted-foreground">
                            Expires: {new Date(cert.expirationDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            {resumeData.achievements.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Notable Achievements</h4>
                <ul className="list-disc list-inside space-y-2">
                  {resumeData.achievements.map((achievement, index) => (
                    <li key={index} className="text-muted-foreground">
                      {achievement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* References */}
      {resumeData.references.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            References
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumeData.references.map((ref, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h4 className="font-semibold">{ref.name}</h4>
                <p className="text-sm text-muted-foreground">{ref.title}</p>
                <p className="text-sm text-muted-foreground">{ref.organization}</p>
                <p className="text-sm text-muted-foreground mt-2">{ref.relationship}</p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-muted-foreground">{ref.email}</p>
                  <p className="text-xs text-muted-foreground">{ref.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ResumeGenerator;
