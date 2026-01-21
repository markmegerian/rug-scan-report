import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewJob = lazy(() => import("./pages/NewJob"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const History = lazy(() => import("./pages/History"));
const Analytics = lazy(() => import("./pages/Analytics"));

// Client Portal Pages
const ClientAuth = lazy(() => import("./pages/ClientAuth"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const ClientHistory = lazy(() => import("./pages/ClientHistory"));
const ClientSetPassword = lazy(() => import("./pages/ClientSetPassword"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jobs/new" element={<NewJob />} />
              <Route path="/jobs/:jobId" element={<JobDetail />} />
              <Route path="/settings" element={<AccountSettings />} />
              <Route path="/history" element={<History />} />
              <Route path="/analytics" element={<Analytics />} />
              
              {/* Client Portal Routes */}
              <Route path="/client/auth" element={<ClientAuth />} />
              <Route path="/client/history" element={<ClientHistory />} />
              <Route path="/client/set-password" element={<ClientSetPassword />} />
              <Route path="/client/payment-success" element={<PaymentSuccess />} />
              <Route path="/client/:accessToken" element={<ClientPortal />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
