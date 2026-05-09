import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitution } from "@/contexts/InstitutionContext";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getUserFriendlyError } from "@/lib/errors";

console.info("✝️ Real-Time Messaging — Christ governs connection");

export default function RealTimeMessaging() {
  const { user } = useAuth();
  const { activeInstitution } = useInstitution();
  const queryClient = useQueryClient();
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_members")
        .select(`
          *,
          conversations(
            *,
            messages(content, created_at)
          )
        `)
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { data: messages } = useQuery({
    queryKey: ["messages", selectedConvoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          profiles:sender_id(email)
        `)
        .eq("conversation_id", selectedConvoId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedConvoId,
  });

  // Subscribe to realtime messages
  useEffect(() => {
    if (!selectedConvoId) return;

    const channel = supabase
      .channel(`messages:${selectedConvoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConvoId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["messages", selectedConvoId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConvoId, queryClient]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConvoId!,
          sender_id: user!.id,
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConvoId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (messageText.trim() && selectedConvoId) {
      sendMessage.mutate(messageText);
    }
  };

  const selectedConvo = conversations?.find((c: any) => c.conversation_id === selectedConvoId);

  return (
    <PageTemplate title="Messages" description="Connect with your community in real-time">
      <div className="max-w-7xl mx-auto">
        <Card className="h-[calc(100vh-200px)]">
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-full sm:w-80 border-r">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="h-[calc(100%-73px)]">
                {conversations?.map((conv: any) => {
                  const convo = conv.conversations;
                  const lastMessage = convo.messages?.[0];
                  const lastReadAt = conv.last_read_at ? new Date(conv.last_read_at).getTime() : 0;
                  const unreadCount = (convo.messages || []).filter(
                    (m: any) => new Date(m.created_at).getTime() > lastReadAt
                  ).length;

                  return (
                    <button
                      key={conv.conversation_id}
                      onClick={() => setSelectedConvoId(conv.conversation_id)}
                      className={`w-full p-4 border-b hover:bg-muted/50 text-left transition-colors ${
                        selectedConvoId === conv.conversation_id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>{convo.title?.[0] || "C"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold truncate">{convo.title || "Conversation"}</p>
                            {lastMessage && (
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {lastMessage?.content || "No messages yet"}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <Badge variant="default" className="ml-2">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </ScrollArea>
            </div>

            {/* Messages Panel */}
            <div className="flex-1 flex flex-col">
              {selectedConvo ? (
                <>
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">{selectedConvo.conversations?.title || "Conversation"}</h3>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages?.map((msg: any) => {
                        const isOwn = msg.sender_id === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                              }`}
                            >
                              {!isOwn && (
                                <p className="text-xs font-semibold mb-1">{msg.profiles?.email}</p>
                              )}
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button onClick={handleSend} disabled={!messageText.trim() || sendMessage.isPending}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a conversation to start messaging
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </PageTemplate>
  );
}
