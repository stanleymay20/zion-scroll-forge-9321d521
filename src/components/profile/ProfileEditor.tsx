import React, { useState, useRef } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { StudentProfile, ProfileUpdateRequest, Address, EmergencyContact } from '@/types/student-profile';

interface ProfileEditorProps {
  profile: StudentProfile;
  onSave: (updates: Partial<StudentProfile>) => Promise<void>;
  onCancel: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave, onCancel }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ProfileUpdateRequest>({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    bio: profile.bio,
    interests: profile.interests,
    spiritualGifts: profile.spiritualGifts,
    ministryInterests: profile.ministryInterests,
    address: profile.address,
    emergencyContact: profile.emergencyContact,
    profileVisibility: profile.profileVisibility,
    showGPA: profile.showGPA,
    showCourseHistory: profile.showCourseHistory,
    showAchievements: profile.showAchievements,
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl || null);
  const [newInterest, setNewInterest] = useState('');
  const [newGift, setNewGift] = useState('');
  const [newMinistryInterest, setNewMinistryInterest] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !formData.interests?.includes(newInterest.trim())) {
      setFormData({
        ...formData,
        interests: [...(formData.interests || []), newInterest.trim()]
      });
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests?.filter(i => i !== interest)
    });
  };

  const handleAddGift = () => {
    if (newGift.trim() && !formData.spiritualGifts?.includes(newGift.trim())) {
      setFormData({
        ...formData,
        spiritualGifts: [...(formData.spiritualGifts || []), newGift.trim()]
      });
      setNewGift('');
    }
  };

  const handleRemoveGift = (gift: string) => {
    setFormData({
      ...formData,
      spiritualGifts: formData.spiritualGifts?.filter(g => g !== gift)
    });
  };

  const handleAddMinistryInterest = () => {
    if (newMinistryInterest.trim() && !formData.ministryInterests?.includes(newMinistryInterest.trim())) {
      setFormData({
        ...formData,
        ministryInterests: [...(formData.ministryInterests || []), newMinistryInterest.trim()]
      });
      setNewMinistryInterest('');
    }
  };

  const handleRemoveMinistryInterest = (interest: string) => {
    setFormData({
      ...formData,
      ministryInterests: formData.ministryInterests?.filter(i => i !== interest)
    });
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      
      // Upload avatar if changed
      let avatarUrl = profile.avatarUrl;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const { data: session } = await supabase.auth.getSession();
        
        const uploadResponse = await legacyApiCall('/api/profile/avatar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.session?.access_token}`
          },
          body: formData
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          avatarUrl = uploadData.data.url;
        }
      }
      
      await onSave({
        ...formData,
        avatarUrl
      });
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="interests">Interests</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Avatar
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
              />
            </div>
          </TabsContent>

          <TabsContent value="interests" className="space-y-6">
            {/* Interests */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Interests</h3>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add an interest..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                />
                <Button type="button" onClick={handleAddInterest}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.interests?.map((interest, index) => (
                  <Badge key={index} variant="secondary">
                    {interest}
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Spiritual Gifts */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Spiritual Gifts</h3>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newGift}
                  onChange={(e) => setNewGift(e.target.value)}
                  placeholder="Add a spiritual gift..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddGift()}
                />
                <Button type="button" onClick={handleAddGift}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.spiritualGifts?.map((gift, index) => (
                  <Badge key={index} variant="secondary">
                    {gift}
                    <button
                      onClick={() => handleRemoveGift(gift)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Ministry Interests */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Ministry Interests</h3>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newMinistryInterest}
                  onChange={(e) => setNewMinistryInterest(e.target.value)}
                  placeholder="Add a ministry interest..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddMinistryInterest()}
                />
                <Button type="button" onClick={handleAddMinistryInterest}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.ministryInterests?.map((interest, index) => (
                  <Badge key={index} variant="secondary">
                    {interest}
                    <button
                      onClick={() => handleRemoveMinistryInterest(interest)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            {/* Address */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Address</h3>
              <div className="space-y-3">
                <Input
                  placeholder="Street Address"
                  value={formData.address?.street || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address!, street: e.target.value }
                  })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={formData.address?.city || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address!, city: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="State"
                    value={formData.address?.state || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address!, state: e.target.value }
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Postal Code"
                    value={formData.address?.postalCode || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address!, postalCode: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Country"
                    value={formData.address?.country || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address!, country: e.target.value }
                    })}
                  />
                </div>
              </div>
            </Card>

            {/* Emergency Contact */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Emergency Contact</h3>
              <div className="space-y-3">
                <Input
                  placeholder="Name"
                  value={formData.emergencyContact?.name || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact!, name: e.target.value }
                  })}
                />
                <Input
                  placeholder="Relationship"
                  value={formData.emergencyContact?.relationship || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact!, relationship: e.target.value }
                  })}
                />
                <Input
                  placeholder="Phone"
                  type="tel"
                  value={formData.emergencyContact?.phone || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact!, phone: e.target.value }
                  })}
                />
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  value={formData.emergencyContact?.email || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact!, email: e.target.value }
                  })}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Privacy Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">
                      Control who can see your profile
                    </p>
                  </div>
                  <Select
                    value={formData.profileVisibility}
                    onValueChange={(value: any) => setFormData({ ...formData, profileVisibility: value })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="connections_only">Connections Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show GPA</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your GPA on your profile
                    </p>
                  </div>
                  <Switch
                    checked={formData.showGPA}
                    onCheckedChange={(checked) => setFormData({ ...formData, showGPA: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Course History</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your course history
                    </p>
                  </div>
                  <Switch
                    checked={formData.showCourseHistory}
                    onCheckedChange={(checked) => setFormData({ ...formData, showCourseHistory: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Achievements</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your achievements and badges
                    </p>
                  </div>
                  <Switch
                    checked={formData.showAchievements}
                    onCheckedChange={(checked) => setFormData({ ...formData, showAchievements: checked })}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditor;
