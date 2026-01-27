import React from 'react';
import { demoRugs } from '@/data/demoData';
import { FileText, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';

const MockAnalysisReport: React.FC = () => {
  const rug = demoRugs[0]; // Antique Persian Tabriz
  
  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-2">
          <button className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center">
            <span className="text-muted-foreground text-sm">←</span>
          </button>
          <div>
            <h1 className="font-display text-base font-bold text-foreground">{rug.rug_number}</h1>
            <p className="text-[10px] text-muted-foreground">{rug.rug_type}</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* AI Analysis Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">AI-Powered Analysis</span>
        </div>

        {/* At-a-Glance Card */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <h2 className="font-display text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            At-a-Glance
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium text-foreground">{rug.rug_type}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Dimensions:</span>
              <span className="font-medium text-foreground">{rug.width}' × {rug.length}'</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Age:</span>
              <span className="font-medium text-foreground">Circa 1920s</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Origin:</span>
              <span className="font-medium text-foreground">Tabriz, Iran</span>
            </div>
          </div>
        </div>

        {/* Condition Assessment */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <h2 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Condition: Very Good
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This exquisite antique displays exceptional craftsmanship with vibrant traditional indigo, madder red, and ivory tones.
          </p>
        </div>

        {/* Issues Identified */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <h2 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Issues Identified
          </h2>
          <ul className="space-y-2">
            {[
              'Light surface soiling in high-traffic areas',
              'Minor fringe deterioration (3 inches)',
              'Two small moth nibbles requiring reweaving',
            ].map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-amber-500 mt-0.5">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MockAnalysisReport;
