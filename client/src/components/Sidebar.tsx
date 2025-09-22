import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Settings, Eye, Activity, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user?.tenantId,
  });

  const { data: gateways } = useQuery({
    queryKey: ['/api/gateways'],
    enabled: !!user,
  });

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      current: location === '/dashboard',
    },
    {
      name: 'Manage',
      href: '/manage',
      icon: Settings,
      current: location === '/manage',
    },
    {
      name: 'Monitor',
      href: '/monitor',
      icon: Eye,
      current: location === '/monitor',
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: Activity,
      current: location === '/reports',
    },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border hidden lg:block">
      <div className="p-6">
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="bg-accent">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-accent-foreground mb-2">Quick Overview</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active Probes</span>
                  <span className="font-medium text-secondary" data-testid="text-active-probes">
                    {stats?.totalProbes || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Alerts</span>
                  <span className="font-medium text-destructive" data-testid="text-alerts">
                    {stats?.activeAlerts || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credits</span>
                  <span className="font-medium text-foreground" data-testid="text-credits">
                    {stats?.creditsUsed || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navigation.map((item) => {
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
                    data-testid={`nav-${item.name.toLowerCase()}`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Gateway Status */}
          <div className="border-t border-border pt-4">
            <div className="text-sm font-medium text-foreground mb-3">Gateway Status</div>
            <div className="space-y-2">
              {gateways?.map((gateway: any) => (
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
              )) || (
                <div className="text-xs text-muted-foreground">No gateways available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
