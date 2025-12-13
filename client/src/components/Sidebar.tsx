import { useEffect, useMemo } from "react";
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
  UserPlus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { DashboardApiService } from "@/services/dashboardApi";
import { ProbeApiService } from "@/services/probeApi";
import { GatewayApiService } from "@/services/gatewayApi";
import type { ProbeResult } from "@/types/probe";
import type { GatewayResponse } from "@/types/gateway";

// Helper function to format time ago
const formatTimeAgo = (timestamp: string): string => {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

// Dashboard Sidebar Component
function DashboardSidebar() {
  const { user, selectedTenant } = useAuth();

  const { data: statsResponse } = useQuery({
    queryKey: ["/api/dashboard"],
    enabled: !!user && !!selectedTenant,
    queryFn: async () => {
      logger.debug('Fetching dashboard stats for sidebar', {
        component: 'Sidebar',
        action: 'fetch_dashboard_stats',
        userId: user?.id,
      });
      return await DashboardApiService.getDashboardStats();
    },
  });

  // Extract stats data and map backend fields to frontend expectations
  const stats = statsResponse?.data ? {
    totalProbes: statsResponse.data.total_probes,
    activeProbes: statsResponse.data.active_probes,
    activeAlerts: statsResponse.data.unresolved_alerts,
    totalAlerts: statsResponse.data.total_alerts,
    creditsUsed: 0, // Not available in dashboard stats
  } : null;

  // Fetch all probes
  const { data: probesData } = useQuery({
    queryKey: ["/api/probes"],
    enabled: !!user && !!selectedTenant,
    queryFn: () => ProbeApiService.listProbes(),
  });

  // Fetch all gateways
  const { data: gatewaysData } = useQuery({
    queryKey: ["/api/gateways"],
    enabled: !!user && !!selectedTenant,
    queryFn: () => GatewayApiService.listGateways(),
  });

  // Fetch probe results for all probes (last result for each)
  // Include selectedTenant.id in query key to refetch when tenant changes
  const { data: probeResultsData } = useQuery({
    queryKey: ["/api/probe-results", selectedTenant?.id],
    queryFn: async () => {
      if (!probesData?.data) return {};
      const results: Record<string, ProbeResult[]> = {};
      await Promise.all(
        probesData.data.map(async (probe) => {
          try {
            const response = await ProbeApiService.getProbeResults(probe.id, { limit: 1 });
            results[probe.id] = response.data;
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.debug('Failed to fetch probe results', {
              component: 'Sidebar',
              action: 'fetch_probe_results',
              probeId: probe.id,
            }, err);
            results[probe.id] = [];
          }
        })
      );
      return results;
    },
    enabled: !!user && !!selectedTenant && !!probesData?.data,
  });

  // Calculate critical notifications from real data
  const criticalNotifications = useMemo(() => {
    const notifications: Array<{
      id: string;
      message: string;
      severity: "critical";
      time: string;
      timestamp: string;
    }> = [];

    // Check for down probes
    if (probesData?.data && probeResultsData) {
      probesData.data.forEach((probe) => {
        if (!probe.is_active) return;
        
        const results = probeResultsData[probe.id] || [];
        const latestResult = results[0];
        
        if (latestResult && latestResult.status === 'Failure') {
          notifications.push({
            id: `probe-${probe.id}`,
            message: `Probe "${probe.name}" is down`,
            severity: "critical",
            time: formatTimeAgo(latestResult.checked_at),
            timestamp: latestResult.checked_at,
          });
        }
      });
    }

    // Check for offline gateways
    if (gatewaysData?.data) {
      gatewaysData.data.forEach((gateway) => {
        // Only consider active gateways that are offline (not pending or revoked)
        if (gateway.status === 'active' && !gateway.is_online) {
          notifications.push({
            id: `gateway-${gateway.id}`,
            message: `Gateway "${gateway.name}" is offline`,
            severity: "critical",
            time: gateway.last_heartbeat ? formatTimeAgo(gateway.last_heartbeat) : "Unknown",
            timestamp: gateway.last_heartbeat || gateway.updated_at,
          });
        }
      });
    }

    // Sort by timestamp (most recent first)
    return notifications.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [probesData, probeResultsData, gatewaysData]);

  // Log when data is loaded
  useEffect(() => {
    if (stats || gatewaysData) {
      logger.debug('Sidebar data loaded', {
        component: 'Sidebar',
        action: 'data_loaded',
        hasStats: !!stats,
        gatewayCount: gatewaysData?.data?.length || 0,
        probeCount: probesData?.data?.length || 0,
        criticalNotificationsCount: criticalNotifications.length,
        userId: user?.id,
      });
    }
  }, [stats, gatewaysData, probesData, criticalNotifications.length, user?.id]);

  return (
    <div className="space-y-6">
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
                {stats?.activeProbes || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Alerts</span>
              <span
                className="font-medium text-destructive"
                data-testid="text-alerts"
              >
                {stats?.activeAlerts || 0}
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
          {gatewaysData && Array.isArray(gatewaysData?.data) && gatewaysData.data.length > 0 ? (
            gatewaysData.data.map((gateway: GatewayResponse) => (
              <div
                key={gateway.id}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      gateway.is_online ? "bg-secondary" : 
                      gateway.status === 'pending' ? "bg-amber-500" : "bg-destructive"
                    }`}
                  />
                  <span className="text-muted-foreground">{gateway.name}</span>
                </div>
                <Badge
                  className={`text-xs ${
                    gateway.is_online 
                      ? 'bg-green-100 text-green-700 border-green-200' 
                      : gateway.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      : gateway.status === 'revoked'
                      ? 'bg-gray-100 text-gray-700 border-gray-200'
                      : 'bg-red-100 text-red-700 border-red-200'
                  }`}
                >
                  {gateway.is_online ? "Online" : 
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
          {criticalNotifications.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-2">
              No critical notifications
            </div>
          ) : (
            criticalNotifications.map((notification) => (
              <div
                key={notification.id}
                className="p-2 rounded-md bg-accent/50 border border-border"
              >
                <div className="flex items-start space-x-2">
                  <AlertTriangle
                    className="w-3 h-3 mt-0.5 text-destructive"
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Manage Sidebar Component
function ManageSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const manageNavigation = [
    {
      name: "Probes",
      href: "/manage/probes",
      icon: Activity,
      current: location.startsWith("/manage/probes") || location === "/manage",
    },
    {
      name: "Gateways",
      href: "/manage/gateways",
      icon: Server,
      current: location.startsWith("/manage/gateways"),
    },
    {
      name: "Notification Groups",
      href: "/manage/notifications",
      icon: Bell,
      current: location.startsWith("/manage/notifications"),
    },
  ];

  const adminNavigation = [
    {
      name: "Billing",
      href: "/manage/billing",
      icon: CreditCard,
      current: location === "/manage/billing" || location === "/billing",
    },
    {
      name: "Settings",
      href: "/manage/settings",
      icon: Settings,
      current: location === "/manage/settings" || location === "/settings",
    },
    {
      name: "Collaborators",
      href: "/manage/collaborators",
      icon: Users,
      current: location === "/manage/collaborators" || location === "/collaborators",
      requiresAdminRole: true,
    },
  ];

  return (
    <div className="space-y-6">
      <nav className="space-y-1">
        <div className="text-sm font-medium text-foreground mb-3">
          Configuration
        </div>
        {manageNavigation.map((item) => {
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
                data-testid={`nav-manage-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
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

  const monitorNavigation = [
    {
      name: "Overview",
      href: "/monitor/overview",
      icon: Eye,
      current: location === "/monitor/overview" || location === "/monitor",
    },
    {
      name: "Critical Alerts",
      href: "/monitor/alerts",
      icon: AlertTriangle,
      current: location.startsWith("/monitor/alerts"),
    },
    {
      name: "Probes",
      href: "/monitor/probes",
      icon: Activity,
      current: location.startsWith("/monitor/probes"),
    },
    {
      name: "Gateways",
      href: "/monitor/gateways",
      icon: Server,
      current: location.startsWith("/monitor/gateways"),
    },
    {
      name: "Map",
      href: "/monitor/map",
      icon: Map,
      current: location === "/monitor/map",
    },
    {
      name: "Logs",
      href: "/monitor/logs",
      icon: FileText,
      current: location === "/monitor/logs",
    },
  ];

  return (
    <div className="space-y-6">
      <nav className="space-y-1">
        <div className="text-sm font-medium text-foreground mb-3">Monitor</div>
        {monitorNavigation.map((item) => {
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
                data-testid={`nav-monitor-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
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
      location === "/settings" ||
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
                  location === "/settings" ||
                  location === "/collaborators") &&
                "Manage"}
              {user && location.startsWith("/monitor") && "Monitor"}
              {user && location.startsWith("/reports") && "Reports"}
              {user &&
                !location.startsWith("/dashboard") &&
                !location.startsWith("/manage") &&
                !location.startsWith("/monitor") &&
                !location.startsWith("/reports") &&
                location !== "/billing" &&
                location !== "/settings" &&
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
