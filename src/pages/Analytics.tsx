import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, Users, DollarSign, Briefcase, BarChart3, Target, Clock } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import rugboostLogo from "@/assets/rugboost-logo.svg";

import { JobsOverTimeChart } from "@/components/analytics/JobsOverTimeChart";
import { ConversionFunnelChart } from "@/components/analytics/ConversionFunnelChart";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { ServicePopularityChart } from "@/components/analytics/ServicePopularityChart";
import { MetricCard } from "@/components/analytics/MetricCard";

interface AnalyticsData {
  totalJobs: number;
  totalRevenue: number;
  avgJobValue: number;
  conversionRate: number;
  jobsOverTime: { date: string; count: number }[];
  funnelData: { stage: string; count: number; percentage: number }[];
  revenueOverTime: { date: string; revenue: number }[];
  servicePopularity: { name: string; count: number; revenue: number }[];
  recentJobsGrowth: number;
  recentRevenueGrowth: number;
}

type DateRange = "7d" | "30d" | "90d" | "12m";

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, dateRange]);

  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date();
    let start: Date;
    
    switch (dateRange) {
      case "7d":
        start = subDays(end, 7);
        break;
      case "30d":
        start = subDays(end, 30);
        break;
      case "90d":
        start = subDays(end, 90);
        break;
      case "12m":
        start = subMonths(end, 12);
        break;
      default:
        start = subDays(end, 30);
    }
    
    return { start, end };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      // Fetch jobs in date range
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id, created_at, status, payment_status, client_portal_enabled")
        .gte("created_at", startStr)
        .lte("created_at", endStr)
        .order("created_at", { ascending: true });

      if (jobsError) throw jobsError;

      // Fetch client_job_access for funnel
      const { data: clientAccess, error: accessError } = await supabase
        .from("client_job_access")
        .select("id, job_id, first_accessed_at, password_set_at, created_at")
        .gte("created_at", startStr)
        .lte("created_at", endStr);

      if (accessError) throw accessError;

      // Fetch payments
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, amount, paid_at, job_id, status")
        .eq("status", "paid")
        .gte("paid_at", startStr)
        .lte("paid_at", endStr);

      if (paymentsError) throw paymentsError;

      // Fetch approved estimates for service popularity
      const { data: estimates, error: estimatesError } = await supabase
        .from("approved_estimates")
        .select("id, services, total_amount, created_at")
        .gte("created_at", startStr)
        .lte("created_at", endStr);

      if (estimatesError) throw estimatesError;

      // Calculate metrics
      const totalJobs = jobs?.length || 0;
      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const avgJobValue = totalJobs > 0 ? totalRevenue / (payments?.length || 1) : 0;

      // Funnel data
      const invitedCount = clientAccess?.length || 0;
      const accessedCount = clientAccess?.filter(a => a.first_accessed_at)?.length || 0;
      const passwordSetCount = clientAccess?.filter(a => a.password_set_at)?.length || 0;
      const paidCount = payments?.length || 0;

      const funnelData = [
        { stage: "Invited", count: invitedCount, percentage: 100 },
        { stage: "Accessed Portal", count: accessedCount, percentage: invitedCount > 0 ? (accessedCount / invitedCount) * 100 : 0 },
        { stage: "Created Account", count: passwordSetCount, percentage: invitedCount > 0 ? (passwordSetCount / invitedCount) * 100 : 0 },
        { stage: "Paid", count: paidCount, percentage: invitedCount > 0 ? (paidCount / invitedCount) * 100 : 0 },
      ];

      const conversionRate = invitedCount > 0 ? (paidCount / invitedCount) * 100 : 0;

      // Jobs over time
      const jobsOverTime = calculateTimeSeries(jobs || [], dateRange, "created_at", "count") as { date: string; count: number }[];

      // Revenue over time
      const revenueOverTime = calculateTimeSeries(payments || [], dateRange, "paid_at", "revenue") as { date: string; revenue: number }[];

      // Service popularity
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      estimates?.forEach(est => {
        const services = est.services as any[];
        services?.forEach(service => {
          const name = service.name || "Unknown";
          const existing = serviceMap.get(name) || { count: 0, revenue: 0 };
          serviceMap.set(name, {
            count: existing.count + 1,
            revenue: existing.revenue + (service.unitPrice * service.quantity || 0)
          });
        });
      });

      const servicePopularity = Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Growth calculations (compare to previous period)
      const prevStart = new Date(start);
      const prevEnd = new Date(start);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      prevStart.setDate(prevStart.getDate() - daysDiff);

      const { data: prevJobs } = await supabase
        .from("jobs")
        .select("id")
        .gte("created_at", prevStart.toISOString())
        .lt("created_at", startStr);

      const { data: prevPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("status", "paid")
        .gte("paid_at", prevStart.toISOString())
        .lt("paid_at", startStr);

      const prevJobsCount = prevJobs?.length || 0;
      const prevRevenueTotal = prevPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const recentJobsGrowth = prevJobsCount > 0 ? ((totalJobs - prevJobsCount) / prevJobsCount) * 100 : 0;
      const recentRevenueGrowth = prevRevenueTotal > 0 ? ((totalRevenue - prevRevenueTotal) / prevRevenueTotal) * 100 : 0;

      setData({
        totalJobs,
        totalRevenue,
        avgJobValue,
        conversionRate,
        jobsOverTime,
        funnelData,
        revenueOverTime,
        servicePopularity,
        recentJobsGrowth,
        recentRevenueGrowth,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeSeries = (
    items: any[],
    range: DateRange,
    dateField: string,
    type: "count" | "revenue"
  ) => {
    const { start, end } = getDateRange();
    
    let intervals: Date[];
    let formatStr: string;
    
    if (range === "7d" || range === "30d") {
      intervals = eachDayOfInterval({ start, end });
      formatStr = "MMM d";
    } else if (range === "90d") {
      intervals = eachWeekOfInterval({ start, end });
      formatStr = "MMM d";
    } else {
      intervals = eachMonthOfInterval({ start, end });
      formatStr = "MMM yyyy";
    }

    return intervals.map(interval => {
      const nextInterval = range === "12m" 
        ? endOfMonth(interval)
        : range === "90d"
        ? new Date(interval.getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date(interval.getTime() + 24 * 60 * 60 * 1000);

      const periodItems = items.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= interval && itemDate < nextInterval;
      });

      return {
        date: format(interval, formatStr),
        [type === "count" ? "count" : "revenue"]: type === "count" 
          ? periodItems.length 
          : periodItems.reduce((sum, p) => sum + Number(p.amount), 0)
      };
    }) as { date: string; count?: number; revenue?: number }[];
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10" />
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">RugBoost</h1>
              <p className="text-xs text-muted-foreground">Business Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Metric Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="Total Jobs"
            value={data?.totalJobs || 0}
            icon={Briefcase}
            trend={data?.recentJobsGrowth}
            description="Jobs created this period"
          />
          <MetricCard
            title="Total Revenue"
            value={data?.totalRevenue || 0}
            icon={DollarSign}
            trend={data?.recentRevenueGrowth}
            isCurrency
            description="Revenue collected"
          />
          <MetricCard
            title="Avg Job Value"
            value={data?.avgJobValue || 0}
            icon={TrendingUp}
            isCurrency
            description="Average payment per job"
          />
          <MetricCard
            title="Conversion Rate"
            value={data?.conversionRate || 0}
            icon={Target}
            isPercentage
            description="Invited to paid"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Jobs Over Time
              </CardTitle>
              <CardDescription>New jobs created during the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <JobsOverTimeChart data={data?.jobsOverTime || []} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Revenue Over Time
              </CardTitle>
              <CardDescription>Revenue collected during the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart data={data?.revenueOverTime || []} />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Client Portal Funnel
              </CardTitle>
              <CardDescription>Conversion from invite to payment</CardDescription>
            </CardHeader>
            <CardContent>
              <ConversionFunnelChart data={data?.funnelData || []} />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Service Popularity
              </CardTitle>
              <CardDescription>Most requested services by count</CardDescription>
            </CardHeader>
            <CardContent>
              <ServicePopularityChart data={data?.servicePopularity || []} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
