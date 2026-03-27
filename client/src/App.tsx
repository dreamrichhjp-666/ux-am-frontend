import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Designers from "./pages/Designers";
import DesignerDetail from "./pages/DesignerDetail";
import Schedule from "./pages/Schedule";
import Projects from "./pages/Projects";
import Analytics from "./pages/Analytics";
import Portfolios from "./pages/Portfolios";
import UserManagement from "./pages/UserManagement";
import AppLayout from "./components/AppLayout";
import { usePlatformAuth } from "./contexts/PlatformAuthContext";
import { Loader2 } from "lucide-react";

function AuthenticatedApp() {
  const { isAuthenticated, loading } = usePlatformAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F9FC" }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#7C3AED" }} />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/designers" component={Designers} />
        <Route path="/designers/:id" component={DesignerDetail} />
        <Route path="/portfolios" component={Portfolios} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/projects" component={Projects} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/users" component={UserManagement} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthenticatedApp />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
