import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { DollarSign, Loader2, Save, Plus } from "lucide-react";

interface ServicePriceData {
  unit_price: number;
  is_additional: boolean;
}

const DEFAULT_SERVICES = [
  "Standard wash",
  "Special fiber/antique wash",
  "Limewash (moth wash)",
  "Overnight soaking",
  "Blocking",
  "Sheering",
  "Overcasting",
  "Zenjireh",
  "Persian Binding",
  "Hand Fringe",
  "Machine Fringe",
  "Leather binding",
  "Cotton Binding",
  "Glue binding",
  "Padding",
];

// Services that are typically additional costs by default
const DEFAULT_ADDITIONAL_SERVICES = [
  "Limewash (moth wash)",
  "Overnight soaking",
];

interface ServicePricingProps {
  userId: string;
}

const ServicePricing = ({ userId }: ServicePricingProps) => {
  const [prices, setPrices] = useState<Record<string, ServicePriceData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPrices();
  }, [userId]);

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase
        .from("service_prices")
        .select("service_name, unit_price, is_additional")
        .eq("user_id", userId);

      if (error) throw error;

      const priceMap: Record<string, ServicePriceData> = {};
      DEFAULT_SERVICES.forEach((service) => {
        priceMap[service] = {
          unit_price: 0,
          is_additional: DEFAULT_ADDITIONAL_SERVICES.includes(service),
        };
      });

      data?.forEach((item: { service_name: string; unit_price: number; is_additional: boolean }) => {
        priceMap[item.service_name] = {
          unit_price: item.unit_price,
          is_additional: item.is_additional,
        };
      });

      setPrices(priceMap);
    } catch (error) {
      console.error("Error fetching service prices:", error);
      toast.error("Failed to load service prices");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (serviceName: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setPrices((prev) => ({
      ...prev,
      [serviceName]: { ...prev[serviceName], unit_price: numericValue },
    }));
  };

  const handleAdditionalChange = (serviceName: string, checked: boolean) => {
    setPrices((prev) => ({
      ...prev,
      [serviceName]: { ...prev[serviceName], is_additional: checked },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upsertData = Object.entries(prices).map(([service_name, data]) => ({
        user_id: userId,
        service_name,
        unit_price: data.unit_price,
        is_additional: data.is_additional,
      }));

      const { error } = await supabase
        .from("service_prices")
        .upsert(upsertData, { onConflict: "user_id,service_name" });

      if (error) throw error;

      toast.success("Service prices saved successfully");
    } catch (error) {
      console.error("Error saving service prices:", error);
      toast.error("Failed to save service prices");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Service Pricing
        </CardTitle>
        <CardDescription>
          Set your unit prices for each service. Mark services as "Additional Cost" if they are added on top of a base service (e.g., lime wash added to standard wash).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_SERVICES.map((service) => (
            <div key={service} className="space-y-2 p-3 rounded-lg border bg-card">
              <Label htmlFor={service} className="text-sm font-medium">
                {service}
              </Label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id={service}
                    type="number"
                    min="0"
                    step="0.01"
                    value={prices[service]?.unit_price || ""}
                    onChange={(e) => handlePriceChange(service, e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`${service}-additional`}
                    checked={prices[service]?.is_additional || false}
                    onCheckedChange={(checked) => handleAdditionalChange(service, checked as boolean)}
                  />
                  <Label
                    htmlFor={`${service}-additional`}
                    className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Additional
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Prices
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServicePricing;
