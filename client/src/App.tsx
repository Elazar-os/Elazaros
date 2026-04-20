import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import DatabaseView from "@/pages/DatabaseView";
import Login from "@/pages/Login";
import Manager from "@/pages/Manager";
import Boss from "@/pages/Boss";
import Settings from "@/pages/Settings";
import NavMenu from "@/components/NavMenu";

function AdminRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className='min-h-screen flex flex-col'>
      <NavMenu />
      <div className='pt-16 flex-1'>
        <Switch>
          <Route path="/">
            <Redirect to="/admin/dashboard" />
          </Route>
          <Route path="/admin">
            <Redirect to="/admin/dashboard" />
          </Route>
          <Route path="/admin/dashboard" component={Dashboard} />
          <Route path="/admin/menu" component={Admin} />
          <Route path="/admin/settings" component={Settings} />
          <Route path="/database" component={DatabaseView} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  if (location === '/manager') {
    return <Manager />;
  }

  if (location.startsWith('/boss')) {
    return <Boss />;
  }

  return <AdminRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
