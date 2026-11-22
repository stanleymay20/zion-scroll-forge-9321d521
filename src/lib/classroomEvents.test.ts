import { describe, expect, it } from 'vitest';
import {
  CLASSROOM_EVENT_TOPIC,
  MAX_CLASSROOM_TEXT_LENGTH,
  decodeClassroomPacket,
  encodeClassroomPacket,
} from './classroomEvents';

const id = '12345678-1234-4234-8234-123456789abc';

describe('classroom event protocol', () => {
  it('round-trips a student's question', () => {
    const event = { version: 1 as const, id, kind: 'question' as const, text: 'Explain this example?' };
    expect(decodeClassroomPacket(encodeClassroomPacket(event), CLASSROOM_EVENT_TOPIC)).toEqual(event);
  });

  it('round-trips a hand raise and a faculty answer', () => {
    const hand = { version: 1 as const, id, kind: 'hand' as const, raised: true };
    const answer = { version: 1 as const, id, kind: 'answer' as const, text: 'Here is the reasoning.' };
    expect(decodeClassroomPacket(encodeClassroomPacket(hand), CLASSROOM_EVENT_TOPIC)).toEqual(hand);
    expect(decodeClassroomPacket(encodeClassroomPacket(answer), CLASSROOM_EVENT_TOPIC)).toEqual(answer);
  });

  it('ignores other LiveKit topics and malformed payloads', () => {
    const data = encodeClassroomPacket({ version: 1, id, kind: 'hand', raised: false });
    expect(decodeClassroomPacket(data, 'another.topic')).toBeNull();
    expect(decodeClassroomPacket(new TextEncoder().encode('{broken'), CLASSROOM_EVENT_TOPIC)).toBeNull();
    expect(decodeClassroomPacket(new Uint8Array(3000), CLASSROOM_EVENT_TOPIC)).toBeNull();
  });

  it('rejects empty, oversized and unrecognized messages', () => {
    expect(() => encodeClassroomPacket({ version: 1, id, kind: 'question', text: ' ' })).toThrow();
    expect(() => encodeClassroomPacket({
      version: 1, id, kind: 'question', text: 'a'.repeat(MAX_CLASSROOM_TEXT_LENGTH + 1),
    })).toThrow();
    const unrecognized = new TextEncoder().encode(JSON.stringify({ version: 1, id, kind: 'system', text: 'hi' }));
    expect(decodeClassroomPacket(unrecognized, CLASSROOM_EVENT_TOPIC)).toBeNull();
  });
});
