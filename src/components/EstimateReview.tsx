import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Check, Edit2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  priority: 'high' | 'medium' | 'low';
}

interface EstimateReviewProps {
  report: string;
  rugInfo: {
    rugNumber: string;
    rugType: string;
    dimensions: string;
    squareFootage: number | null;
  };
  onBack: () => void;
  onApprove: (services: ServiceItem[], totalCost: number) => void;
  availableServices?: { name: string; unitPrice: number }[];
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 border-red-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-green-100 text-green-700 border-green-300',
};

const EstimateReview: React.FC<EstimateReviewProps> = ({
  report,
  rugInfo,
  onBack,
  onApprove,
  availableServices = [],
}) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Parse the AI report to extract services and costs
  useEffect(() => {
    const extractedServices = parseReportForServices(report);
    setServices(extractedServices);
  }, [report]);

  const parseReportForServices = (reportText: string): ServiceItem[] => {
    const services: ServiceItem[] = [];
    const lines = reportText.split('\n');
    
    let inServicesSection = false;
    let inCostsSection = false;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Detect sections
      if (lowerLine.includes('recommended service') || lowerLine.includes('services needed')) {
        inServicesSection = true;
        inCostsSection = false;
        continue;
      }
      if (lowerLine.includes('estimated cost') || lowerLine.includes('cost estimate') || lowerLine.includes('pricing')) {
        inCostsSection = true;
        inServicesSection = false;
        continue;
      }
      if (lowerLine.includes('total') && lowerLine.includes('cost')) {
        inCostsSection = false;
        continue;
      }
      if (lowerLine.includes('timeline') || lowerLine.includes('recommendation')) {
        inServicesSection = false;
        inCostsSection = false;
        continue;
      }
      
      // Parse service/cost lines
      if ((inServicesSection || inCostsSection) && (line.startsWith('- ') || line.startsWith('* '))) {
        const content = line.replace(/^[-*]\s*/, '').trim();
        
        // Try to extract price
        const priceMatch = content.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;
        
        // Try to extract priority
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (lowerLine.includes('high priority') || lowerLine.includes('urgent') || lowerLine.includes('critical')) {
          priority = 'high';
        } else if (lowerLine.includes('low priority') || lowerLine.includes('optional')) {
          priority = 'low';
        }
        
        // Extract service name (before price or colon)
        let serviceName = content;
        if (priceMatch) {
          serviceName = content.substring(0, content.indexOf('$')).trim();
        }
        // Clean up common patterns
        serviceName = serviceName
          .replace(/:\s*$/, '')
          .replace(/\s*-\s*$/, '')
          .replace(/\*\*/g, '')
          .replace(/^\d+\.\s*/, '')
          .trim();
        
        // Skip if too short or looks like a header
        if (serviceName.length < 3 || serviceName.endsWith(':')) continue;
        
        // Check if this service already exists
        const existingIndex = services.findIndex(
          s => s.name.toLowerCase() === serviceName.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          // Update price if found
          if (price > 0) {
            services[existingIndex].unitPrice = price;
          }
        } else {
          services.push({
            id: crypto.randomUUID(),
            name: serviceName,
            quantity: 1,
            unitPrice: price,
            priority,
          });
        }
      }
    }
    
    // Match with available services to get proper pricing
    return services.map(service => {
      const matchedService = availableServices.find(
        as => as.name.toLowerCase().includes(service.name.toLowerCase()) ||
              service.name.toLowerCase().includes(as.name.toLowerCase())
      );
      if (matchedService && service.unitPrice === 0) {
        return { ...service, unitPrice: matchedService.unitPrice };
      }
      return service;
    });
  };

  const handleUpdateService = (id: string, updates: Partial<ServiceItem>) => {
    setServices(prev => 
      prev.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  };

  const handleAddService = () => {
    const newService: ServiceItem = {
      id: crypto.randomUUID(),
      name: 'New Service',
      quantity: 1,
      unitPrice: 0,
      priority: 'medium',
    };
    setServices(prev => [...prev, newService]);
    setEditingId(newService.id);
  };

  const handleRemoveService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const calculateTotal = () => {
    return services.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);
  };

  const handleApprove = () => {
    if (services.length === 0) {
      toast.error('Please add at least one service');
      return;
    }
    const total = calculateTotal();
    onApprove(services, total);
    toast.success('Estimate approved!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Report
        </Button>
      </div>

      {/* Rug Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Estimate Review
          </CardTitle>
          <CardDescription>
            Review and adjust the AI-recommended services before finalizing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
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
            <div>
              <p className="text-muted-foreground">Sq. Footage</p>
              <p className="font-medium">
                {rugInfo.squareFootage ? `${rugInfo.squareFootage.toFixed(2)} sq ft` : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Services</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddService} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No services detected from the analysis.</p>
              <p className="text-sm mt-1">Click "Add Service" to add services manually.</p>
            </div>
          ) : (
            services.map((service, index) => (
              <div key={service.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    {editingId === service.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <Label>Service Name</Label>
                          <Input
                            value={service.name}
                            onChange={(e) => handleUpdateService(service.id, { name: e.target.value })}
                            placeholder="Service name"
                          />
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={service.quantity}
                            onChange={(e) => handleUpdateService(service.id, { quantity: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div>
                          <Label>Unit Price ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={service.unitPrice}
                            onChange={(e) => handleUpdateService(service.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Priority</Label>
                          <Select
                            value={service.priority}
                            onValueChange={(value: 'high' | 'medium' | 'low') => 
                              handleUpdateService(service.id, { priority: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            size="sm" 
                            onClick={() => setEditingId(null)}
                            className="gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Done
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className={PRIORITY_COLORS[service.priority]}
                          >
                            {service.priority}
                          </Badge>
                          <span className="font-medium">{service.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {service.quantity} × ${service.unitPrice.toFixed(2)}
                            </p>
                            <p className="font-semibold">
                              ${(service.quantity * service.unitPrice).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(service.id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveService(service.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Total */}
          {services.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total Estimate</span>
                <span className="text-primary">${calculateTotal().toFixed(2)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          variant="outline" 
          size="lg" 
          className="flex-1"
          onClick={onBack}
        >
          Back to Report
        </Button>
        <Button 
          variant="default" 
          size="lg" 
          className="flex-1 gap-2"
          onClick={handleApprove}
        >
          <Save className="h-4 w-4" />
          Approve Estimate
        </Button>
      </div>
    </div>
  );
};

export default EstimateReview;
