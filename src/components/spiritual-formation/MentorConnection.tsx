/**
 * Mentor Connection Component
 * Spiritual mentor matching and connection interface
 * Requirements: 7.5
 */

import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Users, MessageCircle, Star, CheckCircle2, Clock } from 'lucide-react';

interface SpiritualMentor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  specialties: string[];
  bio: string;
  availability: string;
  matchScore: number;
  yearsExperience: number;
  studentsHelped: number;
}

interface MentorConnection {
  id: string;
  mentorId: string;
  mentor: SpiritualMentor;
  status: 'pending' | 'active' | 'completed';
  startedAt: Date;
  lastContact?: Date;
  sessionsCompleted: number;
}

interface MentorConnectionProps {
  userId: string;
}

export function MentorConnection({ userId }: MentorConnectionProps): JSX.Element {
  const [mentors, setMentors] = useState<SpiritualMentor[]>([]);
  const [connections, setConnections] = useState<MentorConnection[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMentor, setSelectedMentor] = useState<SpiritualMentor | null>(null);

  useEffect(() => {
    loadMentors();
    loadConnections();
  }, [userId]);

  const profileToMentor = (p: any): SpiritualMentor => {
    const sp = (p?.spiritual_profile ?? {}) as Record<string, unknown>;
    const ap = (p?.academic_profile ?? {}) as Record<string, unknown>;
    const fullName = (p?.full_name as string) || (p?.email as string) || 'Mentor';
    const [firstName, ...rest] = fullName.split(' ');
    return {
      id: p.id,
      firstName: firstName || 'Mentor',
      lastName: rest.join(' ') || '',
      avatarUrl: p?.avatar_url ?? undefined,
      specialties: Array.isArray(sp.specialties) ? (sp.specialties as string[]) : ['Spiritual Formation'],
      bio: (sp.bio as string) ?? (ap.bio as string) ?? 'Faculty mentor available to guide your spiritual journey.',
      availability: (sp.availability as string) ?? 'By appointment',
      matchScore: 85,
      yearsExperience: (ap.years_experience as number) ?? 5,
      studentsHelped: (sp.students_helped as number) ?? 0,
    };
  };

  const loadMentors = async (): Promise<void> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, role, spiritual_profile, academic_profile')
        .in('role', ['faculty', 'admin', 'superadmin'])
        .neq('id', userId)
        .limit(20);
      if (error) throw error;
      setMentors((data ?? []).map(profileToMentor));
    } catch (error) {
      console.error('Error loading mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async (): Promise<void> => {
    try {
      const { data: rels, error: relErr } = await supabase
        .from('mentorship_relationships')
        .select('id, mentor_id, status, start_date, total_sessions, updated_at')
        .eq('mentee_id', userId);
      if (relErr) throw relErr;

      const { data: reqs, error: reqErr } = await supabase
        .from('mentorship_requests')
        .select('id, mentor_id, status, created_at')
        .eq('student_id', userId)
        .eq('status', 'pending');
      if (reqErr) throw reqErr;

      const mentorIds = Array.from(
        new Set([...(rels ?? []).map(r => r.mentor_id), ...(reqs ?? []).map(r => r.mentor_id)].filter(Boolean) as string[])
      );

      const profilesById: Record<string, SpiritualMentor> = {};
      if (mentorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url, spiritual_profile, academic_profile')
          .in('id', mentorIds);
        (profs ?? []).forEach(p => { profilesById[p.id] = profileToMentor(p); });
      }

      const fromRels: MentorConnection[] = (rels ?? []).map(r => ({
        id: r.id,
        mentorId: r.mentor_id,
        mentor: profilesById[r.mentor_id] ?? profileToMentor({ id: r.mentor_id }),
        status: (r.status === 'active' ? 'active' : r.status === 'completed' ? 'completed' : 'pending'),
        startedAt: new Date(r.start_date ?? r.updated_at ?? Date.now()),
        lastContact: r.updated_at ? new Date(r.updated_at) : undefined,
        sessionsCompleted: r.total_sessions ?? 0,
      }));

      const fromReqs: MentorConnection[] = (reqs ?? []).map(r => ({
        id: r.id,
        mentorId: r.mentor_id as string,
        mentor: profilesById[r.mentor_id as string] ?? profileToMentor({ id: r.mentor_id }),
        status: 'pending',
        startedAt: new Date(r.created_at ?? Date.now()),
        sessionsCompleted: 0,
      }));

      setConnections([...fromRels, ...fromReqs]);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const handleConnect = async (mentorId: string): Promise<void> => {
    try {
      setLoading(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_institution_id')
        .eq('id', userId)
        .maybeSingle();
      const institutionId = profile?.current_institution_id;
      if (!institutionId) {
        toast.error('Please join an institution before requesting a mentor');
        return;
      }
      const { error } = await supabase.from('mentorship_requests').insert({
        student_id: userId,
        mentor_id: mentorId,
        institution_id: institutionId,
        status: 'pending',
        message: 'Requesting spiritual mentorship',
      });
      if (error) throw error;
      toast.success('Mentor request sent');
      await loadConnections();
      setSelectedMentor(null);
    } catch (error) {
      console.error('Error connecting with mentor:', error);
      toast.error('Failed to send mentor request');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (mentorId: string): void => {
    // Navigate to messaging interface
    window.location.href = `/messages?mentor=${mentorId}`;
  };

  const activeConnections = connections.filter(c => c.status === 'active');
  const pendingConnections = connections.filter(c => c.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Spiritual Mentorship</CardTitle>
          <CardDescription>
            Connect with experienced mentors to guide your spiritual journey
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="recommended">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommended">
            Recommended ({mentors.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeConnections.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingConnections.length})
          </TabsTrigger>
        </TabsList>

        {/* Recommended Mentors */}
        <TabsContent value="recommended" className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading mentors...</p>
          ) : mentors.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Complete a prophetic check-in to receive mentor recommendations
                </p>
              </CardContent>
            </Card>
          ) : (
            mentors.map((mentor) => (
              <Card key={mentor.id}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={mentor.avatarUrl} />
                      <AvatarFallback>
                        {mentor.firstName[0]}{mentor.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            {mentor.firstName} {mentor.lastName}
                          </CardTitle>
                          <CardDescription>
                            {mentor.yearsExperience} years experience • 
                            {mentor.studentsHelped} students helped
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{mentor.matchScore}%</span>
                          <span className="text-xs text-muted-foreground">match</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {mentor.specialties.map((specialty) => (
                          <Badge key={specialty} variant="secondary">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{mentor.bio}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Clock className="h-4 w-4" />
                    <span>Available: {mentor.availability}</span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => setSelectedMentor(mentor)}
                        className="w-full"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Request Connection
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Connect with {mentor.firstName}?</DialogTitle>
                        <DialogDescription>
                          Send a connection request to start your mentorship journey
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-primary/5 p-4 rounded-lg">
                          <p className="text-sm">
                            <strong>Match Score:</strong> {mentor.matchScore}%
                          </p>
                          <p className="text-sm mt-2">
                            <strong>Specialties:</strong> {mentor.specialties.join(', ')}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Your mentor will receive your request and can accept to begin the mentorship.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedMentor(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleConnect(mentor.id)}
                            disabled={loading}
                            className="flex-1"
                          >
                            {loading ? 'Sending...' : 'Send Request'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Active Connections */}
        <TabsContent value="active" className="space-y-4">
          {activeConnections.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No active mentor connections yet
                </p>
              </CardContent>
            </Card>
          ) : (
            activeConnections.map((connection) => (
              <Card key={connection.id}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={connection.mentor.avatarUrl} />
                      <AvatarFallback>
                        {connection.mentor.firstName[0]}{connection.mentor.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            {connection.mentor.firstName} {connection.mentor.lastName}
                          </CardTitle>
                          <CardDescription>
                            Connected since {new Date(connection.startedAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {connection.mentor.specialties.map((specialty) => (
                          <Badge key={specialty} variant="secondary">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-primary/5 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Sessions</p>
                      <p className="text-2xl font-bold">{connection.sessionsCompleted}</p>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Last Contact</p>
                      <p className="text-sm font-semibold">
                        {connection.lastContact
                          ? new Date(connection.lastContact).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleMessage(connection.mentorId)}
                    className="w-full"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Pending Connections */}
        <TabsContent value="pending" className="space-y-4">
          {pendingConnections.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No pending connection requests
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingConnections.map((connection) => (
              <Card key={connection.id}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={connection.mentor.avatarUrl} />
                      <AvatarFallback>
                        {connection.mentor.firstName[0]}{connection.mentor.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            {connection.mentor.firstName} {connection.mentor.lastName}
                          </CardTitle>
                          <CardDescription>
                            Request sent {new Date(connection.startedAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Waiting for mentor to accept your connection request
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
