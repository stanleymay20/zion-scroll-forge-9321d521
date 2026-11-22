/**
 * Ephemeral LiveKit classroom events. The sender is authenticated by LiveKit's
 * participant identity, never by a self-reported field in the data packet.
 * Room data is not durable or a substitute for moderated question storage.
 */
export const CLASSROOM_EVENT_TOPIC = 'scrolluniversity.classroom.v1';
export const MAX_CLASSROOM_TEXT_LENGTH = 500;

export type ClassroomPacket =
  | { version: 1; id: string; kind: 'question' | 'answer'; text: string }
  | { version: 1; id: string; kind: 'hand'; raised: boolean };

const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(value);

export function isClassroomPacket(value: unknown): value is ClassroomPacket {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || !validId(data.id)) return false;
  if (data.kind === 'hand') return typeof data.raised === 'boolean';
  if (data.kind === 'question' || data.kind === 'answer') {
    return typeof data.text === 'string'
      && data.text.trim().length > 0
      && data.text.length <= MAX_CLASSROOM_TEXT_LENGTH;
  }
  return false;
}

export function encodeClassroomPacket(packet: ClassroomPacket): Uint8Array {
  if (!isClassroomPacket(packet)) throw new Error('Invalid classroom packet');
  return new TextEncoder().encode(JSON.stringify(packet));
}

export function decodeClassroomPacket(
  payload: Uint8Array,
  topic: string | undefined,
): ClassroomPacket | null {
  if (topic !== CLASSROOM_EVENT_TOPIC || payload.byteLength > 2048) return null;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(payload));
    return isClassroomPacket(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
