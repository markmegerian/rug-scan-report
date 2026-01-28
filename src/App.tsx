import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppInitializer } from "@/components/AppInitializer";
import { queryClient } from "@/lib/queryClient";

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
const AccountsReceivable = lazy(() => import("./pages/AccountsReceivable"));

// Client Portal Pages
const ClientAuth = lazy(() => import("./pages/ClientAuth"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientHistory = lazy(() => import("./pages/ClientHistory"));
const ClientSetPassword = lazy(() => import("./pages/ClientSetPassword"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

// Utility Pages
const ScreenshotGenerator = lazy(() => import("./pages/ScreenshotGenerator"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));

// Legal Pages
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Support = lazy(() => import("./pages/Support"));

// Loading fallback component - iOS safe area aware
const PageLoader = () => (
  <div className="min-h-screen-safe flex items-center justify-center safe-y">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppInitializer>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Support />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/jobs/new" element={<NewJob />} />
                <Route path="/jobs/:jobId" element={<JobDetail />} />
                <Route path="/settings" element={<AccountSettings />} />
                <Route path="/history" element={<History />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/accounts-receivable" element={<AccountsReceivable />} />
                
                {/* Client Portal Routes */}
                <Route path="/client/auth" element={<ClientAuth />} />
                <Route path="/client/dashboard" element={<ClientDashboard />} />
                <Route path="/client/history" element={<ClientHistory />} />
                <Route path="/client/set-password" element={<ClientSetPassword />} />
                <Route path="/client/payment-success" element={<PaymentSuccess />} />
                <Route path="/client/:accessToken" element={<ClientPortal />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
                <Route path="/admin/payouts" element={<AdminPayouts />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/audit-log" element={<AdminAuditLog />} />
                
                {/* Utility Routes */}
                <Route path="/screenshots" element={<ScreenshotGenerator />} />
                
                {/* Legal Routes */}
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/support" element={<Support />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AppInitializer>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
