import { useState, useRef } from "react";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, CheckCircle, BookOpen, Flame, Mic, MicOff } from "lucide-react";
import { usePrayerJournal, useCreatePrayerEntry, useUpdatePrayerEntry, useDeletePrayerEntry, useMarkPrayerAnswered, usePrayerStreak } from "@/hooks/usePrayerJournal";
import { format, formatDistanceToNow } from "date-fns";
import { VoiceClient } from "@/lib/voiceClient";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

console.info("✝️ Prayer Journal — Christ hears every prayer");

export default function PrayerJournal() {
  const { data: entries, isLoading } = usePrayerJournal();
  const { data: streak } = usePrayerStreak();
  const createEntry = useCreatePrayerEntry();
  const updateEntry = useUpdatePrayerEntry();
  const deleteEntry = useDeletePrayerEntry();
  const markAnswered = useMarkPrayerAnswered();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const voiceClientRef = useRef<VoiceClient | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    prayer_type: "general" as any,
    is_private: true,
    tags: [] as string[],
    scripture_references: [] as string[]
  });

  const handleVoiceToggle = async () => {
    if (isRecording) {
      // Stop recording and transcribe
      if (voiceClientRef.current) {
        setIsProcessingVoice(true);
        try {
          const audioBlob = await voiceClientRef.current.stopRecording();
          const audioBase64 = await voiceClientRef.current.blobToBase64(audioBlob);

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          // Send to edge function
          const { data, error } = await supabase.functions.invoke('prayer-voice-to-text', {
            body: { audio_base64: audioBase64, user_id: user.id }
          });

          if (error) throw error;

          // Autofill transcript
          setFormData(prev => ({
            ...prev,
            content: data.transcript
          }));

          toast({
            title: 'Voice prayer recorded',
            description: 'Your prayer has been transcribed',
          });
        } catch (error) {
          console.error('Voice processing error:', error);
          toast({
            title: 'Voice error',
            description: 'Failed to process voice prayer',
            variant: 'destructive',
          });
        } finally {
          setIsProcessingVoice(false);
          setIsRecording(false);
        }
      }
    } else {
      // Start recording
      try {
        if (!voiceClientRef.current) {
          voiceClientRef.current = new VoiceClient((status) => {
            setIsRecording(status === 'recording');
          });
        }
        await voiceClientRef.current.startRecording();
        setIsRecording(true);
      } catch (error) {
        console.error('Recording start error:', error);
        toast({
          title: 'Microphone access denied',
          description: 'Please allow microphone access to use voice mode',
          variant: 'destructive',
        });
      }
    }
  };

  const handleCreate = async () => {
    await createEntry.mutateAsync(formData);
    setIsCreateOpen(false);
    setFormData({
      title: "",
      content: "",
      prayer_type: "general",
      is_private: true,
      tags: [],
      scripture_references: []
    });
  };

  const handleUpdate = async () => {
    if (!editingEntry) return;
    await updateEntry.mutateAsync({
      id: editingEntry.id,
      updates: formData
    });
    setIsEditOpen(false);
    setEditingEntry(null);
  };

  const handleMarkAnswered = async (id: string) => {
    const notes = prompt("How was this prayer answered?");
    if (notes) {
      await markAnswered.mutateAsync({ id, answerNotes: notes });
    }
  };

  const openEdit = (entry: any) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      prayer_type: entry.prayer_type,
      is_private: entry.is_private,
      tags: entry.tags || [],
      scripture_references: entry.scripture_references || []
    });
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const groupedEntries = entries?.reduce((acc: any, entry: any) => {
    const month = format(new Date(entry.created_at), "MMMM yyyy");
    if (!acc[month]) acc[month] = [];
    acc[month].push(entry);
    return acc;
  }, {});

  return (
    <PageTemplate 
      title="Prayer Journal" 
      description="Record your prayers and celebrate God's faithfulness"
      actions={
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[hsl(var(--scroll-gold))]" />
            {streak || 0} Day Streak
          </Badge>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Prayer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record a New Prayer</DialogTitle>
                <DialogDescription>
                  Share your heart with God and track His faithfulness
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Prayer Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleVoiceToggle}
                      disabled={isProcessingVoice}
                      className={isRecording ? 'bg-red-500 text-white' : ''}
                    >
                      {isProcessingVoice ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : isRecording ? (
                        <MicOff className="h-4 w-4 mr-2" />
                      ) : (
                        <Mic className="h-4 w-4 mr-2" />
                      )}
                      {isRecording ? 'Stop Recording' : 'Record Voice Prayer'}
                    </Button>
                    {isProcessingVoice && <span className="text-sm text-muted-foreground">Processing...</span>}
                  </div>
                  <Textarea
                    placeholder="Your prayer..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                  />
                </div>
                <Select
                  value={formData.prayer_type}
                  onValueChange={(value) => setFormData({ ...formData, prayer_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="intercession">Intercession</SelectItem>
                    <SelectItem value="thanksgiving">Thanksgiving</SelectItem>
                    <SelectItem value="confession">Confession</SelectItem>
                    <SelectItem value="petition">Petition</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreate} disabled={createEntry.isPending} className="w-full">
                  {createEntry.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Prayer"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {!entries || entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No prayer entries yet</p>
            <p className="text-sm text-muted-foreground mt-2">Start your prayer journal today</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEntries || {}).map(([month, monthEntries]: [string, any]) => (
            <div key={month}>
              <h2 className="text-xl font-semibold mb-4 text-foreground">{month}</h2>
              <div className="space-y-4">
                {monthEntries.map((entry: any) => (
                  <Card key={entry.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {entry.title}
                            {entry.status === "answered" && (
                              <Badge variant="default" className="ml-2">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Answered
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <Badge variant="outline" className="mr-2 capitalize">
                              {entry.prayer_type}
                            </Badge>
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.status !== "answered" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAnswered(entry.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm("Delete this prayer entry?")) {
                                deleteEntry.mutate(entry.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                      {entry.answer_notes && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <p className="text-sm font-semibold text-[hsl(var(--scroll-gold))]">
                            Answer Notes:
                          </p>
                          <p className="text-sm mt-1">{entry.answer_notes}</p>
                          {entry.answered_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Answered {format(new Date(entry.answered_at), "PPP")}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Prayer Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Prayer Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Textarea
              placeholder="Your prayer..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
            />
            <Select
              value={formData.prayer_type}
              onValueChange={(value) => setFormData({ ...formData, prayer_type: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="intercession">Intercession</SelectItem>
                <SelectItem value="thanksgiving">Thanksgiving</SelectItem>
                <SelectItem value="confession">Confession</SelectItem>
                <SelectItem value="petition">Petition</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleUpdate} disabled={updateEntry.isPending} className="w-full">
              {updateEntry.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Prayer"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
