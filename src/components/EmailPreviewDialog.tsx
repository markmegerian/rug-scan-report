import React, { useState } from 'react';
import { Loader2, Mail, Paperclip, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface RugDetail {
  rugNumber: string;
  rugType: string;
  dimensions: string;
}

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (subject: string, message: string) => Promise<void>;
  clientName: string;
  clientEmail: string;
  jobNumber: string;
  rugDetails: RugDetail[];
  businessName?: string;
  isSending: boolean;
}

const EmailPreviewDialog: React.FC<EmailPreviewDialogProps> = ({
  open,
  onOpenChange,
  onSend,
  clientName,
  clientEmail,
  jobNumber,
  rugDetails,
  businessName = 'Rug Inspection Service',
  isSending,
}) => {
  const defaultSubject = `Rug Inspection Report - Job #${jobNumber}`;
  const defaultMessage = `Dear ${clientName},

Thank you for choosing our services. Please find attached the detailed inspection report for Job #${jobNumber}.

This report includes a comprehensive analysis of ${rugDetails.length} rug${rugDetails.length > 1 ? 's' : ''} with our professional assessment and recommendations.

If you have any questions about this report, please don't hesitate to contact us.

Best regards,
${businessName}`;

  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);

  const handleSend = async () => {
    await onSend(subject, message);
  };

  const resetToDefaults = () => {
    setSubject(defaultSubject);
    setMessage(defaultMessage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Mail className="h-5 w-5 text-primary" />
            Email Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipient Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{clientName}</p>
              <p className="text-sm text-muted-foreground">{clientEmail}</p>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Email message..."
              rows={10}
              className="resize-none font-mono text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              className="text-xs text-muted-foreground"
            >
              Reset to default message
            </Button>
          </div>

          <Separator />

          {/* Attachment Preview */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachment
            </Label>
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Inspection_Report_Job_{jobNumber}.pdf</p>
                <p className="text-xs text-muted-foreground">
                  Complete inspection report with {rugDetails.length} rug{rugDetails.length > 1 ? 's' : ''}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">PDF</Badge>
            </div>
          </div>

          {/* Rug Summary */}
          <div className="space-y-3">
            <Label>Rugs Included</Label>
            <div className="grid gap-2">
              {rugDetails.map((rug, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                >
                  <span className="font-medium">{rug.rugNumber}</span>
                  <span className="text-muted-foreground">{rug.rugType}</span>
                  <span className="text-muted-foreground">{rug.dimensions}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !message.trim()}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailPreviewDialog;
