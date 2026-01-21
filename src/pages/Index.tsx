import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import rugboostLogo from '@/assets/rugboost-logo.svg';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isClient, isStaff, isAdmin } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // Route based on user role
        if (isAdmin) {
          navigate('/admin');
        } else if (isStaff) {
          navigate('/dashboard');
        } else if (isClient) {
          navigate('/client/dashboard');
        } else {
          // User has no roles yet - might be new staff signup
          // Default to dashboard (they'll set up their account there)
          navigate('/dashboard');
        }
      } else {
        navigate('/auth');
      }
    }
  }, [user, authLoading, isClient, isStaff, isAdmin, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <img src={rugboostLogo} alt="RugBoost" className="h-16 w-16 mx-auto" />
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Loading RugBoost...</p>
      </div>
    </div>
  );
};

export default Index;
