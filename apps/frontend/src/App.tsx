import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApiError } from "@/lib/api";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Requests from "./pages/Requests";
import BorrowedEquipment from "./pages/BorrowedEquipment";
import Suppliers from "./pages/Suppliers";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Activity from "./pages/Activity";
import AIInsights from "./pages/AIInsights";
import Analytics from "./pages/Analytics";
import AlertsCenter from "./pages/AlertsCenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, err) => {
        if (err instanceof ApiError) {
          if (err.status === 429) return false;
          if (err.status >= 400 && err.status < 500 && err.status !== 408) return false;
        }
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
    <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
    <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />

    {/* Protected */}
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/requests" element={<Requests />} />
      <Route path="/borrowed" element={<BorrowedEquipment />} />
      <Route path="/suppliers" element={<Suppliers />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/activity" element={<Activity />} />
      <Route path="/ai-insights" element={<AIInsights />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/alerts" element={<AlertsCenter />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
