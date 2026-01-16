import React, { useRef } from 'react';
import { Camera, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoCaptureProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 10 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = maxPhotos - photos.length;
    const newPhotos = files.slice(0, remainingSlots);
    onPhotosChange([...photos, ...newPhotos]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const openCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Rug Photos ({photos.length}/{maxPhotos})
        </label>
        {photos.length < maxPhotos && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCamera}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            Add Photo
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {photos.length === 0 ? (
        <div
          onClick={openCamera}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all duration-200"
        >
          <div className="rounded-full bg-primary/10 p-4">
            <ImageIcon className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Tap to add photos</p>
            <p className="text-xs text-muted-foreground mt-1">
              Capture or upload up to {maxPhotos} images
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted shadow-card animate-scale-in"
            >
              <img
                src={URL.createObjectURL(photo)}
                alt={`Rug photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 rounded-full bg-foreground/80 p-1.5 text-background hover:bg-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-2 left-2 rounded-full bg-foreground/70 px-2 py-0.5 text-xs text-background">
                {index + 1}
              </div>
            </div>
          ))}
          
          {photos.length < maxPhotos && (
            <div
              onClick={openCamera}
              className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all duration-200"
            >
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Add more</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoCapture;
