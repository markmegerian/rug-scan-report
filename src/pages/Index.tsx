import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import RugInspectionForm from '@/components/RugInspectionForm';
import AnalysisReport from '@/components/AnalysisReport';

interface FormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  rugNumber: string;
  length: string;
  width: string;
  rugType: string;
  notes: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  const handleSubmit = async (formData: FormData, photos: File[]) => {
    setIsLoading(true);
    
    try {
      // For now, simulate AI analysis since we need to set up the backend
      // This will be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockReport = `# Rug Condition Assessment

## Overall Condition
The ${formData.rugType} rug (${formData.length}' x ${formData.width}') has been thoroughly analyzed based on the ${photos.length} provided images.

## Identified Issues

### Wear & Tear
- Moderate pile wear observed in high-traffic areas
- Fringe shows signs of unraveling on the eastern edge
- Minor foundation exposure in central medallion area

### Staining & Discoloration
- Light water staining detected in northwest quadrant
- General fading consistent with age and sun exposure
- Slight color bleeding around red dye areas

### Structural Concerns
- Edge binding loosening on two sides
- Minor moth damage in isolated areas
- Overall foundation integrity is sound

## Recommended Services

**Priority 1 - Essential Repairs**
- Full professional cleaning: $${(parseFloat(formData.length || '1') * parseFloat(formData.width || '1') * 8).toFixed(0)}
- Fringe repair and stabilization: $180-280
- Edge binding restoration: $150-250

**Priority 2 - Recommended Restoration**
- Color restoration and touch-up: $200-400
- Moth damage repair: $120-200
- Pile reconstruction in worn areas: $300-500

**Priority 3 - Optional Preservation**
- Protective backing application: $150
- Stain-resistant treatment: $85
- Museum-quality storage preparation: $200

## Estimated Total
- Essential repairs only: $${(parseFloat(formData.length || '1') * parseFloat(formData.width || '1') * 8 + 330).toFixed(0)} - $${(parseFloat(formData.length || '1') * parseFloat(formData.width || '1') * 8 + 530).toFixed(0)}
- Full restoration package: $${(parseFloat(formData.length || '1') * parseFloat(formData.width || '1') * 8 + 950).toFixed(0)} - $${(parseFloat(formData.length || '1') * parseFloat(formData.width || '1') * 8 + 1630).toFixed(0)}

## Timeline
Estimated completion: 3-4 weeks for full restoration

## Notes
${formData.notes || 'No additional notes provided.'}`;

      setAnalysisReport(mockReport);
      setSubmittedData(formData);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Failed to analyze rug. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewInspection = () => {
    setAnalysisReport(null);
    setSubmittedData(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary to-terracotta-light p-2.5 shadow-soft">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                RugInspect
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Analysis
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          {analysisReport && submittedData ? (
            <AnalysisReport
              report={analysisReport}
              rugInfo={{
                clientName: submittedData.clientName,
                rugNumber: submittedData.rugNumber,
                rugType: submittedData.rugType,
                dimensions: `${submittedData.length || '–'}' × ${submittedData.width || '–'}'`,
              }}
              onNewInspection={handleNewInspection}
            />
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Page Title */}
              <div className="text-center">
                <h2 className="font-display text-3xl font-bold text-foreground">
                  New Rug Inspection
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Capture photos and details for AI-powered restoration analysis
                </p>
              </div>

              {/* Form Card */}
              <div className="rounded-2xl bg-card p-6 shadow-medium sm:p-8">
                <RugInspectionForm onSubmit={handleSubmit} isLoading={isLoading} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Professional rug inspection and restoration analysis
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
