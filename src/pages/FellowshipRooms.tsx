import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Video, MessageCircle, Calendar, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

console.info("✝️ Fellowship Rooms — Christ governs community");

export default function FellowshipRooms() {
  const { user } = useAuth();

  // Fetch fellowship rooms from database
  const { data: rooms, isLoading } = useQuery({
    queryKey: ['fellowship-rooms'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_institution_id')
        .eq('id', user?.id)
        .single();

      const { data, error } = await supabase
        .from('fellowship_rooms')
        .select('*')
        .eq('institution_id', profile?.current_institution_id)
        .eq('is_active', true)
        .order('current_count', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const handleJoinRoom = async (_roomId: string) => {
    toast.info('Fellowship rooms are coming soon', {
      description: 'Live room joining is not yet available.'
    });
  };

  if (isLoading) {
    return (
      <PageTemplate title="Fellowship Rooms" description="Connect with believers in virtual rooms">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="Fellowship Rooms" description="Connect with believers in virtual rooms">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Rooms Grid */}
        {!rooms || rooms.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Fellowship Rooms Available</h3>
            <p className="text-muted-foreground">
              Check back later for active fellowship rooms in your institution.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{room.name}</CardTitle>
                      {room.current_count >= (room.max_capacity || 100) ? (
                        <Badge variant="destructive" className="mt-2">
                          Full
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="mt-2">
                          {room.current_count || 0}/{room.max_capacity || 100}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {room.description || 'A place for fellowship and connection'}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{room.current_count || 0} members</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleJoinRoom(room.id)}
                      disabled
                      title="Launching with the next release"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chat
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => handleJoinRoom(room.id)}
                      disabled
                      title="Launching with the next release"
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Join Room
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
