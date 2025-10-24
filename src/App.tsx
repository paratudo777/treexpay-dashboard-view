
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Depositos from "./pages/Depositos";
import Checkouts from "./pages/Checkouts";
import CheckoutPublic from "./pages/CheckoutPublic";
import Perfil from "./pages/Perfil";
import Financeiro from "./pages/Financeiro";
import Ranking from "./pages/Ranking";
import Admin from "./pages/Admin";
import AdminWithdrawals from "./pages/AdminWithdrawals";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import RouterFallback from "./components/RouterFallback";
import OneSignalInitializer from "./components/OneSignalInitializer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Componente para loading seguro
const SafeLoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
  </div>
);

const App = () => {
  // Garantir que não há eventos órfãos no DOM
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Limpar qualquer listener que possa estar ativo
      return null;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <OneSignalInitializer />
            <RouterFallback />
            <Suspense fallback={<SafeLoadingFallback />}>
              <Routes>
                  <Route path="/" element={<Login />} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/transactions" 
                    element={
                      <ProtectedRoute>
                        <Transactions />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/depositos" 
                    element={
                      <ProtectedRoute>
                        <Depositos />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/checkouts" 
                    element={
                      <ProtectedRoute>
                        <Checkouts />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/financeiro" 
                    element={
                      <ProtectedRoute>
                        <Financeiro />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/ranking" 
                    element={
                      <ProtectedRoute>
                        <Ranking />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/perfil" 
                    element={
                      <ProtectedRoute>
                        <Perfil />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin" 
                    element={
                      <AdminRoute>
                        <Admin />
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/admin/saques" 
                    element={
                      <AdminRoute>
                        <AdminWithdrawals />
                      </AdminRoute>
                    } 
                  />
                  <Route path="/checkout/:slug" element={<CheckoutPublic />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
