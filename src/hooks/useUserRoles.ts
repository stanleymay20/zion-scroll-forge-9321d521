import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'superadmin' | 'faculty' | 'student' | 'moderator' | 'user' | 'registrar' | 'librarian' | 'career_advisor';

interface UseUserRolesReturn {
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isFaculty: boolean;
  isStudent: boolean;
  isSuperAdmin: boolean;
  refetch: () => Promise<void>;
}

export const useUserRoles = (): UseUserRolesReturn => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    if (!user?.id) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        setRoles(['student']); // Default to student on error
      } else {
        const userRoles = data?.map(r => r.role as AppRole) || [];
        setRoles(userRoles.length > 0 ? userRoles : ['student']);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setRoles(['student']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [user?.id]);

  const hasRole = (role: AppRole): boolean => roles.includes(role);

  return {
    roles,
    loading,
    hasRole,
    isAdmin: roles.includes('admin') || roles.includes('superadmin'),
    isFaculty: roles.includes('faculty'),
    isStudent: roles.includes('student'),
    isSuperAdmin: roles.includes('superadmin'),
    refetch: fetchRoles,
  };
};
