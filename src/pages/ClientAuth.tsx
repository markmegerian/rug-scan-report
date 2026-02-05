import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, Mail, Lock, User, KeyRound, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import rugboostLogo from '@/assets/rugboost-logo.svg';
import { z } from 'zod';
import { 
  checkLoginAllowed, 
  recordFailedAttempt, 
  clearAttempts, 
  formatRemainingTime 
} from '@/lib/authRateLimiter';

const emailSchema = z.string().email('Please enter a valid email address');
// Enforce strong password requirements
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number');

const ClientAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accessToken = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('Rug Cleaning');
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Brute-force protection state
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState<NodeJS.Timeout | null>(null);

  // Check for invited email from access token and determine flow
  useEffect(() => {
    const checkInvitation = async () => {
      if (!accessToken) {
        setCheckingInvite(false);
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
            
            // NEW: For invited clients, show password setup directly instead of login
            // The user was already created by the invite-client edge function
            setShowPasswordSetup(true);
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
        setCheckingInvite(false);
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
      // SECURITY: Validate the token and verify email matches before linking
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('validate_access_token', { _token: token })
        .single();

      if (tokenError || !tokenData) {
        toast.error('Invalid or expired access link');
        return;
      }

      // SECURITY: Verify the user's email matches the invited email
      if (tokenData.invited_email && user?.email) {
        const normalizedInvitedEmail = tokenData.invited_email.toLowerCase().trim();
        const normalizedUserEmail = user.email.toLowerCase().trim();
        
        if (normalizedInvitedEmail !== normalizedUserEmail) {
          toast.error('This access link was sent to a different email address');
          console.error('Email mismatch:', { invited: normalizedInvitedEmail, user: normalizedUserEmail });
          return;
        }
      }

      // Check if user already has a client account
      const { data: existingClient } = await supabase
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
      if (field === 'email' || field === 'loginEmail') {
        emailSchema.parse(value);
      } else if (field === 'password' || field === 'loginPassword' || field === 'newPassword') {
        passwordSchema.parse(value);
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

  // Check lockout status on mount and when email changes
  useEffect(() => {
    if (loginEmail) {
      const status = checkLoginAllowed(loginEmail);
      if (!status.allowed) {
        setLockoutRemaining(status.remainingSeconds);
        startLockoutTimer();
      }
    }
    return () => {
      if (lockoutTimer) clearInterval(lockoutTimer);
    };
  }, [loginEmail]);

  const startLockoutTimer = () => {
    if (lockoutTimer) clearInterval(lockoutTimer);
    
    const timer = setInterval(() => {
      setLockoutRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setLockoutTimer(timer);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check brute-force lockout
    const lockoutStatus = checkLoginAllowed(loginEmail);
    if (!lockoutStatus.allowed) {
      setLockoutRemaining(lockoutStatus.remainingSeconds);
      startLockoutTimer();
      toast.error(`Too many failed attempts. Please wait ${formatRemainingTime(lockoutStatus.remainingSeconds)}.`);
      return;
    }
    
    const emailValid = validateField('loginEmail', loginEmail);
    const passwordValid = validateField('loginPassword', loginPassword);
    
    if (!emailValid || !passwordValid) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        // Record failed attempt and apply exponential backoff
        const { lockoutSeconds, failedAttempts } = recordFailedAttempt(loginEmail);
        
        console.log(`[Security] Failed login attempt #${failedAttempts} for: ${loginEmail.substring(0, 3)}***`);
        
        if (lockoutSeconds > 0) {
          setLockoutRemaining(lockoutSeconds);
          startLockoutTimer();
          toast.error(`Incorrect credentials. Please wait ${formatRemainingTime(lockoutSeconds)} before trying again.`);
        } else {
          toast.error(error.message || 'Failed to log in');
        }
        return;
      }

      // Clear lockout on successful login
      clearAttempts(loginEmail);
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

  // Handle first-time password setup for invited clients
  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password
    const passwordValid = validateField('newPassword', newPassword);
    if (!passwordValid) return;
    
    // Check passwords match
    if (newPassword !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return;
    }

    if (!invitedEmail) {
      toast.error('Unable to set up account. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Call edge function to complete client registration with their chosen password
      const { data, error } = await supabase.functions.invoke('complete-client-registration', {
        body: {
          accessToken,
          email: invitedEmail,
          password: newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Now sign in the user with their new password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitedEmail,
        password: newPassword,
      });

      if (signInError) throw signInError;

      // Track password setup
      await supabase.rpc('update_client_access_tracking', {
        _access_token: accessToken!,
        _first_accessed: true,
        _password_set: true,
      });

      toast.success('Account setup complete!');
      navigate(`/client/${accessToken}`);
    } catch (error: any) {
      console.error('Password setup error:', error);
      toast.error(error.message || 'Failed to set up account');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || checkingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show password setup for new invited clients
  if (showPasswordSetup && invitedEmail && accessToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img src={rugboostLogo} alt="Logo" className="h-16 w-16 mb-4" />
            <h1 className="font-display text-2xl font-bold text-foreground">{businessName}</h1>
            <p className="text-muted-foreground text-center mt-2">
              Create your password to access your rug inspection
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Set Up Your Account
              </CardTitle>
              <CardDescription>
                Choose a secure password to access your inspection report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={invitedEmail}
                      disabled
                      className="pl-10 bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is the email where your invitation was sent
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Create Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onBlur={() => validateField('newPassword', newPassword)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-sm text-destructive">{errors.newPassword}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Minimum 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up account...
                    </>
                  ) : (
                    'Complete Setup & View Report'
                  )}
                </Button>
              </form>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-center text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    onClick={() => setShowPasswordSetup(false)}
                    className="text-primary hover:underline"
                  >
                    Sign in instead
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-4">
            By continuing, you agree to our{' '}
            <Link to="/terms-of-service" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  // Show login form for returning clients
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={rugboostLogo} alt="Logo" className="h-16 w-16 mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground">{businessName}</h1>
          <p className="text-muted-foreground text-center mt-2">
            Sign in to view your rug inspection report
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in with your email and password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lockoutRemaining > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Too many failed attempts. Please wait {formatRemainingTime(lockoutRemaining)} before trying again.
                </AlertDescription>
              </Alert>
            )}
            
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

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || lockoutRemaining > 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : lockoutRemaining > 0 ? (
                  `Wait ${formatRemainingTime(lockoutRemaining)}`
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {accessToken && invitedEmail && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-center text-muted-foreground">
                  First time here?{' '}
                  <button
                    onClick={() => setShowPasswordSetup(true)}
                    className="text-primary hover:underline"
                  >
                    Set up your account
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          By continuing, you agree to our{' '}
          <Link to="/terms-of-service" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default ClientAuth;
