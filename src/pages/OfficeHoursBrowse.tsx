/**
 * Sprint D3.3 — Student browse & book faculty office hours
 *
 * Browses all open future slots, lets the caller book one (server-side
 * checks: capacity, double-book, past-slot, cancelled-slot, self-book),
 * and shows the caller's bookings with a cancel button.
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, X } from 'lucide-react';

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
};

type Booking = {
  id: string;
  slot_id: string;
  student_user_id: string;
  status: 'confirmed' | 'cancelled' | 'attended' | 'no_show';
  topic: string | null;
  booked_at: string;
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

const useOpenSlots = () =>
  useQuery({
    queryKey: ['fac_oh', 'browse'],
    refetchInterval: 30_000,
    queryFn: async (): Promise<Slot[]> => {
      const { data, error } = await supabase
        .from('faculty_office_hours_slots' as never)
        .select('*')
        .eq('status' as never, 'open')
        .gt('starts_at' as never, new Date().toISOString())
        .order('starts_at' as never, { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Slot[];
    },
  });

const useMyBookings = () =>
  useQuery({
    queryKey: ['fac_oh', 'my_bookings'],
    refetchInterval: 30_000,
    queryFn: async (): Promise<Booking[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from('faculty_office_hours_bookings' as never)
        .select('*')
        .eq('student_user_id' as never, u.user.id)
        .order('booked_at' as never, { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Booking[];
    },
  });

const OfficeHoursBrowse = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const slotsQ = useOpenSlots();
  const bookingsQ = useMyBookings();
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');

  const book = useMutation({
    mutationFn: async () => {
      if (!bookingSlot) return;
      const { data, error } = await (supabase as any).rpc('faculty_office_hours_book', {
        p_slot_id: bookingSlot.id,
        p_topic: topic || null,
        p_notes: notes || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fac_oh'] });
      toast({ title: 'Booked' });
      setBookingSlot(null); setTopic(''); setNotes('');
    },
    onError: (e: Error) =>
      toast({ title: 'Booking failed', description: e.message, variant: 'destructive' }),
  });

  const cancel = useMutation({
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
      toast({ title: 'Cancel failed', description: e.message, variant: 'destructive' }),
  });

  const activeBookings = useMemo(
    () => (bookingsQ.data ?? []).filter((b) => b.status !== 'cancelled'),
    [bookingsQ.data],
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-7 w-7" />
          Faculty Office Hours
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse open slots and book a time with a faculty member.
        </p>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">Browse ({slotsQ.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="mine">My bookings ({activeBookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <Card>
            <CardHeader>
              <CardTitle>Open future slots</CardTitle>
              <CardDescription>Source: <code>faculty_office_hours_slots</code></CardDescription>
            </CardHeader>
            <CardContent>
              {slotsQ.isLoading ? <p className="text-muted-foreground">Loading…</p>
                : (slotsQ.data ?? []).length === 0 ? <p className="text-muted-foreground">No open slots right now.</p>
                : <div className="space-y-2">
                    {(slotsQ.data ?? []).map((s) => (
                      <div key={s.id} className="flex items-center justify-between border rounded-md p-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{fmt(s.starts_at)} → {new Date(s.ends_at).toLocaleTimeString()}</span>
                            <Badge variant="outline">cap {s.capacity}</Badge>
                            <code className="text-xs text-muted-foreground">{s.faculty_user_id.slice(0, 8)}</code>
                          </div>
                          {(s.location || s.meeting_url) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {s.location ?? ''}{s.location && s.meeting_url ? ' · ' : ''}{s.meeting_url ?? ''}
                            </p>
                          )}
                          {s.notes && <p className="text-sm mt-1">{s.notes}</p>}
                        </div>
                        <Button size="sm" onClick={() => setBookingSlot(s)}>Book</Button>
                      </div>
                    ))}
                  </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mine">
          <Card>
            <CardHeader>
              <CardTitle>My bookings</CardTitle>
              <CardDescription>Source: <code>faculty_office_hours_bookings</code></CardDescription>
            </CardHeader>
            <CardContent>
              {bookingsQ.isLoading ? <p className="text-muted-foreground">Loading…</p>
                : (bookingsQ.data ?? []).length === 0 ? <p className="text-muted-foreground">No bookings yet.</p>
                : <div className="space-y-2">
                    {(bookingsQ.data ?? []).map((b) => (
                      <div key={b.id} className="flex items-center justify-between border rounded-md p-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={b.status === 'cancelled' ? 'outline' : 'default'}>{b.status}</Badge>
                            <code className="text-xs">slot {b.slot_id.slice(0, 8)}</code>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{fmt(b.booked_at)}</p>
                          {b.topic && <p className="text-sm mt-1">{b.topic}</p>}
                        </div>
                        {b.status !== 'cancelled' && (
                          <Button size="sm" variant="outline" onClick={() => cancel.mutate(b.id)}>
                            <X className="h-4 w-4 mr-1" />Cancel
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!bookingSlot} onOpenChange={(o) => !o && setBookingSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book this slot</DialogTitle>
            <DialogDescription>
              {bookingSlot && (
                <>
                  {fmt(bookingSlot.starts_at)} → {bookingSlot && new Date(bookingSlot.ends_at).toLocaleTimeString()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>What do you want to discuss? (optional)</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the faculty should prepare" />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={book.isPending} onClick={() => book.mutate()}>
              {book.isPending ? 'Booking…' : 'Confirm booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficeHoursBrowse;
