import React from 'react';
import { Camera, CheckCircle, ChevronRight, Image } from 'lucide-react';

const captureSteps = [
  { id: 'overall-front', label: 'Overall Front', captured: true },
  { id: 'overall-back', label: 'Overall Back', captured: true },
  { id: 'edge', label: 'Edge Detail', captured: true },
  { id: 'fringe', label: 'Fringe', captured: false },
  { id: 'issue', label: 'Issue Areas', captured: false },
];

const MockPhotoCapture: React.FC = () => {
  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-2">
          <button className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center">
            <span className="text-muted-foreground text-sm">←</span>
          </button>
          <div>
            <h1 className="font-display text-base font-bold text-foreground">Capture Photos</h1>
            <p className="text-[10px] text-muted-foreground">RUG-001 • Antique Persian</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Progress */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Photo Progress</span>
            <span className="text-xs text-muted-foreground">3 of 5</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-3/5 bg-gradient-to-r from-primary to-accent rounded-full" />
          </div>
        </div>

        {/* Camera Preview */}
        <div className="bg-black rounded-xl aspect-[4/3] relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Camera className="h-12 w-12 text-white/40 mx-auto mb-2" />
              <p className="text-white/60 text-sm">Capture Fringe Detail</p>
            </div>
          </div>
          
          {/* Guide overlay */}
          <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-lg" />
          
          {/* Capture button */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <button className="w-14 h-14 rounded-full bg-white border-4 border-primary flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-primary" />
            </button>
          </div>
        </div>

        {/* Photo Steps */}
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          {captureSteps.map((step, index) => (
            <div 
              key={step.id}
              className={`flex items-center justify-between p-3 ${
                index !== captureSteps.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  step.captured 
                    ? 'bg-green-500/10' 
                    : index === 3 
                      ? 'bg-primary/10' 
                      : 'bg-muted'
                }`}>
                  {step.captured ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Image className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-sm ${
                  step.captured ? 'text-muted-foreground' : 'text-foreground font-medium'
                }`}>
                  {step.label}
                </span>
              </div>
              {!step.captured && index === 3 && (
                <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  Current
                </span>
              )}
              {step.captured && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MockPhotoCapture;
