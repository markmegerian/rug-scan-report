import React, { useState, useRef } from 'react';
import { X, Plus, GripVertical, Edit2, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ImageAnnotation {
  label: string;
  location: string;
  x: number;
  y: number;
}

interface MarkerEditorProps {
  photoUrl: string;
  photoIndex: number;
  annotations: ImageAnnotation[];
  onAnnotationsChange: (photoIndex: number, annotations: ImageAnnotation[]) => void;
  isEditing: boolean;
}

const MarkerEditor: React.FC<MarkerEditorProps> = ({
  photoUrl,
  photoIndex,
  annotations,
  onAnnotationsChange,
  isEditing,
}) => {
  const [editingMarkerIndex, setEditingMarkerIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing || draggingIndex !== null) return;
    
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Add new marker
    const newAnnotation: ImageAnnotation = {
      label: `Issue ${annotations.length + 1}`,
      location: 'on rug',
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };

    onAnnotationsChange(photoIndex, [...annotations, newAnnotation]);
  };

  const handleDeleteMarker = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = annotations.filter((_, i) => i !== index);
    onAnnotationsChange(photoIndex, updated);
  };

  const handleStartEdit = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMarkerIndex(index);
    setEditLabel(annotations[index].label);
  };

  const handleSaveEdit = (index: number) => {
    const updated = annotations.map((ann, i) =>
      i === index ? { ...ann, label: editLabel } : ann
    );
    onAnnotationsChange(photoIndex, updated);
    setEditingMarkerIndex(null);
    setEditLabel('');
  };

  const handleMarkerMouseDown = (index: number, e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingIndex(index);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingIndex === null || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const updated = annotations.map((ann, i) =>
      i === draggingIndex
        ? { ...ann, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
        : ann
    );
    onAnnotationsChange(photoIndex, updated);
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        Photo {photoIndex + 1}
        {isEditing && (
          <span className="text-xs text-primary">(Click to add marker, drag to move)</span>
        )}
      </p>
      <div
        ref={imageRef}
        className={`relative rounded-lg overflow-hidden border ${
          isEditing ? 'border-primary border-2 cursor-crosshair' : 'border-border'
        }`}
        onClick={handleImageClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={photoUrl}
          alt={`Rug photo ${photoIndex + 1}`}
          className="w-full h-auto object-cover select-none"
          draggable={false}
        />
        {/* Annotation markers */}
        {annotations.map((annotation, annIndex) => (
          <div
            key={annIndex}
            className={`absolute ${isEditing ? 'cursor-grab' : 'cursor-pointer'} ${
              draggingIndex === annIndex ? 'cursor-grabbing z-20' : ''
            }`}
            style={{
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={(e) => handleMarkerMouseDown(annIndex, e)}
          >
            <div className="relative group">
              <div
                className={`w-6 h-6 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold shadow-lg border-2 border-white ${
                  !isEditing ? 'animate-pulse' : ''
                } ${isEditing ? 'hover:ring-2 hover:ring-primary hover:ring-offset-1' : ''}`}
              >
                {annIndex + 1}
              </div>
              {/* Tooltip for view mode */}
              {!isEditing && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg text-sm whitespace-nowrap border border-border">
                    {annotation.label}
                  </div>
                </div>
              )}
              {/* Edit controls for edit mode */}
              {isEditing && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover:flex gap-1 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleDeleteMarker(annIndex, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Annotation legend with edit capability */}
      {annotations.length > 0 && (
        <div className="space-y-1 mt-2">
          {annotations.map((annotation, annIndex) => (
            <div
              key={annIndex}
              className="flex items-center gap-2 text-sm group"
            >
              <span className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold flex-shrink-0">
                {annIndex + 1}
              </span>
              {editingMarkerIndex === annIndex ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(annIndex);
                      if (e.key === 'Escape') setEditingMarkerIndex(null);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleSaveEdit(annIndex)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-foreground/80 flex-1">
                    {annotation.label}
                  </span>
                  {isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleStartEdit(annIndex, e)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteMarker(annIndex, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {annotations.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          {isEditing ? 'Click on the image to add a marker' : 'No specific issues identified in this photo'}
        </p>
      )}
    </div>
  );
};

export default MarkerEditor;
