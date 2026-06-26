import { useQuery } from "@tanstack/react-query";
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentNotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const items: any[] = (data as any[]) || [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-4xl">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>Mark all read</Button>
      </header>
      <Card>
        <CardHeader><CardTitle>Recent</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? <p className="text-sm text-muted-foreground">No notifications.</p> : (
            <ul className="space-y-3 text-sm">
              {items.map((n) => (
                <li key={n.id} className={`border-b pb-3 ${!n.is_read ? "bg-muted/30 -mx-2 px-2 rounded" : ""}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-muted-foreground">{n.body}</div>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {n.type && <Badge variant="outline" className="text-xs">{n.type}</Badge>}
                      {!n.is_read && <Button size="sm" variant="ghost" onClick={() => markOne.mutate(n.id)}>Mark read</Button>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
