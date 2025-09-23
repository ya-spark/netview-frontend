import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, Settings, Eye, Activity, Shield, Bell, 
  Server, Users, AlertTriangle, Map, FileText, 
  Filter, Search, Bookmark, FileBarChart 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

// Dashboard Sidebar Component
function DashboardSidebar() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
  });

  const { data: gateways } = useQuery({
    queryKey: ['/api/gateways'],
    enabled: !!user,
  });

  // Mock critical notifications - will be replaced with real data
  const mockNotifications = [
    { id: 1, message: "API Service down", severity: "critical", time: "2 min ago" },
    { id: 2, message: "High response time", severity: "warning", time: "5 min ago" },
    { id: 3, message: "SSL cert expiring", severity: "info", time: "1 hour ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Overview */}
      <Card className="bg-accent">
        <CardContent className="p-4">
          <div className="text-sm font-medium text-accent-foreground mb-2">Quick Overview</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active Probes</span>
              <span className="font-medium text-secondary" data-testid="text-active-probes">
                {(stats as any)?.totalProbes || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Alerts</span>
              <span className="font-medium text-destructive" data-testid="text-alerts">
                {(stats as any)?.activeAlerts || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Credits</span>
              <span className="font-medium text-foreground" data-testid="text-credits">
                {(stats as any)?.creditsUsed || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gateway Status */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-medium text-foreground mb-3">Gateway Status</div>
        <div className="space-y-2">
          {gateways && Array.isArray(gateways) && gateways.length > 0 ? (
            gateways.map((gateway: any) => (
              <div key={gateway.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    gateway.isOnline ? 'bg-secondary' : 'bg-destructive'
                  }`} />
                  <span className="text-muted-foreground">{gateway.name}</span>
                </div>
                <Badge 
                  variant={gateway.isOnline ? "secondary" : "destructive"}
                  className="text-xs"
                >
                  {gateway.isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">No gateways available</div>
          )}
        </div>
      </div>

      {/* Critical Notifications */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-medium text-foreground mb-3">Critical Notifications</div>
        <div className="space-y-2">
          {mockNotifications.map((notification) => (
            <div key={notification.id} className="p-2 rounded-md bg-accent/50 border border-border">
              <div className="flex items-start space-x-2">
                <AlertTriangle className={`w-3 h-3 mt-0.5 ${
                  notification.severity === 'critical' ? 'text-destructive' :
                  notification.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{notification.time}</p>
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
  const hash = location.includes('#') ? location.split('#')[1] : '';
  
  const manageNavigation = [
    { name: 'Probes', href: '/manage#probes', icon: Activity, current: hash === 'probes' || (location === '/manage' && hash === '') },
    { name: 'Notifications', href: '/manage#notifications', icon: Bell, current: hash === 'notifications' },
    { name: 'Gateways', href: '/manage#gateways', icon: Server, current: hash === 'gateways' },
  ];

  return (
    <div className="space-y-6">
      <nav className="space-y-1">
        <div className="text-sm font-medium text-foreground mb-3">Manage</div>
        {manageNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={item.current ? "default" : "ghost"}
                className={`w-full justify-start ${
                  item.current
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                data-testid={`nav-manage-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
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

// Monitor Sidebar Component
function MonitorSidebar() {
  const [location] = useLocation();
  const hash = location.includes('#') ? location.split('#')[1] : '';
  
  const monitorNavigation = [
    { name: 'Overview', href: '/monitor#overview', icon: Eye, current: hash === 'overview' || (location === '/monitor' && hash === '') },
    { name: 'Critical Alerts', href: '/monitor#alerts', icon: AlertTriangle, current: hash === 'alerts' },
    { name: 'Map', href: '/monitor#map', icon: Map, current: hash === 'map' },
    { name: 'Logs', href: '/monitor#logs', icon: FileText, current: hash === 'logs' },
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
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                data-testid={`nav-monitor-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
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
  const hash = location.includes('#') ? location.split('#')[1] : '';
  
  const reportsNavigation = [
    { name: 'Uptime', href: '/reports#uptime', icon: BarChart3, current: hash === 'uptime' || (location === '/reports' && hash === '') },
  ];

  const comingSoonReports = [
    { name: 'Performance', icon: Activity },
    { name: 'SLA', icon: Shield },
    { name: 'Custom', icon: FileBarChart },
  ];

  const savedReports = [
    { name: 'Weekly Summary', type: 'Uptime' },
    { name: 'Monthly SLA', type: 'SLA' },
    { name: 'Performance Trends', type: 'Performance' },
  ];

  return (
    <div className="space-y-6">
      {/* Report Types */}
      <nav className="space-y-1">
        <div className="text-sm font-medium text-foreground mb-3">Report Types</div>
        {reportsNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={item.current ? "default" : "ghost"}
                className={`w-full justify-start ${
                  item.current
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                data-testid={`nav-reports-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
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
              data-testid={`nav-reports-${item.name.toLowerCase().replace(/\s+/g, '-')}-coming-soon`}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.name} (Coming Soon)
            </Button>
          );
        })}
      </nav>

      {/* Saved Reports */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-medium text-foreground mb-3">Saved Reports</div>
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
                <div className="text-xs text-muted-foreground">{report.type}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="border-t border-border pt-4">
        <div className="text-sm font-medium text-foreground mb-3">Filters</div>
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="button-search-filter"
          >
            <Search className="mr-3 h-4 w-4" />
            Search
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            data-testid="button-advanced-filter"
          >
            <Filter className="mr-3 h-4 w-4" />
            Advanced Filters
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Sidebar Component
export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Determine which sidebar content to show based on current route
  const getSidebarContent = () => {
    if (location.startsWith('/dashboard')) {
      return <DashboardSidebar />;
    } else if (location.startsWith('/manage')) {
      return <ManageSidebar />;
    } else if (location.startsWith('/monitor')) {
      return <MonitorSidebar />;
    } else if (location.startsWith('/reports')) {
      return <ReportsSidebar />;
    }
    
    // Default to Dashboard sidebar for any other route
    return <DashboardSidebar />;
  };

  return (
    <aside className="w-64 bg-card border-r border-border hidden lg:block">
      <div className="p-6">
        {getSidebarContent()}
      </div>
    </aside>
  );
}
