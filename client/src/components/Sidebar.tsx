import { Link, Router, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  Sidebar as SidebarWrapper,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  Settings,
  Eye,
  Activity,
  Shield,
  Bell,
  Server,
  Users,
  AlertTriangle,
  Map,
  FileText,
  Filter,
  Search,
  Bookmark,
  FileBarChart,
  CreditCard,
  FileQuestion,
  DollarSign,
  Play,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

// Main Navigation Component for authenticated users
function MainNavigation() {
  const [location] = useLocation();

  const mainNavigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      current: location === "/dashboard",
    },
    {
      name: "Manage",
      href: "/manage",
      icon: Settings,
      current: location === "/manage",
    },
    {
      name: "Monitor",
      href: "/monitor",
      icon: Eye,
      current: location === "/monitor",
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileBarChart,
      current: location === "/reports",
    },
  ];

  return (
    <nav className="space-y-1 mb-6">
      <div className="text-sm font-medium text-foreground mb-3">
        Main Navigation
      </div>
      {mainNavigation.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.name} href={item.href}>
            <Button
              variant={item.current ? "default" : "ghost"}
              className={`w-full justify-start ${
                item.current
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              data-testid={`nav-main-${item.name.toLowerCase()}`}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.name}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

// Dashboard Sidebar Component
function DashboardSidebar() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
  });

  const { data: gateways } = useQuery({
    queryKey: ["/api/gateways"],
    enabled: !!user,
  });

  // Mock critical notifications - will be replaced with real data
  const mockNotifications = [
    {
      id: 1,
      message: "API Service down",
      severity: "critical",
      time: "2 min ago",
    },
    {
      id: 2,
      message: "High response time",
      severity: "warning",
      time: "5 min ago",
    },
    {
      id: 3,
      message: "SSL cert expiring",
      severity: "info",
      time: "1 hour ago",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Navigation */}
      <MainNavigation />

      {/* Quick Overview */}
      <Card className="bg-accent">
        <CardContent className="p-4">
          <div className="text-sm font-medium text-accent-foreground mb-2">
            Quick Overview
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active Probes</span>
              <span
                className="font-medium text-secondary"
                data-testid="text-active-probes"
              >
                {(stats as any)?.totalProbes || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Alerts</span>
              <span
                className="font-medium text-destructive"
                data-testid="text-alerts"
              >
                {(stats as any)?.activeAlerts || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Credits</span>
              <span
                className="font-medium text-foreground"
                data-testid="text-credits"
              >
                {(stats as any)?.creditsUsed || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gateway Status */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-medium text-foreground mb-3">
          Gateway Status
        </div>
        <div className="space-y-2">
          {gateways && Array.isArray(gateways) && gateways.length > 0 ? (
            gateways.map((gateway: any) => (
              <div
                key={gateway.id}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      gateway.isOnline ? "bg-secondary" : 
                      gateway.status === 'pending' ? "bg-amber-500" : "bg-destructive"
                    }`}
                  />
                  <span className="text-muted-foreground">{gateway.name}</span>
                </div>
                <Badge
                  variant={
                    gateway.isOnline ? "secondary" : 
                    gateway.status === 'pending' ? "outline" : "destructive"
                  }
                  className="text-xs"
                >
                  {gateway.isOnline ? "Online" : 
                   gateway.status === 'pending' ? "Pending" : "Offline"}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">
              No gateways available
            </div>
          )}
        </div>
      </div>

      {/* Critical Notifications */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-medium text-foreground mb-3">
          Critical Notifications
        </div>
        <div className="space-y-2">
          {mockNotifications.map((notification) => (
            <div
              key={notification.id}
              className="p-2 rounded-md bg-accent/50 border border-border"
            >
              <div className="flex items-start space-x-2">
                <AlertTriangle
                  className={`w-3 h-3 mt-0.5 ${
                    notification.severity === "critical"
                      ? "text-destructive"
                      : notification.severity === "warning"
                        ? "text-amber-500"
                        : "text-blue-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notification.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Manage Sidebar Component
function ManageSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const hash = location.includes("#") ? location.split("#")[1] : "";

  const handleHashNavigation = (hashValue: string) => {
    window.location.hash = hashValue;
  };

  const manageNavigation = [
    {
      name: "Gateways",
      hash: "gateways",
      icon: Server,
      current: hash === "gateways",
    },
    {
      name: "Probes",
      hash: "probes",
      icon: Activity,
      current: hash === "probes",
    },
    {
      name: "Notification Groups",
      hash: "notifications",
      icon: Bell,
      current: hash === "notifications",
    },
  ];

  const adminNavigation = [
    {
      name: "Billing",
      href: "/billing",
      icon: CreditCard,
      current: location === "/billing",
    },
    {
      name: "Collaborators",
      href: "/collaborators",
      icon: Users,
      current: location === "/collaborators",
      requiresAdminRole: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Navigation */}
      <MainNavigation />

      <nav className="space-y-1">
        <div className="text-sm font-medium text-foreground mb-3">
          Configuration
        </div>
        {manageNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.name}
              variant={item.current ? "default" : "ghost"}
              className={`w-full justify-start ${
                item.current
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => handleHashNavigation(item.hash)}
              data-testid={`nav-manage-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.name}
            </Button>
          );
        })}
      </nav>

      {/* Admin Navigation */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-medium text-foreground mb-3">Account</div>
        <nav className="space-y-1">
          {adminNavigation
            .filter(
              (item) =>
                !item.requiresAdminRole ||
                user?.role === "SuperAdmin" ||
                user?.role === "Owner" ||
                user?.role === "Admin",
            )
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={item.current ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      item.current
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                    data-testid={`nav-account-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
        </nav>
      </div>
    </div>
  );
}

// Monitor Sidebar Component
function MonitorSidebar() {
  const [location] = useLocation();
  const hash = location.includes("#") ? location.split("#")[1] : "";

  const monitorNavigation = [
    {
      name: "Overview",
      href: "/monitor#overview",
      icon: Eye,
      current: hash === "overview" || (location === "/monitor" && hash === ""),
    },
    {
      name: "Critical Alerts",
      href: "/monitor#alerts",
      icon: AlertTriangle,
      current: hash === "alerts",
    },
    {
      name: "Probes",
      href: "/monitor#probes",
      icon: Activity,
      current: hash === "probes",
    },
    {
      name: "Gateways",
      href: "/monitor#gateways",
      icon: Server,
      current: hash === "gateways",
    },
    { name: "Map", href: "/monitor#map", icon: Map, current: hash === "map" },
    {
      name: "Logs",
      href: "/monitor#logs",
      icon: FileText,
      current: hash === "logs",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Navigation */}
      <MainNavigation />

      <nav className="space-y-1">
        <div className="text-sm font-medium text-foreground mb-3">Monitor</div>
        {monitorNavigation.map((item) => {
          const Icon = item.icon;
          const handleClick = () => {
            // Extract hash from href and set it directly
            const hashPart = item.href.split("#")[1];
            window.location.hash = hashPart || "";
          };

          return (
            <Button
              key={item.name}
              onClick={handleClick}
              variant={item.current ? "default" : "ghost"}
              className={`w-full justify-start ${
                item.current
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              data-testid={`nav-monitor-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.name}
            </Button>
          );
        })}
      </nav>
    </div>
  );
}

// Reports Sidebar Component
function ReportsSidebar() {
  const [location] = useLocation();
  const hash = location.includes("#") ? location.split("#")[1] : "";

  const reportsNavigation = [
    {
      name: "Uptime",
      href: "/reports#uptime",
      icon: BarChart3,
      current: hash === "uptime" || (location === "/reports" && hash === ""),
    },
  ];

  const comingSoonReports = [{ name: "Performance", icon: Activity }];

  const savedReports = [
    { name: "Weekly Summary", type: "Uptime" },
    { name: "Monthly SLA", type: "SLA" },
    { name: "Performance Trends", type: "Performance" },
  ];

  return (
    <div className="space-y-6">
      {/* Main Navigation */}
      <MainNavigation />

      {/* Report Types */}
      <nav className="space-y-1">
        <div className="text-sm font-medium text-foreground mb-3">
          Report Types
        </div>
        {reportsNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={item.current ? "default" : "ghost"}
                className={`w-full justify-start ${
                  item.current
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                data-testid={`nav-reports-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          );
        })}

        {/* Coming Soon Reports */}
        {comingSoonReports.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.name}
              variant="ghost"
              disabled
              className="w-full justify-start text-muted-foreground opacity-50"
              data-testid={`nav-reports-${item.name.toLowerCase().replace(/\s+/g, "-")}-coming-soon`}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.name} (Coming Soon)
            </Button>
          );
        })}
      </nav>

      {/* Saved Reports */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-medium text-foreground mb-3">
          Saved Reports
        </div>
        <div className="space-y-2">
          {savedReports.map((report, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              data-testid={`saved-report-${index}`}
            >
              <Bookmark className="mr-3 h-4 w-4" />
              <div className="flex-1 text-left">
                <div className="text-xs font-medium">{report.name}</div>
                <div className="text-xs text-muted-foreground">
                  {report.type}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Public Sidebar Component for non-logged-in users
function PublicSidebar() {
  const [location] = useLocation();

  const publicNavigation = [
    {
      name: "Features",
      href: "/features",
      icon: FileQuestion,
      current: location === "/features",
    },
    {
      name: "Pricing",
      href: "/pricing",
      icon: DollarSign,
      current: location === "/pricing",
    },
    {
      name: "Docs",
      href: "/docs",
      icon: FileText,
      current: location === "/docs",
    },
  ];

  const publicActions = [
    {
      name: "Demo",
      href: "/demo",
      icon: Play,
      variant: "ghost" as const,
      current: location === "/demo",
    },
    {
      name: "Login",
      href: "/login",
      icon: LogIn,
      variant: "outline" as const,
      current: location === "/login",
    },
    {
      name: "Sign Up",
      href: "/signup",
      icon: UserPlus,
      variant: "default" as const,
      current: location === "/signup",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Navigation */}
      <nav className="space-y-1">
        <div className="text-sm font-medium text-foreground mb-3">Explore</div>
        {publicNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={item.current ? "default" : "ghost"}
                className={`w-full justify-start ${
                  item.current
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                data-testid={`nav-public-${item.name.toLowerCase()}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Action Buttons */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-medium text-foreground mb-3">
          Get Started
        </div>
        <div className="space-y-2">
          {publicActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={item.variant}
                  className="w-full justify-start"
                  data-testid={`button-public-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Main Sidebar Component
export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Determine which sidebar content to show based on authentication and current route
  const getSidebarContent = () => {
    // Show public sidebar for non-logged-in users
    if (!user) {
      return <PublicSidebar />;
    }

    // Show appropriate sidebar content for logged-in users
    if (location.startsWith("/dashboard")) {
      return <DashboardSidebar />;
    } else if (
      location.startsWith("/manage") ||
      location === "/billing" ||
      location === "/collaborators"
    ) {
      return <ManageSidebar />;
    } else if (location.startsWith("/monitor")) {
      return <MonitorSidebar />;
    } else if (location.startsWith("/reports")) {
      return <ReportsSidebar />;
    }

    // Default to Dashboard sidebar for any other route
    return <DashboardSidebar />;
  };

  return (
    <SidebarWrapper>
      <SidebarContent>
        <SidebarHeader>
          <div className="p-0">
            <h2 className="text-lg font-semibold text-foreground">
              {!user && "Menu"}
              {user && location.startsWith("/dashboard") && "Dashboard"}
              {user &&
                (location.startsWith("/manage") ||
                  location === "/billing" ||
                  location === "/collaborators") &&
                "Configuration"}
              {user && location.startsWith("/monitor") && "Monitor"}
              {user && location.startsWith("/reports") && "Reports"}
              {user &&
                !location.startsWith("/dashboard") &&
                !location.startsWith("/manage") &&
                !location.startsWith("/monitor") &&
                !location.startsWith("/reports") &&
                location !== "/billing" &&
                location !== "/collaborators" &&
                "Dashboard"}
            </h2>
          </div>
        </SidebarHeader>
        <div className="p-2">{getSidebarContent()}</div>
      </SidebarContent>
    </SidebarWrapper>
  );
}
