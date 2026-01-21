import React from 'react';
import { CheckCircle, Clock, Package, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

interface ServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority?: 'high' | 'medium' | 'low';
}

interface RugWorkOrder {
  rugNumber: string;
  rugType: string;
  dimensions: string;
  services: ServiceItem[];
  total: number;
}

interface PaymentInfo {
  id: string;
  status: string;
  amount: number;
  paidAt: string | null;
}

interface WorkOrderCardProps {
  rugs: RugWorkOrder[];
  payment: PaymentInfo | null;
  clientApprovedAt: string | null;
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

const WorkOrderCard: React.FC<WorkOrderCardProps> = ({ rugs, payment, clientApprovedAt }) => {
  const totalAmount = rugs.reduce((sum, rug) => sum + rug.total, 0);
  const totalServices = rugs.reduce((sum, rug) => sum + rug.services.length, 0);
  
  const isPaid = payment?.status === 'completed';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Work Order
          </CardTitle>
          <Badge 
            variant={isPaid ? "default" : "secondary"}
            className={isPaid ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isPaid ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Paid & Approved
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Awaiting Payment
              </>
            )}
          </Badge>
        </div>
        {clientApprovedAt && (
          <p className="text-xs text-muted-foreground">
            Client approved on {format(new Date(clientApprovedAt), 'MMM d, yyyy \'at\' h:mm a')}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background rounded-lg p-3 text-center border">
            <div className="text-2xl font-bold text-primary">{rugs.length}</div>
            <div className="text-xs text-muted-foreground">Rugs</div>
          </div>
          <div className="bg-background rounded-lg p-3 text-center border">
            <div className="text-2xl font-bold text-primary">{totalServices}</div>
            <div className="text-xs text-muted-foreground">Services</div>
          </div>
          <div className="bg-background rounded-lg p-3 text-center border">
            <div className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        <Separator />

        {/* Rug Services Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Services to Complete
          </h4>
          
          {rugs.map((rug, index) => (
            <div key={index} className="bg-background rounded-lg p-3 border space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{rug.rugNumber}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    {rug.rugType} • {rug.dimensions}
                  </span>
                </div>
                <span className="font-semibold text-green-600">
                  ${rug.total.toFixed(2)}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {rug.services.map((service) => (
                  <Badge 
                    key={service.id} 
                    variant="outline"
                    className={service.priority ? PRIORITY_COLORS[service.priority] : ''}
                  >
                    {service.name}
                    {service.quantity > 1 && ` ×${service.quantity}`}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Payment Info */}
        {payment && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment Status</span>
              <div className="flex items-center gap-2">
                {isPaid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">
                      Paid ${(payment.amount / 100).toFixed(2)}
                    </span>
                    {payment.paidAt && (
                      <span className="text-muted-foreground">
                        on {format(new Date(payment.paidAt), 'MMM d')}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-600 font-medium">Pending</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkOrderCard;
