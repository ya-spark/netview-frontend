import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Layout } from '@/components/Layout';
import { BarChart3, AlertTriangle, CheckCircle, DollarSign, RefreshCw, Plus, Search, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProbeUtils } from '@/services/probeApi';
import { logger } from '@/lib/logger';
import type { Probe } from '@/types/probe';

// Mock data
const mockStats = {
  totalProbes: 8,
  activeAlerts: 2,
  overallUptime: 99.5,
};

const mockProbes = {
  data: [
    {
      id: '1',
      name: 'Main Website',
      url: 'https://example.com',
      type: 'Uptime',
      status: 'Up',
      responseTime: 245,
      lastCheck: new Date().toISOString(),
      tenant_id: 1,
      category: 'Uptime' as const,
      probe_type: 'HTTP/HTTPS' as const,
      gateway_type: 'Core' as const,
      gateway_id: null,
      notification_group_id: null,
      check_interval: 300,
      timeout: 30,
      retries: 3,
      configuration: { url: 'https://example.com' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'API Endpoint',
      url: 'https://api.example.com/health',
      type: 'API',
      status: 'Up',
      responseTime: 128,
      lastCheck: new Date(Date.now() - 60000).toISOString(),
      tenant_id: 1,
      category: 'API' as const,
      probe_type: 'HTTP/HTTPS' as const,
      gateway_type: 'Core' as const,
      gateway_id: null,
      notification_group_id: null,
      check_interval: 300,
      timeout: 30,
      retries: 3,
      configuration: { url: 'https://api.example.com/health' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Database Server',
      url: 'db.example.com',
      type: 'Uptime',
      status: 'Down',
      responseTime: null,
      lastCheck: new Date(Date.now() - 300000).toISOString(),
      tenant_id: 1,
      category: 'Uptime' as const,
      probe_type: 'ICMP/Ping' as const,
      gateway_type: 'Core' as const,
      gateway_id: null,
      notification_group_id: null,
      check_interval: 300,
      timeout: 30,
      retries: 3,
      configuration: { host: 'db.example.com' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'SSL Certificate',
      url: 'https://secure.example.com',
      type: 'Security',
      status: 'Up',
      responseTime: 89,
      lastCheck: new Date(Date.now() - 120000).toISOString(),
      tenant_id: 1,
      category: 'Security' as const,
      probe_type: 'SSL/TLS' as const,
      gateway_type: 'Core' as const,
      gateway_id: null,
      notification_group_id: null,
      check_interval: 3600,
      timeout: 30,
      retries: 3,
      configuration: { url: 'https://secure.example.com' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Payment Gateway',
      url: 'https://payments.example.com',
      type: 'API',
      status: 'Warning',
      responseTime: 1250,
      lastCheck: new Date(Date.now() - 180000).toISOString(),
      tenant_id: 1,
      category: 'API' as const,
      probe_type: 'HTTP/HTTPS' as const,
      gateway_type: 'Core' as const,
      gateway_id: null,
      notification_group_id: null,
      check_interval: 300,
      timeout: 30,
      retries: 3,
      configuration: { url: 'https://payments.example.com' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '6',
      name: 'DNS Resolution',
      url: 'example.com',
      type: 'Security',
      status: 'Up',
      responseTime: 45,
      lastCheck: new Date(Date.now() - 240000).toISOString(),
      tenant_id: 1,
      category: 'Security' as const,
      probe_type: 'DNS Resolution' as const,
      gateway_type: 'Core' as const,
      gateway_id: null,
      notification_group_id: null,
      check_interval: 600,
      timeout: 30,
      retries: 3,
      configuration: { domain: 'example.com' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '7',
      name: 'User Dashboard',
      url: 'https://dashboard.example.com',
      type: 'Browser',
      status: 'Up',
      responseTime: 567,
      lastCheck: new Date(Date.now() - 90000).toISOString(),
      tenant_id: 1,
      category: 'Browser' as const,
      probe_type: 'HTTP/HTTPS' as const,
      gateway_type: 'Core' as const,
      gateway_id: null,
      notification_group_id: null,
      check_interval: 300,
      timeout: 30,
      retries: 3,
      configuration: { url: 'https://dashboard.example.com' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '8',
      name: 'Backup Service',
      url: 'https://backup.example.com/status',
      type: 'API',
      status: 'Down',
      responseTime: null,
      lastCheck: new Date(Date.now() - 600000).toISOString(),
      tenant_id: 1,
      category: 'API' as const,
      probe_type: 'HTTP/HTTPS' as const,
      gateway_type: 'Core' as const,
      gateway_id: null,
      notification_group_id: null,
      check_interval: 300,
      timeout: 30,
      retries: 3,
      configuration: { url: 'https://backup.example.com/status' },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

export default function Dashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Using mock data instead of API calls
  const stats = mockStats;
  const probes = mockProbes;

  useEffect(() => {
    logger.debug('Dashboard page initialized', {
      component: 'Dashboard',
      userId: user?.id,
      probeCount: probes.data?.length || 0,
    });
  }, [user?.id, probes.data?.length]);

  const handleRefresh = () => {
    logger.info('Dashboard refresh requested', {
      component: 'Dashboard',
      action: 'refresh',
      userId: user?.id,
    });
    // Mock refresh - no API calls
  };

  const filteredProbes = (probes.data || []).filter((probe: any) =>
    probe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ProbeUtils.getConfigDisplay(probe as Probe).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Up':
        return <Badge variant="secondary" className="bg-secondary/10 text-secondary">Up</Badge>;
      case 'Down':
        return <Badge variant="destructive">Down</Badge>;
      case 'Warning':
        return <Badge variant="outline" className="border-amber-500 text-amber-700">Slow</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      'Uptime': 'bg-primary/10 text-primary',
      'API': 'bg-secondary/10 text-secondary',
      'Security': 'bg-purple-100 text-purple-700',
      'Browser': 'bg-green-100 text-green-700',
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-muted text-muted-foreground'}>
        {type}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2" data-testid="text-page-title">Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:hidden">Monitor your websites, APIs, and services in real-time</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh" className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button data-testid="button-new-probe" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Probe
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground hidden sm:block">Monitor your websites, APIs, and services in real-time</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Probes</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-1" data-testid="text-total-probes">
                    {stats.totalProbes}
                  </p>
                  <p className="text-xs text-secondary mt-1">
                    <span className="inline-flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active monitoring
                    </span>
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active Alerts</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-destructive mt-1" data-testid="text-active-alerts">
                    {stats.activeAlerts}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Overall Uptime</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-secondary mt-1" data-testid="text-uptime">
                    {stats.overallUptime}%
                  </p>
                  <p className="text-xs text-secondary mt-1">Last 30 days</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Probe Status Table */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <CardTitle className="text-base sm:text-lg">Probe Status</CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search probes..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      logger.debug('Dashboard search term changed', {
                        component: 'Dashboard',
                        action: 'search',
                        searchTerm: e.target.value,
                        userId: user?.id,
                      });
                    }}
                    className="pl-10 w-full sm:w-64"
                    data-testid="input-search"
                  />
                </div>
                <Button variant="outline" size="icon" data-testid="button-filter" className="w-full sm:w-10 h-10 sm:h-auto">
                  <Filter className="w-4 h-4" />
                  <span className="ml-2 sm:hidden">Filter</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Probe</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden md:table-cell">Response Time</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden lg:table-cell">Last Check</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProbes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 sm:py-8 px-3 text-sm sm:text-base text-muted-foreground">
                        No probes found. Create your first probe to start monitoring.
                      </td>
                    </tr>
                  ) : (
                    filteredProbes.map((probe: any) => (
                      <tr key={probe.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-3 sm:py-4 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              probe.status === 'Up' ? 'bg-secondary' : 
                              probe.status === 'Down' ? 'bg-destructive' : 'bg-amber-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-medium text-foreground truncate" data-testid={`text-probe-name-${probe.id}`}>
                                {probe.name}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate" data-testid={`text-probe-url-${probe.id}`}>
                                {probe.url}
                              </div>
                              <div className="sm:hidden mt-1">
                                {getTypeBadge(probe.type)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 hidden sm:table-cell">
                          {getTypeBadge(probe.type)}
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4">
                          {getStatusBadge(probe.status || 'Up')}
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm text-foreground hidden md:table-cell">
                          {probe.responseTime ? `${probe.responseTime}ms` : '-'}
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">
                          {probe.lastCheck ? new Date(probe.lastCheck).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
                            <Button variant="ghost" size="sm" data-testid={`button-edit-${probe.id}`} className="text-xs px-2 py-1 h-auto">
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-view-${probe.id}`} className="text-xs px-2 py-1 h-auto">
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
