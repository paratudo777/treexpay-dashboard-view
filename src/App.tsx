
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Create empty placeholder pages for sidebar navigation
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <h1 className="text-2xl font-bold text-treexpay-medium">{title}</h1>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <div className="dark">
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
                    <PlaceholderPage title="Página de Transações" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tef" 
                element={
                  <ProtectedRoute>
                    <PlaceholderPage title="Página de TEF" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/financeiro" 
                element={
                  <ProtectedRoute>
                    <PlaceholderPage title="Página Financeira" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/perfil" 
                element={
                  <ProtectedRoute>
                    <PlaceholderPage title="Página de Perfil" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/taxas" 
                element={
                  <ProtectedRoute>
                    <PlaceholderPage title="Página de Minhas Taxas" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/checkouts" 
                element={
                  <ProtectedRoute>
                    <PlaceholderPage title="Página de Checkouts" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/notificações" 
                element={
                  <ProtectedRoute>
                    <PlaceholderPage title="Página de Notificações" />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
