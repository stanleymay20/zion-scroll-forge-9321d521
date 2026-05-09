import React, { useState, useEffect } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  ThumbsUp, 
  Plus, 
  CheckCircle2,
  Code,
  Heart,
  Users,
  MessageSquare,
  Search as SearchIcon,
  Award
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { SkillEndorsement, Endorsement, SkillCategory, ProficiencyLevel } from '@/types/student-profile';

interface SkillEndorsementsProps {
  studentId: string;
  isOwnProfile: boolean;
}

const SkillEndorsements: React.FC<SkillEndorsementsProps> = ({ 
  studentId, 
  isOwnProfile 
}) => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<SkillEndorsement[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<SkillEndorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showEndorseDialog, setShowEndorseDialog] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillEndorsement | null>(null);
  
  // Add skill form
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('technical');
  const [newSkillProficiency, setNewSkillProficiency] = useState<ProficiencyLevel>('beginner');
  
  // Endorse form
  const [endorsementComment, setEndorsementComment] = useState('');

  useEffect(() => {
    loadSkills();
  }, [studentId]);

  useEffect(() => {
    filterSkills();
  }, [skills, searchTerm, categoryFilter]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const response = await legacyApiCall(`/api/profile/${studentId}/skills`, {
        headers: {
          'Authorization': `Bearer ${session?.session?.access_token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load skills');
      
      const data = await response.json();
      setSkills(data.data);
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSkills = () => {
    let filtered = [...skills];

    if (searchTerm) {
      filtered = filtered.filter(skill =>
        skill.skillName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(skill => skill.category === categoryFilter);
    }

    // Sort by endorsement count
    filtered.sort((a, b) => b.endorsementCount - a.endorsementCount);

    setFilteredSkills(filtered);
  };

  const handleAddSkill = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await legacyApiCall(`/api/profile/${studentId}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`
        },
        body: JSON.stringify({
          skillName: newSkillName,
          category: newSkillCategory,
          proficiencyLevel: newSkillProficiency
        })
      });
      
      if (!response.ok) throw new Error('Failed to add skill');
      
      const data = await response.json();
      setSkills([...skills, data.data]);
      setShowAddSkill(false);
      setNewSkillName('');
    } catch (error) {
      console.error('Error adding skill:', error);
    }
  };

  const handleEndorseSkill = async () => {
    if (!selectedSkill) return;
    
    try {
      const response = await fetch(
        `/api/profile/${studentId}/skills/${selectedSkill.id}/endorse`,
        {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
          body: JSON.stringify({
            comment: endorsementComment
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to endorse skill');
      
      const data = await response.json();
      setSkills(skills.map(s => s.id === selectedSkill.id ? data.data : s));
      setShowEndorseDialog(false);
      setSelectedSkill(null);
      setEndorsementComment('');
    } catch (error) {
      console.error('Error endorsing skill:', error);
    }
  };

  const getCategoryIcon = (category: SkillCategory) => {
    const icons: Record<SkillCategory, React.ReactNode> = {
      technical: <Code className="h-4 w-4" />,
      ministry: <Heart className="h-4 w-4" />,
      leadership: <Users className="h-4 w-4" />,
      communication: <MessageSquare className="h-4 w-4" />,
      research: <SearchIcon className="h-4 w-4" />,
      creative: <Award className="h-4 w-4" />,
    };
    return icons[category];
  };

  const getProficiencyColor = (level: ProficiencyLevel) => {
    const colors: Record<ProficiencyLevel, string> = {
      beginner: 'bg-yellow-500',
      intermediate: 'bg-blue-500',
      advanced: 'bg-purple-500',
      expert: 'bg-green-500',
    };
    return colors[level];
  };

  const getProficiencyPercentage = (level: ProficiencyLevel) => {
    const percentages: Record<ProficiencyLevel, number> = {
      beginner: 25,
      intermediate: 50,
      advanced: 75,
      expert: 100,
    };
    return percentages[level];
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

  const stats = {
    total: skills.length,
    endorsed: skills.filter(s => s.endorsementCount > 0).length,
    verified: skills.filter(s => s.isVerified).length,
    expert: skills.filter(s => s.proficiencyLevel === 'expert').length,
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Skills</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Endorsed</p>
          <p className="text-2xl font-bold">{stats.endorsed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Verified</p>
          <p className="text-2xl font-bold">{stats.verified}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Expert Level</p>
          <p className="text-2xl font-bold">{stats.expert}</p>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="ministry">Ministry</SelectItem>
              <SelectItem value="leadership">Leadership</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
            </SelectContent>
          </Select>
          
          {isOwnProfile && (
            <Button onClick={() => setShowAddSkill(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Skill
            </Button>
          )}
        </div>
      </Card>

      {/* Skills List */}
      <div className="space-y-4">
        {filteredSkills.map((skill) => (
          <Card key={skill.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{skill.skillName}</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getCategoryIcon(skill.category)}
                    {skill.category}
                  </Badge>
                  {skill.isVerified && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                {/* Proficiency */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Proficiency</span>
                    <Badge className={`${getProficiencyColor(skill.proficiencyLevel)} text-white border-0`}>
                      {skill.proficiencyLevel}
                    </Badge>
                  </div>
                  <Progress value={getProficiencyPercentage(skill.proficiencyLevel)} className="h-2" />
                </div>

                {/* Endorsements */}
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {skill.endorsementCount} {skill.endorsementCount === 1 ? 'endorsement' : 'endorsements'}
                  </span>
                  {skill.verificationSource && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        Verified by {skill.verificationSource}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {!isOwnProfile && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSkill(skill);
                    setShowEndorseDialog(true);
                  }}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Endorse
                </Button>
              )}
            </div>

            {/* Recent Endorsements */}
            {skill.endorsements.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3">Recent Endorsements</h4>
                <div className="space-y-2">
                  {skill.endorsements.slice(0, 3).map((endorsement) => (
                    <div key={endorsement.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{endorsement.endorserName}</span>
                          <span className="text-xs text-muted-foreground">
                            {endorsement.endorserRole}
                          </span>
                        </div>
                        {endorsement.comment && (
                          <p className="text-sm text-muted-foreground">{endorsement.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(endorsement.dateEndorsed).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {skill.endorsements.length > 3 && (
                    <Button variant="ghost" size="sm" className="w-full">
                      View all {skill.endorsements.length} endorsements
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <Card className="p-8 text-center">
          <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Skills Found</h3>
          <p className="text-muted-foreground mb-4">
            {isOwnProfile 
              ? 'Add your skills to showcase your expertise.'
              : 'This user has not added any skills yet.'}
          </p>
          {isOwnProfile && (
            <Button onClick={() => setShowAddSkill(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Skill
            </Button>
          )}
        </Card>
      )}

      {/* Add Skill Dialog */}
      <Dialog open={showAddSkill} onOpenChange={setShowAddSkill}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Skill</DialogTitle>
            <DialogDescription>
              Add a skill to your profile and set your proficiency level.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Skill Name</label>
              <Input
                placeholder="e.g., Biblical Hebrew, Web Development"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={newSkillCategory} onValueChange={(v: SkillCategory) => setNewSkillCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="ministry">Ministry</SelectItem>
                  <SelectItem value="leadership">Leadership</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Proficiency Level</label>
              <Select value={newSkillProficiency} onValueChange={(v: ProficiencyLevel) => setNewSkillProficiency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSkill(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSkill} disabled={!newSkillName.trim()}>
              Add Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Endorse Skill Dialog */}
      <Dialog open={showEndorseDialog} onOpenChange={setShowEndorseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Endorse {selectedSkill?.skillName}</DialogTitle>
            <DialogDescription>
              Add your endorsement to validate this skill.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Comment (Optional)</label>
              <Textarea
                placeholder="Share your experience working with this person..."
                value={endorsementComment}
                onChange={(e) => setEndorsementComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndorseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEndorseSkill}>
              <ThumbsUp className="h-4 w-4 mr-2" />
              Endorse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SkillEndorsements;
