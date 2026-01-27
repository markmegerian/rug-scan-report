import React from 'react';
import { demoAnalytics } from '@/data/demoData';
import { TrendingUp, DollarSign, Briefcase, Target } from 'lucide-react';

const MockAnalytics: React.FC = () => {
  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-foreground">Analytics</h1>
            <p className="text-[10px] text-muted-foreground">Business Performance</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-lg border border-border p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-3 w-3 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground">Total Jobs</span>
            </div>
            <p className="text-lg font-bold text-foreground">{demoAnalytics.totalJobs}</p>
            <p className="text-[10px] text-green-500 flex items-center gap-0.5">
              <TrendingUp className="h-2.5 w-2.5" />
              +12% this month
            </p>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-3 w-3 text-green-500" />
              </div>
              <span className="text-[10px] text-muted-foreground">Revenue</span>
            </div>
            <p className="text-lg font-bold text-foreground">${(demoAnalytics.totalRevenue / 1000).toFixed(0)}K</p>
            <p className="text-[10px] text-green-500 flex items-center gap-0.5">
              <TrendingUp className="h-2.5 w-2.5" />
              +18% this month
            </p>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-accent/10 flex items-center justify-center">
                <DollarSign className="h-3 w-3 text-accent" />
              </div>
              <span className="text-[10px] text-muted-foreground">Avg Job</span>
            </div>
            <p className="text-lg font-bold text-foreground">${demoAnalytics.avgJobValue}</p>
          </div>
          
          <div className="bg-card rounded-lg border border-border p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-amber-500/10 flex items-center justify-center">
                <Target className="h-3 w-3 text-amber-500" />
              </div>
              <span className="text-[10px] text-muted-foreground">Completion</span>
            </div>
            <p className="text-lg font-bold text-foreground">{demoAnalytics.completionRate}%</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <h2 className="font-display text-sm font-bold text-foreground mb-4">Monthly Revenue</h2>
          <div className="flex items-end justify-between h-24 gap-1">
            {demoAnalytics.monthlyData.map((month, i) => {
              const height = (month.revenue / 35000) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[8px] text-muted-foreground">{month.month.slice(0, 1)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jobs Chart */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <h2 className="font-display text-sm font-bold text-foreground mb-4">Jobs Completed</h2>
          <div className="flex items-end justify-between h-20 gap-1">
            {demoAnalytics.monthlyData.map((month, i) => {
              const height = (month.jobs / 100) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-gradient-to-t from-accent to-accent/60 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[8px] text-muted-foreground">{month.month.slice(0, 1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockAnalytics;
