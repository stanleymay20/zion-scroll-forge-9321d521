/**
 * Chat API Hook
 * Manages REST API calls for chat functionality
 */

import { useState, useCallback } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import { supabase } from '@/integrations/supabase/client';
import type {
  ChatRoom,
  ChatMessage,
  DirectMessage,
  CreateRoomRequest,
  SendMessageRequest,
  SendDirectMessageRequest,
  SearchMessagesRequest,
  SearchMessagesResponse
} from '@/types/chat';

interface UseChatAPIReturn {
  rooms: ChatRoom[];
  messages: Record<string, ChatMessage[]>;
  directMessages: Record<string, DirectMessage[]>;
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  fetchRooms: () => Promise<void>;
  fetchMessages: (roomId: string, limit?: number) => Promise<void>;
  fetchDirectMessages: (userId: string, limit?: number) => Promise<void>;
  sendMessage: (request: SendMessageRequest) => Promise<ChatMessage>;
  sendDirectMessage: (request: SendDirectMessageRequest) => Promise<DirectMessage>;
  createRoom: (request: CreateRoomRequest) => Promise<ChatRoom>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  searchMessages: (request: SearchMessagesRequest) => Promise<SearchMessagesResponse>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
}

export const useChatAPI = (): UseChatAPIReturn => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [directMessages, setDirectMessages] = useState<Record<string, DirectMessage[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get auth token
  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await getAuthToken();
      const response = await legacyApiCall('/api/chat/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      setRooms(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rooms');
      console.error('Error fetching rooms:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async (roomId: string, limit: number = 50) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await getAuthToken();
      const response = await legacyApiCall(`/api/chat/rooms/${roomId}/messages?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(prev => ({
        ...prev,
        [roomId]: data.data.messages || []
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch direct messages
  const fetchDirectMessages = useCallback(async (userId: string, limit: number = 50) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await getAuthToken();
      const response = await legacyApiCall(`/api/chat/direct-messages/${userId}?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch direct messages');
      }

      const data = await response.json();
      setDirectMessages(prev => ({
        ...prev,
        [userId]: data.data || []
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch direct messages');
      console.error('Error fetching direct messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (request: SendMessageRequest): Promise<ChatMessage> => {
    try {
      const token = await getAuthToken();
      const formData = new FormData();
      
      formData.append('roomId', request.roomId);
      formData.append('content', request.content);
      if (request.type) formData.append('type', request.type);
      if (request.replyToId) formData.append('replyToId', request.replyToId);
      
      if (request.attachments) {
        request.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response = await legacyApiCall('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const message = data.data;

      // Add message to local state
      setMessages(prev => ({
        ...prev,
        [request.roomId]: [...(prev[request.roomId] || []), message]
      }));

      return message;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, []);

  // Send direct message
  const sendDirectMessage = useCallback(async (request: SendDirectMessageRequest): Promise<DirectMessage> => {
    try {
      const token = await getAuthToken();
      const formData = new FormData();
      
      formData.append('recipientId', request.recipientId);
      formData.append('content', request.content);
      if (request.encrypt) formData.append('encrypt', 'true');
      
      if (request.attachments) {
        request.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response = await legacyApiCall('/api/chat/direct-messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to send direct message');
      }

      const data = await response.json();
      const message = data.data;

      // Add message to local state
      setDirectMessages(prev => ({
        ...prev,
        [request.recipientId]: [...(prev[request.recipientId] || []), message]
      }));

      return message;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send direct message');
      throw err;
    }
  }, []);

  // Create room
  const createRoom = useCallback(async (request: CreateRoomRequest): Promise<ChatRoom> => {
    try {
      const token = await getAuthToken();
      const response = await legacyApiCall('/api/chat/rooms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      const room = data.data.room;

      // Add room to local state
      setRooms(prev => [...prev, room]);

      return room;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      throw err;
    }
  }, []);

  // Join room
  const joinRoom = useCallback(async (roomId: string) => {
    try {
      const token = await getAuthToken();
      const response = await legacyApiCall(`/api/chat/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to join room');
      }

      // Refresh rooms
      await fetchRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      throw err;
    }
  }, [fetchRooms]);

  // Leave room
  const leaveRoom = useCallback(async (roomId: string) => {
    try {
      const token = await getAuthToken();
      const response = await legacyApiCall(`/api/chat/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to leave room');
      }

      // Remove room from local state
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room');
      throw err;
    }
  }, []);

  // Search messages
  const searchMessages = useCallback(async (request: SearchMessagesRequest): Promise<SearchMessagesResponse> => {
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams({
        query: request.query,
        ...(request.roomId && { roomId: request.roomId }),
        ...(request.senderId && { senderId: request.senderId }),
        ...(request.startDate && { startDate: request.startDate }),
        ...(request.endDate && { endDate: request.endDate }),
        ...(request.limit && { limit: request.limit.toString() })
      });

      const response = await legacyApiCall(`/api/chat/messages/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to search messages');
      }

      const data = await response.json();
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search messages');
      throw err;
    }
  }, []);

  // Update message
  const updateMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const token = await getAuthToken();
      const response = await legacyApiCall(`/api/chat/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error('Failed to update message');
      }

      const data = await response.json();
      const updatedMessage = data.data;

      // Update message in local state
      setMessages(prev => {
        const newMessages = { ...prev };
        Object.keys(newMessages).forEach(roomId => {
          newMessages[roomId] = newMessages[roomId].map(msg =>
            msg.id === messageId ? updatedMessage : msg
          );
        });
        return newMessages;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update message');
      throw err;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const token = await getAuthToken();
      const response = await legacyApiCall(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      // Mark message as deleted in local state
      setMessages(prev => {
        const newMessages = { ...prev };
        Object.keys(newMessages).forEach(roomId => {
          newMessages[roomId] = newMessages[roomId].map(msg =>
            msg.id === messageId ? { ...msg, isDeleted: true, content: '[Message deleted]' } : msg
          );
        });
        return newMessages;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message');
      throw err;
    }
  }, []);

  return {
    rooms,
    messages,
    directMessages,
    unreadCounts,
    isLoading,
    error,
    fetchRooms,
    fetchMessages,
    fetchDirectMessages,
    sendMessage,
    sendDirectMessage,
    createRoom,
    joinRoom,
    leaveRoom,
    searchMessages,
    updateMessage,
    deleteMessage
  };
};
