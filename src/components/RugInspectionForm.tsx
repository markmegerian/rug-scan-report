import React, { useState } from 'react';
import { Loader2, Send, User, Hash, Ruler, Sparkles } from 'lucide-react';
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
import PhotoCapture from './PhotoCapture';

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

interface RugInspectionFormProps {
  onSubmit: (data: FormData, photos: File[]) => Promise<void>;
  isLoading: boolean;
}

const RugInspectionForm: React.FC<RugInspectionFormProps> = ({ onSubmit, isLoading }) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [formData, setFormData] = useState<FormData>({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    rugNumber: '',
    length: '',
    width: '',
    rugType: '',
    notes: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, rugType: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (photos.length === 0) {
      toast.error('Please add at least one photo of the rug');
      return;
    }

    if (!formData.clientName || !formData.rugNumber || !formData.rugType) {
      toast.error('Please fill in all required fields');
      return;
    }

    await onSubmit(formData, photos);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Client Information */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <User className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Client Information
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              name="clientName"
              placeholder="John Smith"
              value={formData.clientName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email</Label>
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              placeholder="john@example.com"
              value={formData.clientEmail}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientPhone">Phone</Label>
            <Input
              id="clientPhone"
              name="clientPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.clientPhone}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </section>

      {/* Rug Details */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Hash className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Rug Details
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

      {/* Photo Capture */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Inspection Photos
          </h2>
        </div>

        <PhotoCapture photos={photos} onPhotosChange={setPhotos} maxPhotos={10} />
      </section>

      {/* Additional Notes */}
      <section className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Any additional observations about the rug condition..."
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
          />
        </div>
      </section>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          variant="warm"
          size="xl"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Submit for AI Analysis
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default RugInspectionForm;
