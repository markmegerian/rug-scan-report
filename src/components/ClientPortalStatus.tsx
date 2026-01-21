import React from 'react';
import { Check, Clock, Mail, Key, Eye, ShoppingCart, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ClientPortalStatusProps {
  portalLink: string;
  emailSentAt: string | null;
  emailError: string | null;
  firstAccessedAt: string | null;
  passwordSetAt: string | null;
  hasClientAccount: boolean;
  hasServiceSelections: boolean;
  serviceSelectionsAt: string | null;
  onResendInvite?: () => void;
  isResending?: boolean;
}

interface StatusStepProps {
  label: string;
  icon: React.ReactNode;
  isComplete: boolean;
  timestamp?: string | null;
  error?: string | null;
  isPending?: boolean;
}

const StatusStep: React.FC<StatusStepProps> = ({ 
  label, 
  icon, 
  isComplete, 
  timestamp, 
  error,
  isPending 
}) => {
  return (
    <div className="flex flex-col items-center text-center min-w-[100px]">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors",
          error 
            ? "bg-destructive/10 text-destructive border-2 border-destructive" 
            : isComplete 
              ? "bg-primary/10 text-primary border-2 border-primary" 
              : "bg-muted text-muted-foreground border-2 border-muted-foreground/30"
        )}
      >
        {error ? (
          <AlertCircle className="w-5 h-5" />
        ) : isComplete ? (
          <Check className="w-5 h-5" />
        ) : (
          icon
        )}
      </div>
      <span className={cn(
        "text-sm font-medium",
        error ? "text-destructive" : isComplete ? "text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
      <span className="text-xs text-muted-foreground mt-1">
        {error ? (
          <span className="text-destructive">Failed</span>
        ) : timestamp ? (
          format(new Date(timestamp), 'MMM d, h:mm a')
        ) : isPending ? (
          'Pending'
        ) : (
          'Waiting'
        )}
      </span>
    </div>
  );
};

const Connector: React.FC<{ isComplete: boolean }> = ({ isComplete }) => (
  <div 
    className={cn(
      "flex-1 h-0.5 mx-2 mt-5 min-w-[20px] max-w-[40px]",
      isComplete ? "bg-primary" : "bg-muted-foreground/30"
    )} 
  />
);

const ClientPortalStatus: React.FC<ClientPortalStatusProps> = ({
  portalLink,
  emailSentAt,
  emailError,
  firstAccessedAt,
  passwordSetAt,
  hasClientAccount,
  hasServiceSelections,
  serviceSelectionsAt,
  onResendInvite,
  isResending,
}) => {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalLink);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenPortal = () => {
    window.open(portalLink, '_blank');
  };

  const steps = [
    {
      label: 'Invitation Sent',
      icon: <Mail className="w-5 h-5" />,
      isComplete: !!emailSentAt && !emailError,
      timestamp: emailSentAt,
      error: emailError,
      isPending: !emailSentAt && !emailError,
    },
    {
      label: 'Account Created',
      icon: <Clock className="w-5 h-5" />,
      isComplete: hasClientAccount,
      timestamp: hasClientAccount ? emailSentAt : null, // Account created at same time as invite
      isPending: !hasClientAccount,
    },
    {
      label: 'Password Set',
      icon: <Key className="w-5 h-5" />,
      isComplete: !!passwordSetAt,
      timestamp: passwordSetAt,
      isPending: hasClientAccount && !passwordSetAt,
    },
    {
      label: 'Portal Accessed',
      icon: <Eye className="w-5 h-5" />,
      isComplete: !!firstAccessedAt,
      timestamp: firstAccessedAt,
      isPending: !!passwordSetAt && !firstAccessedAt,
    },
    {
      label: 'Services Approved',
      icon: <ShoppingCart className="w-5 h-5" />,
      isComplete: hasServiceSelections,
      timestamp: serviceSelectionsAt,
      isPending: !!firstAccessedAt && !hasServiceSelections,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Client Portal Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Timeline */}
        <div className="flex items-start justify-between overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.label}>
              <StatusStep {...step} />
              {index < steps.length - 1 && (
                <Connector isComplete={step.isComplete} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error Message */}
        {emailError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            <strong>Email Error:</strong> {emailError}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenPortal}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Portal
          </Button>
          {(emailError || !emailSentAt) && onResendInvite && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onResendInvite}
              disabled={isResending}
            >
              <Mail className="w-4 h-4 mr-2" />
              {isResending ? 'Sending...' : emailError ? 'Retry Send' : 'Send Invitation'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientPortalStatus;
