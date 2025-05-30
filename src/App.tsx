
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import RouterFallback from "@/components/RouterFallback";

// Import all pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Depositos from "./pages/Depositos";
import Financeiro from "./pages/Financeiro";
import Ranking from "./pages/Ranking";
import Admin from "./pages/Admin";
import AdminSaques from "./pages/AdminSaques";
import Perfil from "./pages/Perfil";
import Checkouts from "./pages/Checkouts";
import CheckoutPublic from "./pages/CheckoutPublic";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RouterFallback>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/transactions" element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              } />
              
              <Route path="/depositos" element={
                <ProtectedRoute>
                  <Depositos />
                </ProtectedRoute>
              } />
              
              <Route path="/financeiro" element={
                <ProtectedRoute>
                  <Financeiro />
                </ProtectedRoute>
              } />
              
              <Route path="/ranking" element={
                <ProtectedRoute>
                  <Ranking />
                </ProtectedRoute>
              } />
              
              <Route path="/perfil" element={
                <ProtectedRoute>
                  <Perfil />
                </ProtectedRoute>
              } />
              
              <Route path="/checkouts" element={
                <ProtectedRoute>
                  <Checkouts />
                </ProtectedRoute>
              } />
              
              {/* Admin Only Routes */}
              <Route path="/admin" element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              } />
              
              <Route path="/admin/saques" element={
                <AdminRoute>
                  <AdminSaques />
                </AdminRoute>
              } />
              
              {/* Public Routes */}
              <Route path="/checkout/:slug" element={<CheckoutPublic />} />
              
              {/* Fallback */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </RouterFallback>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
