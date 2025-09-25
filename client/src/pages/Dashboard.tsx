import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Layout } from '@/components/Layout';
import { BarChart3, AlertTriangle, CheckCircle, DollarSign, RefreshCw, Plus, Search, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user?.tenantId,
  });

  const { data: probes, refetch: refetchProbes } = useQuery({
    queryKey: ['/api/probes'],
    enabled: !!user,
  });

  const handleRefresh = () => {
    refetchStats();
    refetchProbes();
  };

  const filteredProbes = (probes as any[] || []).filter((probe: any) =>
    probe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    probe.url?.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="p-4 sm:p-6 overflow-y-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Dashboard</h1>
              <p className="text-muted-foreground mt-1 sm:hidden">Monitor your websites, APIs, and services in real-time</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Probes</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-probes">
                    {(stats as any)?.totalProbes || 0}
                  </p>
                  <p className="text-xs text-secondary mt-1">
                    <span className="inline-flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active monitoring
                    </span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                  <p className="text-2xl font-bold text-destructive" data-testid="text-active-alerts">
                    {(stats as any)?.activeAlerts || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall Uptime</p>
                  <p className="text-2xl font-bold text-secondary" data-testid="text-uptime">
                    {(stats as any)?.overallUptime ? `${(stats as any).overallUptime}%` : '100%'}
                  </p>
                  <p className="text-xs text-secondary mt-1">Last 30 days</p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Probe Status Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Probe Status</CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search probes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                    data-testid="input-search"
                  />
                </div>
                <Button variant="outline" size="icon" data-testid="button-filter" className="w-10 h-10 sm:h-auto">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-muted-foreground">Probe</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-muted-foreground hidden md:table-cell">Response Time</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-muted-foreground hidden lg:table-cell">Last Check</th>
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProbes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No probes found. Create your first probe to start monitoring.
                      </td>
                    </tr>
                  ) : (
                    filteredProbes.map((probe: any) => (
                      <tr key={probe.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-2 sm:px-4">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-3 ${
                              probe.status === 'Up' ? 'bg-secondary' : 
                              probe.status === 'Down' ? 'bg-destructive' : 'bg-amber-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-foreground truncate" data-testid={`text-probe-name-${probe.id}`}>
                                {probe.name}
                              </div>
                              <div className="text-sm text-muted-foreground truncate" data-testid={`text-probe-url-${probe.id}`}>
                                {probe.url}
                              </div>
                              <div className="sm:hidden mt-1">
                                {getTypeBadge(probe.type)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2 sm:px-4 hidden sm:table-cell">
                          {getTypeBadge(probe.type)}
                        </td>
                        <td className="py-4 px-2 sm:px-4">
                          {getStatusBadge(probe.status || 'Up')}
                        </td>
                        <td className="py-4 px-2 sm:px-4 text-sm text-foreground hidden md:table-cell">
                          {probe.responseTime ? `${probe.responseTime}ms` : '-'}
                        </td>
                        <td className="py-4 px-2 sm:px-4 text-sm text-muted-foreground hidden lg:table-cell">
                          {probe.lastCheck ? new Date(probe.lastCheck).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-4 px-2 sm:px-4">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2">
                            <Button variant="ghost" size="sm" data-testid={`button-edit-${probe.id}`} className="text-xs sm:text-sm">
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-view-${probe.id}`} className="text-xs sm:text-sm">
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
