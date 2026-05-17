import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import { getUserFriendlyError } from "@/lib/errors";

console.info('✝️ ScrollUniversity Institution Context — Christ governs all institutions');

interface Institution {
  id: string;
  name: string;
  slug: string;
  short_name?: string;
  description?: string;
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  plan?: string;
  is_active?: boolean;
}

interface InstitutionMembership {
  id: string;
  institution_id: string;
  role: 'owner' | 'admin' | 'faculty' | 'student';
  status: string;
  institution: Institution;
}

interface InstitutionContextType {
  activeInstitution: Institution | null;
  memberships: InstitutionMembership[];
  activeRole: string | null;
  loading: boolean;
  setActiveInstitution: (institutionId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export const InstitutionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeInstitution, setActiveInstitutionState] = useState<Institution | null>(null);
  const [memberships, setMemberships] = useState<InstitutionMembership[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInstitutionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's profile with current institution
      // Note: Using 'as any' until Supabase types regenerate with current_institution_id column
      const { data: profile } = await supabase
        .from('profiles' as any)
        .select('current_institution_id')
        .eq('id', user.id)
        .maybeSingle();

      // Get all memberships (no JOIN to avoid RLS recursion)
      const { data: rawMemberships, error: membershipsError } = await supabase
        .from('institution_members' as any)
        .select('id, institution_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipsError) throw membershipsError;

      // Fetch institution details separately to avoid policy recursion
      const institutionIds = (rawMemberships || []).map((m: any) => m.institution_id);
      let institutionsById: Record<string, Institution> = {};
      if (institutionIds.length > 0) {
        const { data: institutionsData, error: instError } = await supabase
          .from('institutions' as any)
          .select('id, name, slug, short_name, description, logo_url, primary_color, accent_color, plan, is_active')
          .in('id', institutionIds);
        if (instError) throw instError;
        institutionsById = Object.fromEntries((institutionsData || []).map((i: any) => [i.id, i]));
      }

      const formattedMemberships = (rawMemberships || []).map((m: any) => ({
        ...m,
        institution: institutionsById[m.institution_id] as Institution
      }));

      setMemberships(formattedMemberships);

      // Set active institution
      let active: Institution | null = null;
      let role: string | null = null;

      if ((profile as any)?.current_institution_id) {
        const currentInstitutionId = (profile as any)?.current_institution_id as string;
        const membership = formattedMemberships.find(
          (m: InstitutionMembership) => m.institution_id === currentInstitutionId
        );
        if (membership) {
          active = membership.institution;
          role = membership.role;
        } else {
          const directInstitution = institutionsById[currentInstitutionId] || null;
          if (directInstitution) {
            active = directInstitution;
            role = 'student';
          } else {
            const { data: institutionByProfile } = await supabase
              .from('institutions' as any)
              .select('id, name, slug, short_name, description, logo_url, primary_color, accent_color, plan, is_active')
              .eq('id', currentInstitutionId)
              .maybeSingle();

            if (institutionByProfile) {
              active = institutionByProfile as Institution;
              role = 'student';
            }
          }
        }
      }

      // Fallback to first membership if no current institution
      if (!active && formattedMemberships.length > 0) {
        const firstMembership = formattedMemberships[0];
        active = firstMembership.institution;
        role = firstMembership.role;

        // Update profile with first institution
        await supabase
          .from('profiles' as any)
          .update({ current_institution_id: active.id } as any)
          .eq('id', user.id);
      }

      setActiveInstitutionState(active);
      setActiveRole(role);

      // Final fallback: ensure user is a member of the default ScrollUniversity
      // institution. Uses a SECURITY DEFINER RPC so RLS can't block the lookup
      // for users who haven't been added to any institution yet.
      if (!active) {
        const { data: instId, error: ensureErr } = await supabase
          .rpc('ensure_default_institution_membership' as any);
        if (ensureErr) {
          console.error('ensure_default_institution_membership failed:', ensureErr);
        }
        if (instId) {
          const { data: defaultInst } = await supabase
            .from('institutions' as any)
            .select('id, name, slug, short_name, description, logo_url, primary_color, accent_color, plan, is_active')
            .eq('id', instId as any)
            .maybeSingle();
          if (defaultInst) {
            setActiveInstitutionState(defaultInst as unknown as Institution);
            setActiveRole((r) => r || 'student');
          }
        }
      }
    } catch (error) {
      console.error('Error loading institution data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setActiveInstitution = async (institutionId: string) => {
    if (!user) return;

    try {
      const membership = memberships.find(m => m.institution_id === institutionId);
      if (!membership) {
        throw new Error('You are not a member of this institution');
      }

      // Update profile
      const { error } = await supabase
        .from('profiles' as any)
        .update({ current_institution_id: institutionId } as any)
        .eq('id', user.id);

      if (error) throw error;

      setActiveInstitutionState(membership.institution);
      setActiveRole(membership.role);

      toast({
        title: `Switched to ${membership.institution.name}`,
        description: `Active as ${membership.role}`
      });

      // Reload page to refresh all data with new institution context
      window.location.reload();
    } catch (error: any) {
      console.error('Error switching institution:', error);
      toast({
        title: 'Failed to switch institution',
        description: getUserFriendlyError(error),
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadInstitutionData();
  }, [user?.id]);

  return (
    <InstitutionContext.Provider
      value={{
        activeInstitution,
        memberships,
        activeRole,
        loading,
        setActiveInstitution,
        refetch: loadInstitutionData
      }}
    >
      {children}
    </InstitutionContext.Provider>
  );
};

export const useInstitution = () => {
  const context = useContext(InstitutionContext);
  if (!context) {
    throw new Error('useInstitution must be used within InstitutionProvider');
  }
  return context;
};
