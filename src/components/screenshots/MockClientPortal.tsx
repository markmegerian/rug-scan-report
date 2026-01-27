import React from 'react';
import { demoEstimates } from '@/data/demoData';
import { CreditCard, CheckCircle, FileText, Shield } from 'lucide-react';

const MockClientPortal: React.FC = () => {
  const selectedTotal = demoEstimates[0].total + demoEstimates[1].total;
  
  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-foreground">Your Rugs</h1>
            <p className="text-[10px] text-muted-foreground">Katherine Morrison</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border border-primary/20 p-4">
          <h2 className="font-display text-sm font-bold text-foreground mb-1">
            Welcome to Your Portal
          </h2>
          <p className="text-xs text-muted-foreground">
            Review your rug inspections and approve services below.
          </p>
        </div>

        {/* Service Selection */}
        {demoEstimates.slice(0, 2).map((estimate, index) => (
          <div key={index} className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  index < 2 ? 'bg-primary border-primary' : 'border-muted-foreground'
                }`}>
                  {index < 2 && <CheckCircle className="h-3 w-3 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{estimate.rugNumber}</p>
                  <p className="text-[10px] text-muted-foreground">{estimate.rugType}</p>
                </div>
              </div>
              <button className="text-primary text-xs flex items-center gap-1">
                <FileText className="h-3 w-3" />
                View Report
              </button>
            </div>
            
            <div className="space-y-1.5 ml-6">
              {estimate.services.slice(0, 2).map((service, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{service.name}</span>
                  <span className="font-medium text-foreground">${service.price.toFixed(0)}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-2 pt-2 border-t border-border ml-6 flex justify-between">
              <span className="text-xs font-medium text-foreground">Subtotal</span>
              <span className="text-sm font-bold text-foreground">${estimate.total.toFixed(0)}</span>
            </div>
          </div>
        ))}

        {/* Total and Payment */}
        <div className="bg-card rounded-lg border-2 border-primary p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-display text-sm font-bold text-foreground">Total Selected</span>
            <span className="text-xl font-bold text-primary">${selectedTotal.toLocaleString()}</span>
          </div>
          
          <button className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2">
            <CreditCard className="h-4 w-4" />
            Proceed to Payment
          </button>
          
          <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-muted-foreground">
            <Shield className="h-3 w-3" />
            Secure payment via Stripe
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockClientPortal;
