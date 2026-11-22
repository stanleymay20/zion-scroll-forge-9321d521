/**
 * Real-time, non-persistent question feed for LiveKit classrooms.
 * Questions are visible to all participants currently connected to the room.
 * A lecturer/AI worker can reply on the same topic, using its own LiveKit identity.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Room, RoomEvent, type RemoteParticipant } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Hand, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  CLASSROOM_EVENT_TOPIC,
  MAX_CLASSROOM_TEXT_LENGTH,
  decodeClassroomPacket,
  encodeClassroomPacket,
  type ClassroomPacket,
} from '@/lib/classroomEvents';

type ClassroomRole = 'student' | 'faculty' | 'observer';
type FeedEntry = { id: string; kind: 'question' | 'answer'; text: string; sender: string; own: boolean };

function isLecturer(identity: string) {
  return identity.startsWith('faculty:') ||
    identity.startsWith('lecturer:') ||
    identity.startsWith('lecturer-') ||
    identity.startsWith('bot:');
}

export function LiveClassroomInteractions({ room, role }: { room: Room; role: ClassroomRole }) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [handRaised, setHandRaised] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const isObserver = role === 'observer';
  const isFaculty = role === 'faculty';

  useEffect(() => {
    const onData = (payload: Uint8Array, participant?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      if (!participant) return;
      const packet = decodeClassroomPacket(payload, topic);
      if (!packet) return;
      if (packet.kind === 'answer' && !isLecturer(participant.identity)) return;

      if (packet.kind === 'hand') {
        setRaisedHands((current) => ({ ...current, [participant.identity]: packet.raised }));
        return;
      }

      setEntries((current) => current.some((entry) => entry.id === packet.id)
        ? current
        : [...current, {
          id: packet.id,
          kind: packet.kind,
          text: packet.text,
          sender: packet.kind === 'answer' ? 'Lecturer' : 'Student',
          own: false,
        }].slice(-50));
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room]);

  const publish = async (packet: ClassroomPacket) => {
    await room.localParticipant.publishData(encodeClassroomPacket(packet), {
      reliable: true,
      topic: CLASSROOM_EVENT_TOPIC,
    });
  };

  const onSend = async (event: FormEvent) => {
    event.preventDefault();
    const message = text.trim();
    if (isObserver || !message || sending) return;
    setSending(true);
    try {
      const kind = isFaculty ? 'answer' : 'question';
      const packet: ClassroomPacket = { version: 1, id: crypto.randomUUID(), kind, text: message };
      await publish(packet);
      setEntries((current) => [...current, { id: packet.id, kind, text: message, sender: 'You', own: true }].slice(-50));
      setText('');
    } catch {
      toast.error('Message could not be sent. Check your classroom connection.');
    } finally {
      setSending(false);
    }
  };

  const onHandToggle = async () => {
    if (isObserver || sending) return;
    setSending(true);
    try {
      const raised = !handRaised;
      await publish({ version: 1, id: crypto.randomUUID(), kind: 'hand', raised });
      setHandRaised(raised);
      setRaisedHands((current) => ({ ...current, [room.localParticipant.identity]: raised }));
    } catch {
      toast.error('Could not update your hand-raise status.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-4 space-y-3" aria-label="Classroom discussion">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h4 className="font-medium">Classroom questions</h4>
          <p className="text-xs text-muted-foreground">
            Visible to people in this room. These LiveKit messages are not saved to a course record.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          <Hand className="inline h-3 w-3 mr-1" /> {Object.values(raisedHands).filter(Boolean).length} hands raised
        </span>
      </div>
      <div className="max-h-60 overflow-y-auto space-y-2" aria-live="polite">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No questions yet. Ask your lecturer about the lesson.</p>
        ) : entries.map((entry) => (
          <div key={entry.id} className="border rounded-md p-2 text-sm">
            <span className="text-xs font-semibold">{entry.own ? 'You' : entry.sender}</span>
            <span className="text-xs text-muted-foreground"> · {entry.kind === 'answer' ? 'Answer' : 'Question'}</span>
            <p className="mt-1 whitespace-pre-wrap break-words">{entry.text}</p>
          </div>
        ))}
      </div>
      {!isObserver && (
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant={handRaised ? 'secondary' : 'outline'} onClick={onHandToggle} disabled={sending}>
            <Hand className="h-4 w-4 mr-1" /> {handRaised ? 'Lower hand' : 'Raise hand'}
          </Button>
          <form onSubmit={onSend} className="flex gap-2 flex-1 min-w-52">
            <Input
              aria-label={isFaculty ? 'Lecturer answer' : 'Ask a classroom question'}
              placeholder={isFaculty ? 'Reply to a question…' : 'Ask a question…'}
              maxLength={MAX_CLASSROOM_TEXT_LENGTH}
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !text.trim()}>
              <Send className="h-4 w-4 mr-1" /> Send
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}
