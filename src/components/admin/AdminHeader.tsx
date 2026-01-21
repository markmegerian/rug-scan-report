import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, LayoutDashboard, Shield, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import rugboostLogo from '@/assets/rugboost-logo.svg';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
}

export const AdminHeader = ({ title = 'Platform Admin', subtitle = 'Manage businesses and payouts' }: AdminHeaderProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/admin')} variant="outline" size="sm" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button onClick={() => navigate('/admin/users')} variant="outline" size="sm" className="gap-2">
            Businesses
          </Button>
          <Button onClick={() => navigate('/admin/payouts')} variant="outline" size="sm" className="gap-2">
            Payouts
          </Button>
          <Button onClick={() => navigate('/admin/audit-log')} variant="ghost" size="icon" title="Audit Log">
            <History className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate('/admin/settings')} variant="ghost" size="icon" title="Platform Settings">
            <Settings className="h-4 w-4" />
          </Button>
          <Button onClick={handleSignOut} variant="ghost" size="icon">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
