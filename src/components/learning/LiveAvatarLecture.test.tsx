import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveAvatarLecture } from './LiveAvatarLecture';

const invokeMock = vi.fn();
const supabaseUrl = 'https://example.supabase.co';

vi.stubEnv('VITE_SUPABASE_URL', supabaseUrl);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'student@example.com' } } }),
    },
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'session-1' }, error: null }),
      order: vi.fn().mockResolvedValue({ data: [] }),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

vi.mock('./CompanionResources', () => ({
  CompanionResources: () => <div data-testid="companion-resources" />,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('LiveAvatarLecture workflow', () => {
  beforeEach(() => {
    invokeMock.mockReset();

    class AudioMock {
      muted = false;
      src = '';
      onended: null | (() => void) = null;
      onerror: null | (() => void) = null;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
    }

    class RTCPeerConnectionMock {
      connectionState = 'connected';
      ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;
      onicecandidate: ((event: { candidate: null }) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;
      oniceconnectionstatechange: (() => void) | null = null;
      addTransceiver() { return {}; }
      async setRemoteDescription() {}
      async createAnswer() { return { type: 'answer', sdp: 'fake-sdp' }; }
      async setLocalDescription() {}
      close() {}
    }

    Object.defineProperty(window, 'Audio', { writable: true, value: AudioMock });
    Object.defineProperty(window, 'RTCPeerConnection', { writable: true, value: RTCPeerConnectionMock });
    Object.defineProperty(window, 'RTCSessionDescription', { writable: true, value: class { constructor(public value: unknown) {} } });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: vi.fn() });

    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });

    Object.defineProperty(window, 'AudioContext', {
      writable: true,
      value: class {
        createMediaStreamSource() { return { connect: vi.fn() }; }
        createAnalyser() {
          return {
            fftSize: 0,
            frequencyBinCount: 8,
            getByteFrequencyData: (buf: Uint8Array) => buf.fill(64),
          };
        }
        close() { return Promise.resolve(); }
      },
    });

    invokeMock.mockImplementation((name: string, { body }: { body: any }) => {
      if (name !== 'ai-avatar-stream') return Promise.resolve({ data: {}, error: null });
      if (body.action === 'create_stream') {
        return Promise.resolve({
          data: {
            stream_id: 'stream-1',
            session_id: 'stream-session-1',
            offer: { type: 'offer', sdp: 'offer-sdp' },
            ice_servers: [],
          },
          error: null,
        });
      }
      if (body.action === 'sdp_answer' || body.action === 'ice_candidate' || body.action === 'destroy_stream') {
        return Promise.resolve({ data: { success: true }, error: null });
      }
      if (body.action === 'talk') {
        return Promise.resolve({
          data: {
            message: 'Welcome. Let us think carefully together.',
            audio_base64: 'ZmFrZWF1ZGlv',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: {}, error: null });
    });
  });

  it('simulates join, enable sound, mic test, tutor message, and avatar/audio status', async () => {
    render(
      <LiveAvatarLecture
        tutorId="tutor-1"
        tutorName="Caleb"
        tutorSpecialty="Computer Science & AI"
        courseTitle="AI Ethics & Responsible Systems"
        facultyName="Computer Science & AI"
        programTitle="BSc Computer Science"
        studentName="Demo Student"
        moduleId="module-1"
        moduleTitle="Responsible Systems"
        moduleContent="Module content"
        learningObjectives={['Explain trustworthy AI']}
      />
    );

    const hasText = (needle: string) => (_: string, el: Element | null) => {
      if (!el) return false;
      const own = (el.textContent || '').toLowerCase().replace(/\s+/g, ' ');
      const childMatch = Array.from(el.children).some(
        (c) => (c.textContent || '').toLowerCase().replace(/\s+/g, ' ').includes(needle)
      );
      return own.includes(needle) && !childMatch;
    };

    fireEvent.click(screen.getByRole('button', { name: /enable sound/i }));
    await waitFor(() => expect(screen.getAllByText(hasText('audio: on')).length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: /test microphone/i }));
    await waitFor(() => expect(screen.getAllByText(hasText('mic: granted')).length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: /start lecture/i }));
    // Truthful contract: we only claim "live avatar" once the remote video track fires.
    // Until then the badge must show "negotiating video" — never the stronger claim.
    await waitFor(() => expect(screen.getAllByText(hasText('delivery: negotiating video')).length).toBeGreaterThan(0));

    expect(invokeMock).toHaveBeenCalledWith('ai-avatar-stream', expect.objectContaining({
      body: expect.objectContaining({
        action: 'create_stream',
        avatar_image_url: `${supabaseUrl}/storage/v1/object/public/avatars/default-tutor.jpg`,
      }),
    }));

    const input = screen.getByPlaceholderText(/ask, or tap hand to queue/i);
    fireEvent.change(input, { target: { value: 'Can you explain the practical implication?' } });
    fireEvent.click(screen.getByRole('button', { name: /ask now/i }));

    await waitFor(() => {
      expect(screen.getByText(/welcome\. let us think carefully together\./i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('live-avatar-video')).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith('ai-avatar-stream', expect.objectContaining({ body: expect.objectContaining({ action: 'talk' }) }));
  });

  it('shows truthful text fallback when avatar stream creation fails', async () => {
    invokeMock.mockImplementationOnce(() => Promise.resolve({ data: null, error: new Error('provider unavailable') }));

    render(
      <LiveAvatarLecture
        tutorName="Caleb"
        tutorSpecialty="Computer Science & AI"
        courseTitle="AI Ethics & Responsible Systems"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /start lecture/i }));

    await waitFor(() =>
      expect(
        screen.getAllByText((_, el) => {
          if (!el) return false;
          const own = (el.textContent || '').toLowerCase();
          const childMatch = Array.from(el.children).some(
            (c) => (c.textContent || '').toLowerCase().includes('delivery: text tutor only')
          );
          return own.includes('delivery: text tutor only') && !childMatch;
        }).length
      ).toBeGreaterThan(0)
    );
  });
});