/**
 * Sprint D3.3 — Faculty Office Hours editor
 *
 * Faculty publishes office-hour slots, sees their bookings, cancels
 * either. All mutations go through SECURITY DEFINER RPCs (RLS blocks
 * direct table writes on bookings) so capacity / overlap / past-slot
 * rules are enforced server-side.
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CalendarPlus, X, Users } from 'lucide-react';

type Slot = {
  id: string;
  faculty_user_id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  location: string | null;
  meeting_url: string | null;
  notes: string | null;
  status: 'open' | 'cancelled';
  created_at: string;
};

type Booking = {
  id: string;
  slot_id: string;
  student_user_id: string;
  status: 'confirmed' | 'cancelled' | 'attended' | 'no_show';
  topic: string | null;
  notes: string | null;
  booked_at: string;
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

const useMySlots = () =>
  useQuery({
    queryKey: ['fac_oh', 'my_slots'],
    refetchInterval: 30_000,
    queryFn: async (): Promise<Slot[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from('faculty_office_hours_slots' as never)
        .select('*')
        .eq('faculty_user_id' as never, u.user.id)
        .order('starts_at' as never, { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Slot[];
    },
  });

const useSlotBookings = (slotId: string | null) =>
  useQuery({
    queryKey: ['fac_oh', 'slot_bookings', slotId],
    enabled: !!slotId,
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from('faculty_office_hours_bookings' as never)
        .select('*')
        .eq('slot_id' as never, slotId as string)
        .order('booked_at' as never, { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Booking[];
    },
  });

const FacultyOfficeHours = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const slotsQ = useMySlots();
  const [openCreate, setOpenCreate] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  const bookingsQ = useSlotBookings(activeSlotId);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc('faculty_office_hours_create_slot', {
        p_starts_at: new Date(startsAt).toISOString(),
        p_ends_at: new Date(endsAt).toISOString(),
        p_capacity: capacity,
        p_location: location || null,
        p_meeting_url: meetingUrl || null,
        p_notes: notes || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fac_oh'] });
      toast({ title: 'Slot published' });
      setOpenCreate(false);
      setStartsAt(''); setEndsAt(''); setCapacity(1);
      setLocation(''); setMeetingUrl(''); setNotes('');
    },
    onError: (e: Error) =>
      toast({ title: 'Failed to publish slot', description: e.message, variant: 'destructive' }),
  });

  const cancelSlot = useMutation({
    mutationFn: async (slotId: string) => {
      const { data, error } = await (supabase as any).rpc('faculty_office_hours_cancel_slot', {
        p_slot_id: slotId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: { cancelled_bookings: number }) => {
      qc.invalidateQueries({ queryKey: ['fac_oh'] });
      toast({
        title: 'Slot cancelled',
        description: `${d.cancelled_bookings} booking(s) auto-cancelled`,
      });
    },
    onError: (e: Error) =>
      toast({ title: 'Cancel failed', description: e.message, variant: 'destructive' }),
  });

  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await (supabase as any).rpc('faculty_office_hours_cancel_booking', {
        p_booking_id: bookingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fac_oh'] });
      toast({ title: 'Booking cancelled' });
    },
    onError: (e: Error) =>
      toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const upcoming = useMemo(
    () => (slotsQ.data ?? []).filter((s) => new Date(s.ends_at) > new Date()),
    [slotsQ.data],
  );
  const past = useMemo(
    () => (slotsQ.data ?? []).filter((s) => new Date(s.ends_at) <= new Date()),
    [slotsQ.data],
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarPlus className="h-7 w-7" />
            My Office Hours
          </h1>
          <p className="text-muted-foreground mt-1">
            Publish bookable office-hour slots. All actions audit through{' '}
            <code>ops_log</code>.
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><CalendarPlus className="h-4 w-4 mr-2" />Publish slot</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish a new slot</DialogTitle>
              <DialogDescription>
                Server enforces: ends &gt; starts, future-only, no overlap with your other open slots.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Starts at</Label>
                  <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </div>
                <div>
                  <Label>Ends at</Label>
                  <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Capacity (1-50)</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={capacity}
                  onChange={(e) => setCapacity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                />
              </div>
              <div>
                <Label>Location (optional)</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office 312" />
              </div>
              <div>
                <Label>Meeting URL (optional)</Label>
                <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bring your draft, etc." />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!startsAt || !endsAt || create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? 'Publishing…' : 'Publish'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming slots</CardTitle>
          <CardDescription>Source: <code>faculty_office_hours_slots</code></CardDescription>
        </CardHeader>
        <CardContent>
          {slotsQ.isLoading ? <p className="text-muted-foreground">Loading…</p>
            : upcoming.length === 0 ? <p className="text-muted-foreground">No upcoming slots.</p>
            : <SlotList
                slots={upcoming}
                onCancel={(id) => cancelSlot.mutate(id)}
                onViewBookings={setActiveSlotId}
              />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past slots</CardTitle>
          <CardDescription>Last 50, most recent first</CardDescription>
        </CardHeader>
        <CardContent>
          {past.length === 0
            ? <p className="text-muted-foreground">No past slots.</p>
            : <SlotList slots={past} onViewBookings={setActiveSlotId} />}
        </CardContent>
      </Card>

      <Dialog open={!!activeSlotId} onOpenChange={(o) => !o && setActiveSlotId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bookings</DialogTitle>
            <DialogDescription>
              Slot bookings (source: <code>faculty_office_hours_bookings</code>)
            </DialogDescription>
          </DialogHeader>
          {bookingsQ.isLoading ? <p className="text-muted-foreground">Loading…</p>
            : (bookingsQ.data ?? []).length === 0 ? <p className="text-muted-foreground">No bookings yet.</p>
            : <div className="space-y-2">
                {(bookingsQ.data ?? []).map((b) => (
                  <div key={b.id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={b.status === 'cancelled' ? 'outline' : 'default'}>{b.status}</Badge>
                        <code className="text-xs">{b.student_user_id.slice(0, 8)}</code>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{fmt(b.booked_at)}</p>
                      {b.topic && <p className="text-sm mt-1">{b.topic}</p>}
                    </div>
                    {b.status !== 'cancelled' && (
                      <Button size="sm" variant="outline" onClick={() => cancelBooking.mutate(b.id)}>
                        <X className="h-4 w-4 mr-1" />Cancel
                      </Button>
                    )}
                  </div>
                ))}
              </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SlotList = ({
  slots, onCancel, onViewBookings,
}: {
  slots: Slot[];
  onCancel?: (id: string) => void;
  onViewBookings: (id: string) => void;
}) => (
  <div className="space-y-2">
    {slots.map((s) => (
      <div key={s.id} className="flex items-center justify-between border rounded-md p-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{fmt(s.starts_at)} → {new Date(s.ends_at).toLocaleTimeString()}</span>
            <Badge variant={s.status === 'cancelled' ? 'outline' : 'secondary'}>{s.status}</Badge>
            <Badge variant="outline">cap {s.capacity}</Badge>
          </div>
          {(s.location || s.meeting_url) && (
            <p className="text-xs text-muted-foreground mt-1">
              {s.location ?? ''}{s.location && s.meeting_url ? ' · ' : ''}{s.meeting_url ?? ''}
            </p>
          )}
          {s.notes && <p className="text-sm mt-1">{s.notes}</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onViewBookings(s.id)}>
            <Users className="h-4 w-4 mr-1" />Bookings
          </Button>
          {onCancel && s.status === 'open' && (
            <Button size="sm" variant="outline" onClick={() => onCancel(s.id)}>
              <X className="h-4 w-4 mr-1" />Cancel slot
            </Button>
          )}
        </div>
      </div>
    ))}
  </div>
);

export default FacultyOfficeHours;
