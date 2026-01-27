import React from 'react';
import { demoEstimates, calculateGrandTotal } from '@/data/demoData';
import { DollarSign, CheckCircle, Lock } from 'lucide-react';

const MockEstimate: React.FC = () => {
  const grandTotal = calculateGrandTotal(demoEstimates);
  
  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center">
              <span className="text-muted-foreground text-sm">←</span>
            </button>
            <div>
              <h1 className="font-display text-base font-bold text-foreground">Estimate Review</h1>
              <p className="text-[10px] text-muted-foreground">3 rugs • Morrison Job</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-primary to-accent rounded-lg p-4 text-white">
          <p className="text-xs opacity-90 mb-1">Total Estimate</p>
          <p className="text-2xl font-bold font-display">${grandTotal.toLocaleString()}</p>
          <p className="text-xs opacity-75 mt-1">3 rugs • 242 sq ft</p>
        </div>

        {/* Rug Estimates */}
        {demoEstimates.slice(0, 2).map((estimate, index) => (
          <div key={index} className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-sm text-foreground">{estimate.rugNumber}</p>
                <p className="text-[10px] text-muted-foreground">{estimate.rugType}</p>
                <p className="text-[10px] text-muted-foreground">{estimate.dimensions}</p>
              </div>
              <p className="font-bold text-sm text-foreground">${estimate.total.toFixed(0)}</p>
            </div>
            
            <div className="space-y-2">
              {estimate.services.slice(0, 3).map((service, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {service.isRequired ? (
                      <Lock className="h-3 w-3 text-primary" />
                    ) : (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                    <span className="text-xs text-muted-foreground">{service.name}</span>
                    {service.isRequired && (
                      <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Required</span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-foreground">${service.price.toFixed(0)}</span>
                </div>
              ))}
              {estimate.services.length > 3 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{estimate.services.length - 3} more services
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Approve Button */}
        <button className="w-full h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Approve Estimate
        </button>
      </div>
    </div>
  );
};

export default MockEstimate;
