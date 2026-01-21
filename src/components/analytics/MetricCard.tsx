import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
  description?: string;
}

export const MetricCard = ({
  title,
  value,
  icon: Icon,
  trend,
  isCurrency,
  isPercentage,
  description,
}: MetricCardProps) => {
  const formatValue = () => {
    if (isCurrency) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const hasTrend = trend !== undefined && trend !== 0;
  const isPositive = trend && trend > 0;

  return (
    <Card className="shadow-card hover:shadow-medium transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-display font-bold text-foreground">
              {formatValue()}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            {hasTrend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  isPositive ? "text-emerald-600" : "text-red-500"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
