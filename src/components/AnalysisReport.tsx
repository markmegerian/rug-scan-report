import React, { useState } from 'react';
import { FileText, DollarSign, Wrench, ArrowLeft, Download, ClipboardList, RefreshCw, ImageIcon, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { generatePDF } from '@/lib/pdfGenerator';
import MarkerEditor from './MarkerEditor';

export interface ImageAnnotation {
  label: string;
  location: string;
  x: number;
  y: number;
}

export interface PhotoAnnotations {
  photoIndex: number;
  annotations: ImageAnnotation[];
}

interface AnalysisReportProps {
  report: string;
  rugInfo: {
    clientName: string;
    rugNumber: string;
    rugType: string;
    dimensions: string;
  };
  photoUrls?: string[];
  imageAnnotations?: PhotoAnnotations[];
  onNewInspection: () => void;
  onReviewEstimate?: () => void;
  onReanalyze?: () => void;
  isReanalyzing?: boolean;
  onAnnotationsChange?: (annotations: PhotoAnnotations[]) => void;
  isSavingAnnotations?: boolean;
}


const AnalysisReport: React.FC<AnalysisReportProps> = ({
  report,
  rugInfo,
  photoUrls = [],
  imageAnnotations = [],
  onNewInspection,
  onReviewEstimate,
  onReanalyze,
  isReanalyzing = false,
  onAnnotationsChange,
  isSavingAnnotations = false,
}) => {
  const [isEditingMarkers, setIsEditingMarkers] = useState(false);
  const [editedAnnotations, setEditedAnnotations] = useState<PhotoAnnotations[]>(imageAnnotations);
  const handleDownloadPDF = async () => {
    try {
      // Parse dimensions
      const dimMatch = rugInfo.dimensions.match(/([0-9.]+)'?\s*[×x]\s*([0-9.]+)/);
      const length = dimMatch ? parseFloat(dimMatch[1]) : null;
      const width = dimMatch ? parseFloat(dimMatch[2]) : null;

      await generatePDF({
        id: '',
        client_name: rugInfo.clientName,
        client_email: null,
        client_phone: null,
        rug_number: rugInfo.rugNumber,
        rug_type: rugInfo.rugType,
        length,
        width,
        notes: null,
        photo_urls: null,
        analysis_report: report,
        created_at: new Date().toISOString(),
      });
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Parse the report into structured sections for elegant display
  const formatReport = (text: string) => {
    // Clean up any remaining markdown artifacts
    const cleanText = text
      .replace(/^#{1,3}\s*/gm, '')
      .replace(/\*\*/g, '')
      .replace(/^\* /gm, '• ')
      .replace(/^- /gm, '• ');

    const lines = cleanText.split('\n');
    const elements: React.ReactNode[] = [];
    let currentSection: string | null = null;
    let lineItemsBuffer: string[] = [];

    const flushLineItems = () => {
      if (lineItemsBuffer.length > 0) {
        elements.push(
          <div key={`items-${elements.length}`} className="bg-muted/30 rounded-lg p-5 my-4 space-y-2">
            {lineItemsBuffer.map((item, idx) => {
              const isTotal = /total|subtotal/i.test(item);
              return (
                <div
                  key={idx}
                  className={`flex justify-between items-center text-base leading-relaxed ${
                    isTotal 
                      ? 'border-t border-border pt-3 mt-3 font-semibold text-foreground' 
                      : 'text-foreground/85'
                  }`}
                >
                  <span className="flex-1">{item.replace(/:\s*\$[\d,.]+$/, '')}</span>
                  <span className={`font-mono ${isTotal ? 'text-xl text-primary' : 'text-base'}`}>
                    {item.match(/\$[\d,.]+/)?.[0] || ''}
                  </span>
                </div>
              );
            })}
          </div>
        );
        lineItemsBuffer = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Skip empty lines but flush any pending items
      if (trimmedLine === '') {
        flushLineItems();
        return;
      }

      // Section headers (ALL CAPS)
      if (/^[A-Z][A-Z\s&]+:?$/.test(trimmedLine) && trimmedLine.length > 3) {
        flushLineItems();
        currentSection = trimmedLine;
        elements.push(
          <div key={index} className="mt-10 first:mt-0">
            <h3 className="font-display text-xl font-semibold text-foreground border-b border-primary/20 pb-3 mb-5 tracking-wide">
              {trimmedLine.replace(/:$/, '')}
            </h3>
          </div>
        );
        return;
      }

      // Greeting/Closing lines
      if (trimmedLine.startsWith('Dear ')) {
        flushLineItems();
        elements.push(
          <p key={index} className="text-foreground text-xl leading-relaxed mb-6">
            {trimmedLine}
          </p>
        );
        return;
      }

      if (trimmedLine.startsWith('Sincerely') || trimmedLine.startsWith('Best regards')) {
        flushLineItems();
        elements.push(
          <div key={index} className="mt-10 pt-6 border-t border-border">
            <p className="text-foreground text-lg font-medium">{trimmedLine}</p>
          </div>
        );
        return;
      }

      // Business name after signature
      if (elements.length > 0 && /^[A-Z]/.test(trimmedLine) && !trimmedLine.includes(':') && !trimmedLine.includes('$') && trimmedLine.length < 50) {
        const lastElement = elements[elements.length - 1];
        if (lastElement && typeof lastElement === 'object' && 'props' in lastElement) {
          const lastProps = (lastElement as React.ReactElement).props;
          if (lastProps?.children?.props?.children?.toString().includes('Sincerely')) {
            elements.push(
              <p key={index} className="text-primary font-display font-semibold text-xl mt-2">
                {trimmedLine}
              </p>
            );
            return;
          }
        }
      }

      // Rug headers (Rug #...)
      if (/^Rug\s*#/i.test(trimmedLine)) {
        flushLineItems();
        elements.push(
          <div key={index} className="mt-8 mb-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
            <h4 className="font-display text-lg font-semibold text-foreground">
              {trimmedLine}
            </h4>
          </div>
        );
        return;
      }

      // Lines with dollar amounts - collect them for grouped display
      if (/\$[\d,]+(\.\d{2})?/.test(trimmedLine)) {
        lineItemsBuffer.push(trimmedLine);
        return;
      }

      // Bullet points
      if (trimmedLine.startsWith('•')) {
        flushLineItems();
        elements.push(
          <div key={index} className="flex items-start gap-3 ml-3 mb-3">
            <span className="w-2 h-2 rounded-full bg-primary mt-2.5 flex-shrink-0" />
            <span className="text-foreground/85 text-base leading-relaxed">
              {trimmedLine.replace(/^•\s*/, '')}
            </span>
          </div>
        );
        return;
      }

      // Regular paragraphs
      flushLineItems();
      elements.push(
        <p key={index} className="text-foreground/85 text-base leading-[1.8] mb-4">
          {line}
        </p>
      );
    });

    // Flush any remaining items
    flushLineItems();

    return elements;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewInspection}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          New Inspection
        </Button>
        {onReanalyze && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReanalyze}
            disabled={isReanalyzing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isReanalyzing ? 'animate-spin' : ''}`} />
            {isReanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
          </Button>
        )}
      </div>

      {/* Rug Summary Card */}
      <Card className="shadow-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display">
            <FileText className="h-5 w-5 text-primary" />
            Inspection Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{rugInfo.clientName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rug Number</p>
              <p className="font-medium">{rugInfo.rugNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{rugInfo.rugType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dimensions</p>
              <p className="font-medium">{rugInfo.dimensions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Annotated Photos */}
      {photoUrls.length > 0 && (
        <Card className="shadow-medium">
          <CardHeader className="border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-display">
              <ImageIcon className="h-5 w-5 text-primary" />
              Photo Analysis
            </CardTitle>
            {onAnnotationsChange && (
              <div className="flex gap-2">
                {isEditingMarkers ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditedAnnotations(imageAnnotations);
                        setIsEditingMarkers(false);
                      }}
                      disabled={isSavingAnnotations}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        onAnnotationsChange(editedAnnotations);
                        setIsEditingMarkers(false);
                      }}
                      disabled={isSavingAnnotations}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {isSavingAnnotations ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditedAnnotations(imageAnnotations);
                      setIsEditingMarkers(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit Markers
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {photoUrls.map((url, photoIndex) => {
                const currentAnnotations = isEditingMarkers ? editedAnnotations : imageAnnotations;
                const photoAnnotation = currentAnnotations.find(
                  (a) => a.photoIndex === photoIndex
                );
                const annotations = photoAnnotation?.annotations || [];

                const handlePhotoAnnotationsChange = (pIndex: number, newAnnotations: ImageAnnotation[]) => {
                  setEditedAnnotations(prev => {
                    const existing = prev.find(a => a.photoIndex === pIndex);
                    if (existing) {
                      return prev.map(a => 
                        a.photoIndex === pIndex 
                          ? { ...a, annotations: newAnnotations }
                          : a
                      );
                    } else {
                      return [...prev, { photoIndex: pIndex, annotations: newAnnotations }];
                    }
                  });
                };

                return (
                  <MarkerEditor
                    key={photoIndex}
                    photoUrl={url}
                    photoIndex={photoIndex}
                    annotations={annotations}
                    onAnnotationsChange={handlePhotoAnnotationsChange}
                    isEditing={isEditingMarkers}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Report */}
      <Card className="shadow-medium overflow-hidden">
        <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2 font-display">
            <Wrench className="h-5 w-5 text-primary" />
            Professional Estimate
          </CardTitle>
        </CardHeader>
        <CardContent 
          className="pt-8 pb-10 px-8 md:px-12 relative"
          style={{
            background: `linear-gradient(180deg, hsl(40 20% 99%) 0%, hsl(35 15% 97%) 100%)`,
            boxShadow: 'inset 0 0 80px hsl(30 15% 92% / 0.5)',
          }}
        >
          {/* Subtle corner flourishes */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/20 rounded-tl-sm" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/20 rounded-tr-sm" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/20 rounded-bl-sm" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/20 rounded-br-sm" />
          
          <div className="max-w-none space-y-1 relative z-10">
            {formatReport(report)}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          variant="default" 
          size="lg" 
          className="flex-1 gap-2"
          onClick={handleDownloadPDF}
        >
          <Download className="h-4 w-4" />
          Download PDF Report
        </Button>
        {onReviewEstimate && (
          <Button 
            variant="warm" 
            size="lg" 
            className="flex-1 gap-2"
            onClick={onReviewEstimate}
          >
            <ClipboardList className="h-4 w-4" />
            Review Estimate
          </Button>
        )}
      </div>
    </div>
  );
};

export default AnalysisReport;
