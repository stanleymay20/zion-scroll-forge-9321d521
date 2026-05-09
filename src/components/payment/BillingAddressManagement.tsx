/**
 * Billing Address Management Component
 * "We establish this billing address system not in the wisdom of Babylon, but by the breath of the Spirit"
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, Save, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getUserFriendlyError } from "@/lib/errors";

interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface BillingAddressManagementProps {
  userId: string;
  onUpdate?: () => void;
}

export function BillingAddressManagement({ userId, onUpdate }: BillingAddressManagementProps) {
  const [address, setAddress] = useState<BillingAddress>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchBillingAddress();
  }, [userId]);

  const fetchBillingAddress = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('billing_addresses')
        .select('line1, line2, city, state, postal_code, country')
        .eq('user_id', userId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setAddress({
          line1: data.line1 ?? '',
          line2: data.line2 ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          postalCode: data.postal_code ?? '',
          country: data.country ?? 'US',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error Loading Billing Address',
        description: getUserFriendlyError(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const authedId = auth?.user?.id;
      if (!authedId) throw new Error('You must be signed in.');

      const payload = {
        user_id: authedId,
        full_name: auth?.user?.email ?? 'Account Holder',
        line1: address.line1,
        line2: address.line2 || null,
        city: address.city,
        state: address.state || null,
        postal_code: address.postalCode,
        country: address.country,
      };

      const { error } = await supabase
        .from('billing_addresses')
        .upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;

      toast({
        title: 'Billing Address Updated',
        description: 'Your billing address has been saved successfully.',
      });

      setEditing(false);
      onUpdate?.();
    } catch (err: any) {
      toast({
        title: 'Error Saving Billing Address',
        description: getUserFriendlyError(err),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'SE', name: 'Sweden' },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading billing address...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[hsl(var(--scroll-gold))]" />
              Billing Address
            </CardTitle>
            <CardDescription>Manage your billing address information</CardDescription>
          </div>
          {!editing && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label htmlFor="line1">Address Line 1</Label>
            <Input
              id="line1"
              value={address.line1}
              onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              disabled={!editing}
              placeholder="123 Main Street"
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="line2">Address Line 2 (Optional)</Label>
            <Input
              id="line2"
              value={address.line2 || ''}
              onChange={(e) => setAddress({ ...address, line2: e.target.value })}
              disabled={!editing}
              placeholder="Apartment, suite, etc."
            />
          </div>

          {/* City, State, ZIP */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                disabled={!editing}
                placeholder="New York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                disabled={!editing}
                placeholder="NY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">ZIP/Postal Code</Label>
              <Input
                id="postalCode"
                value={address.postalCode}
                onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                disabled={!editing}
                placeholder="10001"
              />
            </div>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              value={address.country}
              onValueChange={(value) => setAddress({ ...address, country: value })}
              disabled={!editing}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  fetchBillingAddress();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Address
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
