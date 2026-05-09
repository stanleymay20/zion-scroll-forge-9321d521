/**
 * AI Tutor Interface Page
 * "The Spirit of truth will guide you into all truth" - John 16:13
 * 
 * Comprehensive AI tutoring interface with:
 * - Chat interface with message history
 * - Video avatar display with streaming support
 * - Voice input for asking questions
 * - Slide viewer for AI-generated explanations
 * - Tutor personality selector
 * - Session history and bookmarks
 * - Tutor rating and feedback system
 */

import React, { useState, useEffect, useRef } from 'react';
import { legacyApiCall } from "@/lib/legacyApi";
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Star,
  Bookmark,
  BookmarkCheck,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  History,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  responseTime?: number;
  suggestions?: string[];
  resources?: any[];
  needsClarification?: boolean;
  confidence?: number;
  bookmarked?: boolean;
}

interface TutorSession {
  id: string;
  userId: string;
  courseId?: string;
  tutorType: string;
  conversationHistory: Message[];
  metadata: {
    startedAt: Date;
    lastActivityAt: Date;
    messageCount: number;
    topicsDiscussed: string[];
  };
  analytics: {
    totalResponseTime: number;
    averageResponseTime: number;
    totalTokensUsed: number;
    questionsAnswered: number;
  };
}

interface TutorType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface VideoAvatarState {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  currentSlide?: string;
}

export const AITutorInterface: React.FC = () => {
  const { user } = useAuth();
  
  // Session state
  const [session, setSession] = useState<TutorSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tutor selection
  const [tutorTypes, setTutorTypes] = useState<TutorType[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<string>('general');
  const [showTutorSelector, setShowTutorSelector] = useState(false);
  
  // Voice input
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // Video avatar
  const [videoState, setVideoState] = useState<VideoAvatarState>({
    isPlaying: false,
    isMuted: false,
    isFullscreen: false
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Session history
  const [showHistory, setShowHistory] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<TutorSession[]>([]);
  
  // Bookmarks
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<string>>(new Set());
  
  // Rating
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Check voice support
  useEffect(() => {
    setVoiceSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }, []);
  
  // Load tutor types
  useEffect(() => {
    loadTutorTypes();
  }, []);
  
  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTutorTypes = async () => {
    try {
      const response = await legacyApiCall('/api/ai-tutor/tutor-types', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setTutorTypes(result.data.tutorTypes);
      }
    } catch (err) {
      console.error('Failed to load tutor types:', err);
    }
  };
  
  const startSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await legacyApiCall('/api/ai-tutor/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tutorType: selectedTutor,
          learningObjectives: []
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to start session');
      }
      
      setSession(result.data);
      setMessages([]);
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: getWelcomeMessage(selectedTutor),
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const getWelcomeMessage = (tutorType: string): string => {
    const tutor = tutorTypes.find(t => t.id === tutorType);
    return `Welcome! I'm your ${tutor?.name || 'AI Tutor'}. ${tutor?.description || ''}\n\nHow can I help you learn today?`;
  };
  
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !session || loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);
    
    try {
      const response = await legacyApiCall(`/api/ai-tutor/sessions/${session.id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: text })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.data.message,
        timestamp: new Date(),
        suggestions: result.data.suggestions,
        resources: result.data.resources,
        needsClarification: result.data.needsClarification,
        confidence: result.data.confidence,
        responseTime: result.data.responseTime,
        tokens: result.data.tokensUsed
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessageStream = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || !session || loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setStreaming(true);
    setError(null);
    
    // Create placeholder for streaming response
    const streamingMessageId = (Date.now() + 1).toString();
    const streamingMessage: Message = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, streamingMessage]);
    
    try {
      const response = await legacyApiCall(`/api/ai-tutor/sessions/${session.id}/message/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: text })
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('Stream not available');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.delta) {
                setMessages(prev => prev.map(msg => 
                  msg.id === streamingMessageId
                    ? { ...msg, content: msg.content + data.delta }
                    : msg
                ));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      // Remove streaming message on error
      setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId));
    } finally {
      setStreaming(false);
    }
  };
  
  const startVoiceInput = async () => {
    if (!voiceSupported) return;
    
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsRecording(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };
      
      recognition.onerror = () => {
        setIsRecording(false);
        setError('Voice recognition failed');
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognition.start();
    } catch (err) {
      setError('Failed to start voice input');
    }
  };
  
  const stopVoiceInput = () => {
    setIsRecording(false);
  };

  const toggleBookmark = (messageId: string) => {
    setBookmarkedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
    
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, bookmarked: !msg.bookmarked } : msg
    ));
  };
  
  const endSession = async () => {
    if (!session) return;
    
    setShowRating(true);
  };
  
  const submitRating = async () => {
    if (!session) return;
    
    try {
      const response = await legacyApiCall(`/api/ai-tutor/sessions/${session.id}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          satisfactionRating: rating,
          feedback
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSession(null);
        setMessages([]);
        setShowRating(false);
        setRating(0);
        setFeedback('');
      }
    } catch (err) {
      setError('Failed to end session');
    }
  };
  
  const loadSessionHistory = async () => {
    try {
      const response = await legacyApiCall('/api/ai-tutor/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      if (result.success) {
        // This would need to be expanded to load actual session list
        setShowHistory(true);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Tutor</h1>
                <p className="text-sm text-gray-600">World-class personalized learning</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadSessionHistory}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <History className="w-5 h-5" />
                <span>History</span>
              </button>
              
              {session && (
                <button
                  onClick={endSession}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                  <span>End Session</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Tutor Selection & Video */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tutor Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Select Tutor</h2>
                <button
                  onClick={() => setShowTutorSelector(!showTutorSelector)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {showTutorSelector ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              
              {showTutorSelector && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {tutorTypes.map(tutor => (
                    <button
                      key={tutor.id}
                      onClick={() => {
                        setSelectedTutor(tutor.id);
                        setShowTutorSelector(false);
                      }}
                      disabled={!!session}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedTutor === tutor.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      } ${session ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tutor.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{tutor.name}</h3>
                          <p className="text-xs text-gray-600 mt-1">{tutor.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {!showTutorSelector && (
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-600">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {tutorTypes.find(t => t.id === selectedTutor)?.icon || '🎓'}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {tutorTypes.find(t => t.id === selectedTutor)?.name || 'General Tutor'}
                      </h3>
                    </div>
                  </div>
                </div>
              )}
              
              {!session && (
                <button
                  onClick={startSession}
                  disabled={loading}
                  className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      Starting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Start Session
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Video Avatar Display */}
            {session && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Video Avatar</h2>
                
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted={videoState.isMuted}
                    autoPlay
                  />
                  
                  {/* Video Controls */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setVideoState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        >
                          {videoState.isPlaying ? (
                            <Pause className="w-5 h-5 text-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => setVideoState(prev => ({ ...prev, isMuted: !prev.isMuted }))}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        >
                          {videoState.isMuted ? (
                            <VolumeX className="w-5 h-5 text-white" />
                          ) : (
                            <Volume2 className="w-5 h-5 text-white" />
                          )}
                        </button>
                      </div>
                      
                      <button
                        onClick={() => setVideoState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }))}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                      >
                        {videoState.isFullscreen ? (
                          <Minimize className="w-5 h-5 text-white" />
                        ) : (
                          <Maximize className="w-5 h-5 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Placeholder when no video */}
                  {!videoState.isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                      <div className="text-center text-white">
                        <Bot className="w-16 h-16 mx-auto mb-4 opacity-80" />
                        <p className="text-lg font-semibold">AI Tutor Ready</p>
                        <p className="text-sm opacity-80 mt-2">Ask a question to begin</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Slide Viewer */}
                {videoState.currentSlide && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Slide</h3>
                    <img
                      src={videoState.currentSlide}
                      alt="AI Generated Slide"
                      className="w-full rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Session Analytics */}
            {session && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Stats</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Questions Asked</span>
                    <span className="font-semibold text-gray-900">
                      {session.analytics.questionsAnswered}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Response Time</span>
                    <span className="font-semibold text-gray-900">
                      {(session.analytics.averageResponseTime / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Topics Discussed</span>
                    <span className="font-semibold text-gray-900">
                      {session.metadata.topicsDiscussed.length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg flex flex-col h-[calc(100vh-12rem)]">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-6 h-6" />
                  <div>
                    <h3 className="font-semibold">Chat with AI Tutor</h3>
                    {session && (
                      <p className="text-xs opacity-90">
                        Session started {new Date(session.metadata.startedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
                
                {session && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm">Active</span>
                  </div>
                )}
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!session && (
                  <div className="text-center text-gray-500 mt-12">
                    <Bot className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                    <h3 className="text-xl font-semibold mb-2">Welcome to AI Tutor</h3>
                    <p className="text-sm mb-6">Select a tutor type and start a session to begin learning</p>
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <Sparkles className="w-6 h-6 text-blue-600 mb-2" />
                        <h4 className="font-semibold text-sm mb-1">World-Class Teaching</h4>
                        <p className="text-xs text-gray-600">Harvard-level instruction with spiritual wisdom</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <Bot className="w-6 h-6 text-purple-600 mb-2" />
                        <h4 className="font-semibold text-sm mb-1">24/7 Availability</h4>
                        <p className="text-xs text-gray-600">Learn anytime, anywhere at your own pace</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                        <h4 className="font-semibold text-sm mb-1">Personalized Learning</h4>
                        <p className="text-xs text-gray-600">Adapts to your level and learning style</p>
                      </div>
                      <div className="p-4 bg-pink-50 rounded-lg">
                        <Star className="w-6 h-6 text-pink-600 mb-2" />
                        <h4 className="font-semibold text-sm mb-1">Spiritual Integration</h4>
                        <p className="text-xs text-gray-600">Biblical wisdom woven into every lesson</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                          <Bot className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        
                        {message.confidence !== undefined && (
                          <div className="mt-2 flex items-center gap-2 text-xs opacity-75">
                            {message.confidence >= 0.9 ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            <span>Confidence: {(message.confidence * 100).toFixed(0)}%</span>
                          </div>
                        )}
                        
                        {message.responseTime && (
                          <p className="text-xs opacity-50 mt-2">
                            Response time: {(message.responseTime / 1000).toFixed(2)}s
                          </p>
                        )}
                      </div>

                      {/* Suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold opacity-75">Suggested follow-ups:</p>
                          {message.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="block w-full text-left text-xs p-2 bg-white/10 hover:bg-white/20 rounded border border-white/20 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => toggleBookmark(message.id)}
                          className={`p-1 rounded hover:bg-white/10 transition-colors ${
                            message.role === 'user' ? 'text-white' : 'text-gray-600'
                          }`}
                        >
                          {bookmarkedMessages.has(message.id) ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                        
                        <span className={`text-xs ${message.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {(loading || streaming) && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white animate-pulse" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input Area */}
              {session && (
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask your question... (Press Enter to send, Shift+Enter for new line)"
                        className="w-full resize-none border rounded-lg p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] max-h-[200px]"
                        disabled={loading || streaming}
                      />
                      
                      {voiceSupported && (
                        <button
                          onClick={isRecording ? stopVoiceInput : startVoiceInput}
                          className={`absolute right-3 top-3 p-2 rounded-full transition-colors ${
                            isRecording
                              ? 'bg-red-500 text-white animate-pulse'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {isRecording ? (
                            <MicOff className="w-5 h-5" />
                          ) : (
                            <Mic className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || loading || streaming}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {isRecording ? 'Listening...' : 'Press Enter to send, Shift+Enter for new line'}
                    </p>
                    
                    <button
                      onClick={() => sendMessageStream()}
                      disabled={!input.trim() || loading || streaming}
                      className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      Use streaming mode
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Rate Your Session</h2>
              <button
                onClick={() => setShowRating(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">How satisfied were you with this tutoring session?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Feedback (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your thoughts about this session..."
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRating(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRating}
                disabled={rating === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Submit & End Session
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Session History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Session History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {sessionHistory.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No previous sessions found</p>
                  <p className="text-sm mt-2">Start a new session to begin learning!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionHistory.map((historySession) => (
                    <div
                      key={historySession.id}
                      className="p-4 border rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {tutorTypes.find(t => t.id === historySession.tutorType)?.name || 'AI Tutor'}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {new Date(historySession.metadata.startedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Messages:</span>
                          <span className="ml-2 font-semibold">{historySession.metadata.messageCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Topics:</span>
                          <span className="ml-2 font-semibold">{historySession.metadata.topicsDiscussed.length}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Questions:</span>
                          <span className="ml-2 font-semibold">{historySession.analytics.questionsAnswered}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITutorInterface;
