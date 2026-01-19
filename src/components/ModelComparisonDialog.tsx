import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Crown, Clock, DollarSign, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ModelResult {
  model: string;
  report: string;
  imageAnnotations: any[];
  processingTimeMs: number;
  status: 'pending' | 'running' | 'complete' | 'error';
  error?: string;
}

interface ModelComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rug: {
    id: string;
    rug_number: string;
    rug_type: string;
    length?: number | null;
    width?: number | null;
    notes?: string | null;
    photo_urls?: string[] | null;
  };
  clientName: string;
  userId?: string;
  onSelectModel?: (model: string, report: string, annotations: any[]) => void;
}

const MODELS = [
  { 
    id: 'google/gemini-2.5-pro', 
    name: 'Gemini Pro', 
    icon: Crown, 
    description: 'Most detailed analysis, best for complex damage',
    color: 'text-amber-500'
  },
  { 
    id: 'google/gemini-2.5-flash', 
    name: 'Gemini Flash', 
    icon: Zap, 
    description: 'Faster & cheaper, great for standard rugs',
    color: 'text-blue-500'
  }
];

export const ModelComparisonDialog: React.FC<ModelComparisonDialogProps> = ({
  open,
  onOpenChange,
  rug,
  clientName,
  userId,
  onSelectModel
}) => {
  const [results, setResults] = useState<ModelResult[]>([
    { model: 'google/gemini-2.5-pro', report: '', imageAnnotations: [], processingTimeMs: 0, status: 'pending' },
    { model: 'google/gemini-2.5-flash', report: '', imageAnnotations: [], processingTimeMs: 0, status: 'pending' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runComparison = async () => {
    setIsRunning(true);
    setHasRun(true);
    
    // Reset results
    setResults(prev => prev.map(r => ({ ...r, status: 'running' as const, report: '', processingTimeMs: 0, error: undefined })));

    const runModel = async (modelId: string, index: number) => {
      try {
        const { data, error } = await supabase.functions.invoke('analyze-rug', {
          body: {
            photos: rug.photo_urls || [],
            rugInfo: {
              clientName,
              rugNumber: rug.rug_number,
              rugType: rug.rug_type,
              length: rug.length?.toString() || '',
              width: rug.width?.toString() || '',
              notes: rug.notes || ''
            },
            userId,
            model: modelId
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setResults(prev => prev.map((r, i) => 
          i === index ? {
            ...r,
            report: data.report,
            imageAnnotations: data.imageAnnotations || [],
            processingTimeMs: data.processingTimeMs,
            status: 'complete' as const
          } : r
        ));
      } catch (error) {
        setResults(prev => prev.map((r, i) => 
          i === index ? {
            ...r,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Analysis failed'
          } : r
        ));
      }
    };

    // Run both models in parallel
    await Promise.all([
      runModel('google/gemini-2.5-pro', 0),
      runModel('google/gemini-2.5-flash', 1)
    ]);

    setIsRunning(false);
  };

  const handleSelectModel = (result: ModelResult) => {
    if (result.status !== 'complete' || !onSelectModel) return;
    onSelectModel(result.model, result.report, result.imageAnnotations);
    toast.success(`Using ${result.model.includes('flash') ? 'Flash' : 'Pro'} analysis`);
    onOpenChange(false);
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Estimate cost (relative comparison, not actual pricing)
  const estimateCost = (model: string, timeMs: number) => {
    const isFlash = model.includes('flash');
    // Flash is roughly 60-70% cheaper
    return isFlash ? '$' : '$$$';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Compare AI Models for {rug.rug_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!hasRun && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Run both AI models on this rug to compare speed, quality, and cost.
              </p>
              <Button onClick={runComparison} size="lg" className="gap-2">
                <Zap className="h-4 w-4" />
                Start Comparison
              </Button>
            </div>
          )}

          {hasRun && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODELS.map((modelConfig, index) => {
                const result = results[index];
                const Icon = modelConfig.icon;
                
                return (
                  <Card key={modelConfig.id} className="relative">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${modelConfig.color}`} />
                          <span className="text-base">{modelConfig.name}</span>
                        </div>
                        {result.status === 'running' && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {result.status === 'complete' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{modelConfig.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.status === 'running' && (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                            <p className="text-sm text-muted-foreground">Analyzing...</p>
                          </div>
                        </div>
                      )}

                      {result.status === 'error' && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                          <p className="text-sm text-destructive">{result.error}</p>
                        </div>
                      )}

                      {result.status === 'complete' && (
                        <>
                          {/* Metrics */}
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(result.processingTimeMs)}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                              <DollarSign className="h-3 w-3" />
                              {estimateCost(result.model, result.processingTimeMs)}
                            </Badge>
                            <Badge variant="outline">
                              {result.imageAnnotations.reduce((acc, pa) => acc + (pa.annotations?.length || 0), 0)} markers
                            </Badge>
                          </div>

                          {/* Report preview */}
                          <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-[12]">
                              {result.report.substring(0, 800)}
                              {result.report.length > 800 && '...'}
                            </p>
                          </div>

                          {/* Select button */}
                          {onSelectModel && (
                            <Button 
                              onClick={() => handleSelectModel(result)}
                              variant="outline"
                              className="w-full"
                            >
                              Use This Analysis
                            </Button>
                          )}
                        </>
                      )}

                      {result.status === 'pending' && (
                        <div className="py-8 text-center text-muted-foreground text-sm">
                          Waiting to start...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {hasRun && !isRunning && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={runComparison} className="gap-2">
                <Zap className="h-4 w-4" />
                Run Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
