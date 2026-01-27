import React from 'react';
import { demoJobs } from '@/data/demoData';
import { PlayCircle, Clock, CheckCircle, Plus, Search, Bell } from 'lucide-react';

const statusConfig = {
  active: { icon: PlayCircle, color: 'bg-blue-500', textColor: 'text-blue-600' },
  'in-progress': { icon: Clock, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  completed: { icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-600' },
};

const MockDashboard: React.FC = () => {
  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-foreground">RugBoost</h1>
              <p className="text-[10px] text-muted-foreground">Job Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-7 px-3 bg-primary text-primary-foreground rounded-md text-xs font-medium flex items-center gap-1">
              <Plus className="h-3 w-3" />
              New Job
            </button>
            <button className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="p-4">
        <div className="bg-card rounded-lg border border-border p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input 
                placeholder="Search jobs..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-input rounded-md"
              />
            </div>
            <select className="h-8 px-2 text-xs bg-background border border-input rounded-md">
              <option>All Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Job Cards */}
      <div className="px-4 space-y-3">
        {demoJobs.slice(0, 4).map((job) => {
          const status = statusConfig[job.status];
          const StatusIcon = status.icon;
          
          return (
            <div 
              key={job.id}
              className="bg-card rounded-lg border border-border p-3 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm text-foreground">{job.client_name}</p>
                  <p className="text-[10px] text-muted-foreground">{job.job_number}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.textColor} bg-opacity-10`}
                  style={{ backgroundColor: `${status.color}20` }}
                >
                  <StatusIcon className="h-3 w-3" />
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('-', ' ')}
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{job.rug_count} rug{job.rug_count !== 1 ? 's' : ''}</span>
                <span>Today</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MockDashboard;
