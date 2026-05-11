import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTemplate } from "@/components/layout/PageTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Building2, Users, BookOpen, Settings, DollarSign, BarChart } from "lucide-react";
import { getUserFriendlyError } from "@/lib/errors";

console.info("✝️ SuperAdmin — Christ governs authority");

export default function SuperAdmin() {
  const queryClient = useQueryClient();
  const [newInstitution, setNewInstitution] = useState({ name: "", slug: "" });

  const { data: institutions } = useQuery({
    queryKey: ["all-institutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [institutions, users, courses, enrollments] = await Promise.all([
        supabase.from("institutions").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
      ]);

      return {
        institutions: institutions.count || 0,
        users: users.count || 0,
        courses: courses.count || 0,
        enrollments: enrollments.count || 0,
      };
    },
  });

  const createInstitution = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("institutions")
        .insert({ 
          name: newInstitution.name, 
          slug: newInstitution.slug,
          is_active: true 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-institutions"] });
      setNewInstitution({ name: "", slug: "" });
      toast({ title: "✅ Institution created!" });
    },
    onError: (error: any) => {
      toast({ title: "Creation failed", description: getUserFriendlyError(error), variant: "destructive" });
    },
  });

  const toggleInstitution = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("institutions")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-institutions"] });
      toast({ title: "✅ Institution status updated!" });
    },
  });

  return (
    <PageTemplate title="SuperAdmin Console" description="Manage the entire platform">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="institutions">Institutions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Institutions</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.institutions || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.users || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.courses || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.enrollments || 0}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Institutions Tab */}
        <TabsContent value="institutions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Institution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Institution Name</Label>
                  <Input
                    value={newInstitution.name}
                    onChange={(e) => setNewInstitution({ ...newInstitution, name: e.target.value })}
                    placeholder="e.g., Divine Bible College"
                  />
                </div>
                <div>
                  <Label>Slug (URL)</Label>
                  <Input
                    value={newInstitution.slug}
                    onChange={(e) => setNewInstitution({ ...newInstitution, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="e.g., divine-bible-college"
                  />
                </div>
              </div>
              <Button 
                onClick={() => createInstitution.mutate()} 
                disabled={!newInstitution.name || !newInstitution.slug || createInstitution.isPending}
              >
                Create Institution
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Institutions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {institutions?.map((inst: any) => (
                  <div key={inst.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{inst.name}</h3>
                      <p className="text-sm text-muted-foreground">{inst.slug}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={inst.is_active ? "default" : "secondary"}>
                        {inst.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleInstitution.mutate({ id: inst.id, isActive: inst.is_active })}
                      >
                        {inst.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Use the Admin → Users console for individual record management. Bulk tooling is governed under the SUYAS audit pipeline.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Global Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Platform-wide settings are managed through governed migrations to preserve auditability. Contact the Registrar Office to propose a change.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageTemplate>
  );
}
