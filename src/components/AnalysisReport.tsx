import React, { useState, useRef } from 'react';
import { FileText, DollarSign, Wrench, ArrowLeft, Download, ClipboardList, RefreshCw, ImageIcon, Plus, X, Edit2, Check, MousePointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { generatePDF } from '@/lib/pdfGenerator';
import { useCapacitor, ImpactStyle } from '@/hooks/useCapacitor';

interface ImageAnnotation {
  label: string;
  location: string;
  x: number;
  y: number;
}

interface PhotoAnnotations {
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
}) => {
  const [editMode, setEditMode] = useState(false);
  const [localAnnotations, setLocalAnnotations] = useState<PhotoAnnotations[]>(imageAnnotations);
  const [editingMarker, setEditingMarker] = useState<{ photoIndex: number; annIndex: number } | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [draggingMarker, setDraggingMarker] = useState<{ photoIndex: number; annIndex: number } | null>(null);
  const [longPressMarker, setLongPressMarker] = useState<{ photoIndex: number; annIndex: number } | null>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Capacitor haptics for native feedback
  const { hapticImpact, isNative } = useCapacitor();

  // Sync local state when props change
  React.useEffect(() => {
    setLocalAnnotations(imageAnnotations);
  }, [imageAnnotations]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, photoIndex: number) => {
    if (!editMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: ImageAnnotation = {
      label: 'New marker - click to edit',
      location: `Photo ${photoIndex + 1}`,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    };

    const updatedAnnotations = [...localAnnotations];
    const existingPhotoAnnotation = updatedAnnotations.find(a => a.photoIndex === photoIndex);
    
    if (existingPhotoAnnotation) {
      existingPhotoAnnotation.annotations.push(newAnnotation);
    } else {
      updatedAnnotations.push({
        photoIndex,
        annotations: [newAnnotation],
      });
    }

    setLocalAnnotations(updatedAnnotations);
    
    // Start editing the new marker
    const annIndex = existingPhotoAnnotation 
      ? existingPhotoAnnotation.annotations.length - 1 
      : 0;
    setEditingMarker({ photoIndex, annIndex });
    setEditLabel(newAnnotation.label);
  };

  const handleDeleteMarker = (photoIndex: number, annIndex: number) => {
    const updatedAnnotations = localAnnotations.map(pa => {
      if (pa.photoIndex === photoIndex) {
        return {
          ...pa,
          annotations: pa.annotations.filter((_, idx) => idx !== annIndex),
        };
      }
      return pa;
    }).filter(pa => pa.annotations.length > 0);

    setLocalAnnotations(updatedAnnotations);
  };

  const handleEditMarker = (photoIndex: number, annIndex: number) => {
    const photoAnnotation = localAnnotations.find(a => a.photoIndex === photoIndex);
    if (photoAnnotation) {
      setEditingMarker({ photoIndex, annIndex });
      setEditLabel(photoAnnotation.annotations[annIndex].label);
    }
  };

  const handleSaveMarkerLabel = () => {
    if (!editingMarker) return;

    const updatedAnnotations = localAnnotations.map(pa => {
      if (pa.photoIndex === editingMarker.photoIndex) {
        return {
          ...pa,
          annotations: pa.annotations.map((ann, idx) => 
            idx === editingMarker.annIndex 
              ? { ...ann, label: editLabel }
              : ann
          ),
        };
      }
      return pa;
    });

    setLocalAnnotations(updatedAnnotations);
    setEditingMarker(null);
    setEditLabel('');
  };

  // Long press handling for mobile
  const handleLongPressStart = (photoIndex: number, annIndex: number) => {
    if (!editMode) return;
    
    longPressTimerRef.current = setTimeout(() => {
      setLongPressMarker({ photoIndex, annIndex });
      // Use Capacitor haptics for native, fallback to navigator.vibrate for web
      if (isNative) {
        hapticImpact(ImpactStyle.Medium);
      } else if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent, photoIndex: number, annIndex: number) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Start long press detection
    handleLongPressStart(photoIndex, annIndex);
    
    // Capture the pointer for smooth tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingMarker({ photoIndex, annIndex });

    const imageEl = imageRefs.current[photoIndex];
    if (!imageEl) return;

    let hasMoved = false;
    const startX = e.clientX;
    const startY = e.clientY;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      // Cancel long press if user starts dragging
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved = true;
        handleLongPressEnd();
        setLongPressMarker(null);
      }
      
      const rect = imageEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));

      setLocalAnnotations(prev => prev.map(pa => {
        if (pa.photoIndex === photoIndex) {
          return {
            ...pa,
            annotations: pa.annotations.map((ann, idx) =>
              idx === annIndex
                ? { ...ann, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
                : ann
            ),
          };
        }
        return pa;
      }));
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      handleLongPressEnd();
      (upEvent.target as HTMLElement).releasePointerCapture?.(upEvent.pointerId);
      setDraggingMarker(null);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  };

  const handleSaveAnnotations = () => {
    if (onAnnotationsChange) {
      onAnnotationsChange(localAnnotations);
      toast.success('Markers saved successfully!');
    }
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setLocalAnnotations(imageAnnotations);
    setEditMode(false);
    setEditingMarker(null);
    setDraggingMarker(null);
  };

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

  const displayAnnotations = editMode ? localAnnotations : imageAnnotations;

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
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display">
                <ImageIcon className="h-5 w-5 text-primary" />
                Photo Analysis
              </CardTitle>
              {onAnnotationsChange && (
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="gap-1"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSaveAnnotations}
                        className="gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Save Markers
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(true)}
                      className="gap-1"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Markers
                    </Button>
                  )}
                </div>
              )}
            </div>
            {editMode && (
              <div className="mt-3 p-3 bg-primary/10 rounded-lg flex items-start gap-2 text-sm text-primary">
                <MousePointer className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">
                  <span className="hidden sm:inline">Tap to add markers. Drag to reposition. Click a marker to edit or delete.</span>
                  <span className="sm:hidden">Tap to add markers. Drag to move. Long-press a marker to edit or delete.</span>
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {photoUrls.map((url, photoIndex) => {
                const photoAnnotation = displayAnnotations.find(
                  (a) => a.photoIndex === photoIndex
                );
                const annotations = photoAnnotation?.annotations || [];

                return (
                  <div key={photoIndex} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Photo {photoIndex + 1}
                    </p>
                    <div 
                      ref={el => imageRefs.current[photoIndex] = el}
                      className={`relative rounded-lg overflow-hidden border border-border ${editMode ? 'cursor-crosshair' : ''} select-none`}
                      onClick={(e) => handleImageClick(e, photoIndex)}
                    >
                      <img
                        src={url}
                        alt={`Rug photo ${photoIndex + 1}`}
                        className="w-full h-auto object-cover pointer-events-none"
                        draggable={false}
                      />
                      {/* Annotation markers */}
                      {annotations.map((annotation, annIndex) => {
                        const isDragging = draggingMarker?.photoIndex === photoIndex && draggingMarker?.annIndex === annIndex;
                        const isLongPressed = longPressMarker?.photoIndex === photoIndex && longPressMarker?.annIndex === annIndex;
                        return (
                          <div
                            key={annIndex}
                            className={`absolute ${isDragging ? 'z-50 scale-110' : isLongPressed ? 'z-50' : 'z-10'}`}
                            style={{
                              left: `${annotation.x}%`,
                              top: `${annotation.y}%`,
                              transform: 'translate(-50%, -50%)',
                              transition: isDragging ? 'none' : 'all 0.15s ease-out',
                              touchAction: 'none',
                            }}
                            onPointerDown={(e) => handlePointerDown(e, photoIndex, annIndex)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (editMode && !draggingMarker) {
                                handleEditMarker(photoIndex, annIndex);
                              }
                            }}
                          >
                            {/* Marker dot - larger touch target for mobile */}
                            <div className={`relative group ${editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}>
                              <div className={`w-7 h-7 sm:w-6 sm:h-6 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold shadow-lg border-2 border-white ${editMode ? 'ring-2 ring-primary/50' : 'animate-pulse'} ${isLongPressed ? 'scale-125 ring-4 ring-primary' : ''} transition-transform`}>
                                {annIndex + 1}
                              </div>
                              {/* Tooltip - hidden on touch devices in non-edit mode */}
                              {!editMode && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden md:group-hover:block z-10 pointer-events-none">
                                  <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg text-sm whitespace-nowrap border border-border max-w-[200px] truncate">
                                    {annotation.label}
                                  </div>
                                </div>
                              )}
                              {/* Long-press menu for mobile - visible when long-pressed */}
                              {editMode && isLongPressed && (
                                <div 
                                  className="absolute -top-12 left-1/2 -translate-x-1/2 flex z-30 gap-1 bg-background rounded-xl p-1.5 shadow-xl border-2 border-primary animate-scale-in"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 w-9 p-0 touch-manipulation rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLongPressMarker(null);
                                      handleEditMarker(photoIndex, annIndex);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-9 w-9 p-0 touch-manipulation rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLongPressMarker(null);
                                      handleDeleteMarker(photoIndex, annIndex);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-9 p-0 touch-manipulation rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLongPressMarker(null);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {/* Edit mode controls - hover for desktop */}
                              {editMode && !isLongPressed && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden md:flex z-20 gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-border">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 w-8 p-0 touch-manipulation"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditMarker(photoIndex, annIndex);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 w-8 p-0 touch-manipulation"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMarker(photoIndex, annIndex);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Annotation legend */}
                    {annotations.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {annotations.map((annotation, annIndex) => {
                          const isEditing = editingMarker?.photoIndex === photoIndex && editingMarker?.annIndex === annIndex;
                          
                          return (
                            <div
                              key={annIndex}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold flex-shrink-0">
                                {annIndex + 1}
                              </span>
                              {isEditing ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <Input
                                    value={editLabel}
                                    onChange={(e) => setEditLabel(e.target.value)}
                                    className="h-7 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveMarkerLabel();
                                      } else if (e.key === 'Escape') {
                                        setEditingMarker(null);
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={handleSaveMarkerLabel}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span 
                                  className={`text-foreground/80 ${editMode ? 'cursor-pointer hover:text-foreground' : ''}`}
                                  onClick={() => editMode && handleEditMarker(photoIndex, annIndex)}
                                >
                                  {annotation.label}
                                </span>
                              )}
                              {editMode && !isEditing && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 ml-auto"
                                  onClick={() => handleDeleteMarker(photoIndex, annIndex)}
                                >
                                  <X className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {annotations.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        {editMode ? 'Click on the photo to add markers' : 'No specific issues identified in this photo'}
                      </p>
                    )}
                  </div>
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
