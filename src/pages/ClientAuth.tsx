import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import rugboostLogo from '@/assets/rugboost-logo.svg';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

const ClientAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [autoLoginLoading, setAutoLoginLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('Rug Cleaning');

  // Check for invited email from access token
  useEffect(() => {
    const checkInvitation = async () => {
      if (!accessToken) {
        setAutoLoginLoading(false);
        return;
      }

      try {
        // Use secure RPC function to validate token and get invitation details
        const { data: tokenData, error: tokenError } = await supabase
          .rpc('validate_access_token', { _token: accessToken })
          .single();

        if (!tokenError && tokenData) {
          if (tokenData.invited_email) {
            setInvitedEmail(tokenData.invited_email);
            setLoginEmail(tokenData.invited_email);
            setSignupEmail(tokenData.invited_email);
          }

          // Get business name for display
          if (tokenData.staff_user_id) {
            const { data: brandingData } = await supabase
              .from('profiles')
              .select('business_name')
              .eq('user_id', tokenData.staff_user_id)
              .single();
            
            if (brandingData?.business_name) {
              setBusinessName(brandingData.business_name);
            }
          }
        }
      } catch (error) {
        console.error('Error checking invitation:', error);
      } finally {
        setAutoLoginLoading(false);
      }
    };

    checkInvitation();
  }, [accessToken]);

  // If user is already logged in, redirect to client portal
  useEffect(() => {
    if (!authLoading && user && accessToken) {
      // Check if user has client role and link to job
      linkClientToJob(user.id, accessToken);
    }
  }, [user, authLoading, accessToken]);

  const linkClientToJob = async (userId: string, token: string) => {
    try {
      // Check if user already has a client account
      const { data: existingClient, error: clientError } = await supabase
        .from('client_accounts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      let clientId = existingClient?.id;

      // Create client account if doesn't exist
      if (!clientId) {
        const { data: newClient, error: createError } = await supabase
          .from('client_accounts')
          .insert({
            user_id: userId,
            email: user?.email || '',
            full_name: user?.user_metadata?.full_name || '',
          })
          .select('id')
          .single();

        if (createError) throw createError;
        clientId = newClient.id;

        // Also add client role
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'client' })
          .select();
      }

      // Link client to job via access token
      const { error: linkError } = await supabase
        .from('client_job_access')
        .update({ client_id: clientId })
        .eq('access_token', token)
        .is('client_id', null);

      if (linkError && linkError.code !== 'PGRST116') {
        console.error('Link error:', linkError);
      }

      // Redirect to client portal
      navigate(`/client/${token}`);
    } catch (error) {
      console.error('Error linking client to job:', error);
      toast.error('Failed to access portal');
    }
  };

  const validateField = (field: string, value: string) => {
    try {
      if (field === 'email' || field === 'loginEmail' || field === 'signupEmail') {
        emailSchema.parse(value);
      } else if (field === 'password' || field === 'loginPassword' || field === 'signupPassword') {
        passwordSchema.parse(value);
      } else if (field === 'name' || field === 'signupName') {
        nameSchema.parse(value);
      }
      setErrors(prev => ({ ...prev, [field]: '' }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: e.errors[0].message }));
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailValid = validateField('loginEmail', loginEmail);
    const passwordValid = validateField('loginPassword', loginPassword);
    
    if (!emailValid || !passwordValid) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      toast.success('Logged in successfully!');
      
      if (accessToken) {
        // Will be handled by the useEffect
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to log in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailValid = validateField('signupEmail', signupEmail);
    const passwordValid = validateField('signupPassword', signupPassword);
    const nameValid = validateField('signupName', signupName);
    
    if (!emailValid || !passwordValid || !nameValid) return;

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}${accessToken ? `/client/auth?token=${accessToken}` : '/'}`;
      
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupName,
          },
        },
      });

      if (error) throw error;

      toast.success('Account created successfully!');
      
      if (accessToken) {
        // Will be handled by the useEffect
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.message?.includes('already registered')) {
        toast.error('This email is already registered. Please log in instead.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || autoLoginLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={rugboostLogo} alt="Logo" className="h-16 w-16 mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">{businessName}</h1>
          <p className="text-muted-foreground text-center mt-2">
            Sign in to view your rug inspection report and approve services
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Create an account or sign in to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        onBlur={() => validateField('loginEmail', loginEmail)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.loginEmail && (
                      <p className="text-sm text-destructive">{errors.loginEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onBlur={() => validateField('loginPassword', loginPassword)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.loginPassword && (
                      <p className="text-sm text-destructive">{errors.loginPassword}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        onBlur={() => validateField('signupName', signupName)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.signupName && (
                      <p className="text-sm text-destructive">{errors.signupName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        onBlur={() => validateField('signupEmail', signupEmail)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.signupEmail && (
                      <p className="text-sm text-destructive">{errors.signupEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        onBlur={() => validateField('signupPassword', signupPassword)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.signupPassword && (
                      <p className="text-sm text-destructive">{errors.signupPassword}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default ClientAuth;
