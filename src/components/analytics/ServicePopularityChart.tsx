import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";

interface ServicePopularityChartProps {
  data: { name: string; count: number; revenue: number }[];
}

const chartConfig: ChartConfig = {
  count: {
    label: "Times Selected",
    color: "hsl(var(--primary))",
  },
};

export const ServicePopularityChart = ({ data }: ServicePopularityChartProps) => {
  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No service data available for this period
      </div>
    );
  }

  // Truncate long service names
  const formattedData = data.map(item => ({
    ...item,
    shortName: item.name.length > 20 ? item.name.substring(0, 18) + "..." : item.name,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <ChartContainer config={chartConfig} className="h-[250px] w-full">
        <BarChart data={formattedData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
          <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis 
            type="category" 
            dataKey="shortName" 
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <ChartTooltip 
            content={<ChartTooltipContent />}
            formatter={(value: number, name: string, props: any) => {
              const revenue = props.payload.revenue;
              return [
                <div key="tooltip" className="space-y-1">
                  <p><strong>{props.payload.name}</strong></p>
                  <p>Selected: {value} times</p>
                  <p>Revenue: {formatCurrency(revenue)}</p>
                </div>
              ];
            }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
            {formattedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`hsl(var(--primary) / ${1 - index * 0.08})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Top 3 services summary */}
      {data.length > 0 && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
          {data.slice(0, 3).map((service, index) => (
            <div key={service.name} className="text-center p-2">
              <p className="text-xs text-muted-foreground truncate" title={service.name}>
                #{index + 1} {service.name}
              </p>
              <p className="text-sm font-semibold text-primary">{formatCurrency(service.revenue)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
