import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, Video, BookOpen, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getUserFriendlyError } from "@/lib/errors";

interface Tutor {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
}

interface TimeSlot {
  id: string;
  tutor_id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  tutor: Tutor;
}

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  topic: string;
  notes: string;
  status: string;
  tutor: Tutor;
}

export default function AITutorOfficeHours() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAvailableSlots();
    fetchMyBookings();
  }, [selectedDate]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('office_hours_slots' as any)
      .select(`
        *,
        tutor:profiles!office_hours_slots_tutor_id_fkey(id, full_name, avatar_url, bio)
      `)
      .eq('is_available', true)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching slots:', error);
      return;
    }

    setAvailableSlots((data || []) as any);
  };

  const fetchMyBookings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('office_hours_bookings' as any)
      .select(`
        id,
        start_time:slot_id(start_time),
        end_time:slot_id(end_time),
        topic,
        notes,
        status,
        tutor:profiles!office_hours_bookings_tutor_id_fkey(id, full_name, avatar_url)
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
      return;
    }

    setMyBookings((data || []) as any);
  };

  const bookSlot = async () => {
    if (!selectedSlot || !topic.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select a time slot and provide a topic',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to book office hours',
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from('office_hours_bookings' as any).insert({
      slot_id: selectedSlot.id,
      student_id: user.id,
      tutor_id: selectedSlot.tutor_id,
      topic: topic.trim(),
      notes: notes.trim(),
      meeting_url: `https://meet.jit.si/scrolluniversity-officehours-${selectedSlot.id}`
    });

    if (error) {
      toast({
        title: 'Booking Failed',
        description: getUserFriendlyError(error),
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Booking Confirmed!',
        description: 'You will receive a confirmation email shortly'
      });
      setSelectedSlot(null);
      setTopic('');
      setNotes('');
      fetchAvailableSlots();
      fetchMyBookings();
    }

    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">AI Tutor Office Hours</h1>
        <p className="text-muted-foreground">
          Schedule one-on-one video sessions with AI tutors for personalized guidance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar & Available Slots */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Available Time Slots
              </CardTitle>
              <CardDescription>
                {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableSlots.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No available slots for this date
                </p>
              ) : (
                <div className="space-y-3">
                  {availableSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedSlot?.id === slot.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={slot.tutor.avatar_url} />
                            <AvatarFallback>{slot.tutor.full_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{slot.tutor.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(slot.start_time), 'h:mm a')} -{' '}
                              {format(new Date(slot.end_time), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          <Video className="h-3 w-3 mr-1" />
                          Video
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Form & My Bookings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Book Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSlot ? (
                <>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Selected Time:</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedSlot.start_time), 'EEEE, MMMM d')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedSlot.start_time), 'h:mm a')} -{' '}
                      {format(new Date(selectedSlot.end_time), 'h:mm a')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topic">Discussion Topic *</Label>
                    <Input
                      id="topic"
                      placeholder="What would you like to discuss?"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any specific questions or areas of focus?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={bookSlot}
                    disabled={isLoading || !topic.trim()}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Select a time slot to continue
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Upcoming Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {myBookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No bookings yet
                </p>
              ) : (
                <div className="space-y-3">
                  {myBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={booking.tutor.avatar_url} />
                          <AvatarFallback>
                            {booking.tutor.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm">
                          {booking.tutor.full_name}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {booking.topic}
                      </p>
                      <Badge
                        variant={
                          booking.status === 'scheduled'
                            ? 'default'
                            : booking.status === 'completed'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}