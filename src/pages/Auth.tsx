import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Logo } from "@/components/brand/Logo";
import { getUserFriendlyError } from "@/lib/errors";
import { onboardingRoutes } from "@/lib/onboardingRoutes";


// Whitelist internal redirects only — prevents open-redirect via ?redirect=https://evil.com
const safeRedirect = (raw: string | null): string => {
  if (!raw) return onboardingRoutes.studentDashboard;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return onboardingRoutes.studentDashboard;
};

export default function Auth() {
  const [searchParams] = useSearchParams();
  const verified = searchParams.get('verified') === 'true';
  const resetDone = searchParams.get('reset') === 'true';
  const initialTab = (verified || searchParams.get('tab') !== 'signup' ? 'signin' : 'signup') as 'signin' | 'signup';
  const redirect = safeRedirect(searchParams.get('redirect'));

  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [resetEmail, setResetEmail] = useState('');
  const [showReset, setShowReset] = useState(false);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // If already signed in, send the user where they wanted to go
  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, user, redirect, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let loginEmail = email.trim();
      // Resolve student ID code (e.g. SU2026001) to institutional email
      if (!loginEmail.includes('@')) {
        const { data, error } = await supabase
          .from('students')
          .select('institutional_email')
          .ilike('student_id_code', loginEmail)
          .maybeSingle();
        if (error || !data?.institutional_email) {
          toast({
            title: 'Sign in failed',
            description: 'No account found for that student ID.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        loginEmail = data.institutional_email;
      }
      await signIn(loginEmail, password);
      navigate(redirect);
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password);
      navigate(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error('Sign up error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast({
        title: 'Reset email sent',
        description: 'Check your email for the password reset link',
      });
      setShowReset(false);
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: getUserFriendlyError(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-up">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo size="lg" to="/" />
        </div>

        <Card className="elevation-2">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-serif">
              {showReset ? 'Reset Password' : tab === 'signin' ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {showReset 
                ? 'Enter your email to receive a reset link' 
                : 'Christ-Centered Education for Kingdom Leaders'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verified && (
              <Alert className="mb-4 border-success/30 bg-success/10 text-success-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-foreground">
                  Your email has been verified. You can sign in now.
                </AlertDescription>
              </Alert>
            )}

            {resetDone && (
              <Alert className="mb-4 border-success/30 bg-success/10 text-success-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-foreground">
                  Password updated. Sign in with your new password.
                </AlertDescription>
              </Alert>
            )}

            {showReset ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Send Reset Link
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowReset(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as 'signin' | 'signup')} className="w-full">

                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Institutional Email or Student ID</Label>
                      <Input
                        id="signin-email"
                        type="text"
                        placeholder="you@scrolluniversity.org or SU2026001"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="link" 
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => setShowReset(true)}
                    >
                      Forgot password?
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {loading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Scripture */}
        <div className="text-center px-6">
          <p className="text-xs italic text-muted-foreground font-serif leading-relaxed">
            "The fear of the Lord is the beginning of wisdom, and knowledge of the Holy One is understanding." — Proverbs 9:10
          </p>
        </div>

        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
