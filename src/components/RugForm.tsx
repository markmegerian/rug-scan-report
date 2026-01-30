import React, { useState, useCallback } from 'react';
import { Loader2, Plus, Hash, Ruler, Camera, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import GuidedPhotoCapture from './GuidedPhotoCapture';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import UnsavedChangesDialog from './UnsavedChangesDialog';

const RUG_TYPES = [
  'Persian',
  'Oriental',
  'Turkish',
  'Moroccan',
  'Afghan',
  'Indian',
  'Chinese',
  'Tibetan',
  'Kilim',
  'Navajo',
  'Aubusson',
  'Savonnerie',
  'Antique',
  'Hand-knotted',
  'Hand-tufted',
  'Machine-made',
  'Other',
];

interface RugFormData {
  rugNumber: string;
  length: string;
  width: string;
  rugType: string;
  notes: string;
}

interface RugFormProps {
  onSubmit: (data: RugFormData, photos: File[]) => Promise<void>;
  isLoading: boolean;
  rugIndex: number;
}

const RugForm: React.FC<RugFormProps> = ({ onSubmit, isLoading, rugIndex }) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [requiredPhotosComplete, setRequiredPhotosComplete] = useState(false);
  const [formData, setFormData] = useState<RugFormData>({
    rugNumber: `RUG-${String(rugIndex + 1).padStart(3, '0')}`,
    length: '',
    width: '',
    rugType: '',
    notes: '',
  });

  // Track if form has been modified
  const isDirty = formData.rugType !== '' || formData.notes !== '' || photos.length > 0;

  // Handle unsaved changes warning
  const { isBlocked, confirmNavigation, cancelNavigation } = useUnsavedChanges(isDirty);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, rugType: value }));
  };

  const handleRequiredComplete = useCallback((complete: boolean) => {
    setRequiredPhotosComplete(complete);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requiredPhotosComplete) {
      toast.error('Please capture all 6 required photos before submitting');
      return;
    }

    if (!formData.rugNumber || !formData.rugType) {
      toast.error('Please fill in all required fields');
      return;
    }

    await onSubmit(formData, photos);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rug Details */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Hash className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Rug #{rugIndex + 1} Details
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="rugNumber">Rug Number *</Label>
            <Input
              id="rugNumber"
              name="rugNumber"
              placeholder="RUG-001"
              value={formData.rugNumber}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rugType">Rug Type *</Label>
            <Select value={formData.rugType} onValueChange={handleSelectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {RUG_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="length" className="flex items-center gap-1">
              <Ruler className="h-3 w-3" /> Length (ft)
            </Label>
            <Input
              id="length"
              name="length"
              type="number"
              step="0.1"
              placeholder="8.5"
              value={formData.length}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="width" className="flex items-center gap-1">
              <Ruler className="h-3 w-3" /> Width (ft)
            </Label>
            <Input
              id="width"
              name="width"
              type="number"
              step="0.1"
              placeholder="5.5"
              value={formData.width}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </section>

      {/* Guided Photo Capture */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Camera className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Inspection Photos
          </h2>
        </div>

        <GuidedPhotoCapture 
          photos={photos} 
          onPhotosChange={setPhotos} 
          onRequiredComplete={handleRequiredComplete}
          maxPhotos={50} 
        />
      </section>

      {/* Additional Notes */}
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Any additional observations about this rug..."
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
          />
        </div>
      </section>

      {/* Submit Button */}
      <div className="pt-4 space-y-2">
        {!requiredPhotosComplete && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>All 6 required photos must be captured before submitting</span>
          </div>
        )}
        <Button
          type="submit"
          size="xl"
          className="w-full"
          disabled={isLoading || !requiredPhotosComplete}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Adding Rug...
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
            Add Rug to Job
            </>
          )}
        </Button>
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={isBlocked}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </form>
  );
};

export default RugForm;
