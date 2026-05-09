import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  GraduationCap, 
  FileText, 
  Award, 
  Briefcase, 
  Settings,
  Download,
  Share2,
  Edit
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProfileEditor from '@/components/profile/ProfileEditor';
import AcademicTranscript from '@/components/profile/AcademicTranscript';
import DegreeAuditViewer from '@/components/profile/DegreeAuditViewer';
import CourseHistoryList from '@/components/profile/CourseHistoryList';
import AchievementShowcase from '@/components/profile/AchievementShowcase';
import SkillEndorsements from '@/components/profile/SkillEndorsements';
import ResumeGenerator from '@/components/profile/ResumeGenerator';
import type { StudentProfile } from '@/types/student-profile';
import { toast } from "sonner";

const StudentProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  
  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const targetUserId = userId || user?.id;
      const { data: session } = await supabase.auth.getSession();
      
      const response = await legacyApiCall(`/api/profile/${targetUserId}`, {
        headers: {
          'Authorization': `Bearer ${session?.session?.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load profile');
      
      const data = await response.json();
      setProfile(data.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updates: Partial<StudentProfile>) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await legacyApiCall(`/api/profile/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      
      const data = await response.json();
      setProfile(data.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleShareProfile = () => {
    const profileUrl = `${window.location.origin}/profile/${profile?.userId}`;
    navigator.clipboard.writeText(profileUrl);
    // Show toast notification
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The requested profile could not be found.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {profile.avatarUrl ? (
                  <img 
                    src={profile.avatarUrl} 
                    alt={`${profile.firstName} ${profile.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-primary" />
                )}
              </div>
              {isOwnProfile && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <p className="text-muted-foreground mb-2">
                    Student ID: {profile.studentId}
                  </p>
                  {profile.degreeProgram && (
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>{profile.degreeProgram.name}</span>
                      {profile.major && <span>• {profile.major}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      profile.academicStatus === 'active' ? 'default' :
                      profile.academicStatus === 'graduated' ? 'secondary' :
                      'destructive'
                    }>
                      {profile.academicStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {profile.showGPA && (
                      <Badge variant="outline">
                        GPA: {profile.gpa.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShareProfile}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => toast.info("This action is launching with the next release.")}>
                      Connect
                    </Button>
                  )}
                </div>
              </div>

              {profile.bio && (
                <p className="mt-4 text-muted-foreground max-w-2xl">
                  {profile.bio}
                </p>
              )}

              {/* Interests */}
              {profile.interests.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
                    <Badge key={index} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="overview">
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="transcript">
              <FileText className="h-4 w-4 mr-2" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="degree-audit">
              <GraduationCap className="h-4 w-4 mr-2" />
              Degree Audit
            </TabsTrigger>
            <TabsTrigger value="courses">
              <FileText className="h-4 w-4 mr-2" />
              Course History
            </TabsTrigger>
            <TabsTrigger value="achievements">
              <Award className="h-4 w-4 mr-2" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="skills">
              <Briefcase className="h-4 w-4 mr-2" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="resume">
              <Download className="h-4 w-4 mr-2" />
              Resume/CV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Academic Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">GPA</p>
                    <p className="text-2xl font-bold">{profile.gpa.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Enrollment Date</p>
                    <p className="text-lg font-semibold">
                      {new Date(profile.enrollmentDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Graduation</p>
                    <p className="text-lg font-semibold">
                      {profile.expectedGraduationDate 
                        ? new Date(profile.expectedGraduationDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                </div>
              </Card>

              {profile.spiritualGifts.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Spiritual Gifts</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.spiritualGifts.map((gift, index) => (
                      <Badge key={index} variant="outline" className="text-base">
                        {gift}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              {profile.ministryInterests.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Ministry Interests</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.ministryInterests.map((interest, index) => (
                      <Badge key={index} variant="outline" className="text-base">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transcript">
            <AcademicTranscript studentId={profile.userId} />
          </TabsContent>

          <TabsContent value="degree-audit">
            <DegreeAuditViewer studentId={profile.userId} />
          </TabsContent>

          <TabsContent value="courses">
            <CourseHistoryList studentId={profile.userId} />
          </TabsContent>

          <TabsContent value="achievements">
            <AchievementShowcase 
              studentId={profile.userId}
              isOwnProfile={isOwnProfile}
            />
          </TabsContent>

          <TabsContent value="skills">
            <SkillEndorsements 
              studentId={profile.userId}
              isOwnProfile={isOwnProfile}
            />
          </TabsContent>

          <TabsContent value="resume">
            <ResumeGenerator profile={profile} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Profile Editor Modal */}
      {isEditing && (
        <ProfileEditor
          profile={profile}
          onSave={handleProfileUpdate}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
};

export default StudentProfilePage;
