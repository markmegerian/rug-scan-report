import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, History, BarChart3, DollarSign, Shield, X, Home, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import rugboostLogo from '@/assets/rugboost-logo.svg';

interface MobileNavProps {
  isAdmin?: boolean;
  onSignOut: () => void;
}

const MobileNav = ({ isAdmin = false, onSignOut }: MobileNavProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = () => {
    setOpen(false);
    onSignOut();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3">
            <img src={rugboostLogo} alt="RugBoost" className="h-8 w-8" />
            <SheetTitle className="font-display">RugBoost</SheetTitle>
          </div>
        </SheetHeader>
        
        <nav className="mt-8 flex flex-col gap-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => handleNavigate('/dashboard')}
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => handleNavigate('/history')}
          >
            <History className="h-4 w-4" />
            History
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => handleNavigate('/analytics')}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => handleNavigate('/accounts-receivable')}
          >
            <DollarSign className="h-4 w-4" />
            Accounts Receivable
          </Button>
          
          {isAdmin && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => handleNavigate('/admin')}
            >
              <Shield className="h-4 w-4" />
              Admin Panel
            </Button>
          )}
          
          <Separator className="my-4" />
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => handleNavigate('/settings')}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
