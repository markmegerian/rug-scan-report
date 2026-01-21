import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";

interface ConversionFunnelChartProps {
  data: { stage: string; count: number; percentage: number }[];
}

const FUNNEL_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--rugboost-blue-light))",
  "hsl(var(--accent))",
  "hsl(var(--rugboost-purple-light))",
];

const chartConfig: ChartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--primary))",
  },
};

export const ConversionFunnelChart = ({ data }: ConversionFunnelChartProps) => {
  if (!data.length || data.every(d => d.count === 0)) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No funnel data available for this period
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
          <XAxis type="number" hide />
          <YAxis 
            type="category" 
            dataKey="stage" 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      
      {/* Percentage labels */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {data.map((item, index) => (
          <div key={item.stage} className="space-y-1">
            <div 
              className="h-2 rounded-full" 
              style={{ backgroundColor: FUNNEL_COLORS[index % FUNNEL_COLORS.length] }}
            />
            <p className="text-xs text-muted-foreground">{item.stage}</p>
            <p className="text-sm font-semibold">{item.percentage.toFixed(0)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};
