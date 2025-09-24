import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Eye, Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Monitor() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: probes } = useQuery({
    queryKey: ['/api/probes'],
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user?.tenantId,
  });

  // Mock probe results for demonstration
  const mockProbeResults = [
    { id: '1', status: 'Up', responseTime: 245, timestamp: new Date(Date.now() - 2 * 60 * 1000) },
    { id: '2', status: 'Down', responseTime: 0, timestamp: new Date(Date.now() - 5 * 60 * 1000) },
    { id: '3', status: 'Up', responseTime: 1250, timestamp: new Date(Date.now() - 7 * 60 * 1000) },
    { id: '4', status: 'Up', responseTime: 189, timestamp: new Date(Date.now() - 10 * 60 * 1000) },
  ];

  const filteredProbes = (probes as any[] || []).filter((probe: any) => {
    const matchesSearch = probe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         probe.url?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || probe.status === statusFilter;
    const matchesType = typeFilter === 'all' || probe.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Up':
        return <CheckCircle className="w-4 h-4 text-secondary" />;
      case 'Down':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'Warning':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

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
      <div className="p-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Monitor</h1>
          <p className="text-muted-foreground">Real-time monitoring and historical data for your probes</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Probes</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-probes">
                    {(stats as any)?.totalProbes || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Up</p>
                  <p className="text-2xl font-bold text-secondary" data-testid="text-probes-up">
                    {filteredProbes.filter((p: any) => p.status === 'Up').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Down</p>
                  <p className="text-2xl font-bold text-destructive" data-testid="text-probes-down">
                    {filteredProbes.filter((p: any) => p.status === 'Down').length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-avg-response">
                    {Math.round(mockProbeResults.reduce((acc, r) => acc + r.responseTime, 0) / mockProbeResults.length)}ms
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search probes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Up">Up</SelectItem>
              <SelectItem value="Down">Down</SelectItem>
              <SelectItem value="Warning">Warning</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32" data-testid="select-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Uptime">Uptime</SelectItem>
              <SelectItem value="API">API</SelectItem>
              <SelectItem value="Security">Security</SelectItem>
              <SelectItem value="Browser">Browser</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" data-testid="button-advanced-filter">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Probe List */}
        <div className="space-y-4">
          {filteredProbes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No probes to monitor</h3>
                <p className="text-muted-foreground">Create probes in the Manage section to start monitoring</p>
              </CardContent>
            </Card>
          ) : (
            filteredProbes.map((probe: any) => (
              <Card key={probe.id} className="hover:shadow-md transition-shadow" data-testid={`probe-monitor-${probe.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(probe.status || 'Up')}
                      <div>
                        <h3 className="text-lg font-semibold text-foreground" data-testid={`text-probe-name-${probe.id}`}>
                          {probe.name}
                        </h3>
                        <p className="text-sm text-muted-foreground" data-testid={`text-probe-url-${probe.id}`}>
                          {probe.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getTypeBadge(probe.type)}
                      {getStatusBadge(probe.status || 'Up')}
                      <Button variant="outline" size="sm" data-testid={`button-view-details-${probe.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                      <TabsTrigger value="logs">Logs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-sm text-muted-foreground">Response Time</div>
                          <div className="text-xl font-semibold text-foreground">
                            {probe.responseTime || 245}ms
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-sm text-muted-foreground">Uptime (24h)</div>
                          <div className="text-xl font-semibold text-secondary">
                            {probe.uptime || '99.8%'}
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-sm text-muted-foreground">Check Interval</div>
                          <div className="text-xl font-semibold text-foreground">
                            {probe.checkInterval}s
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-sm text-muted-foreground">Last Check</div>
                          <div className="text-xl font-semibold text-foreground">
                            {probe.lastCheck ? new Date(probe.lastCheck).toLocaleTimeString() : '2 min ago'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Response Time Chart Placeholder */}
                      <div className="chart-placeholder">
                        Response Time Chart (Last 24 hours)
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-4 font-medium text-muted-foreground">Timestamp</th>
                              <th className="text-left py-2 px-4 font-medium text-muted-foreground">Status</th>
                              <th className="text-left py-2 px-4 font-medium text-muted-foreground">Response Time</th>
                              <th className="text-left py-2 px-4 font-medium text-muted-foreground">Status Code</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mockProbeResults.map((result, index) => (
                              <tr key={index} className="border-b border-border">
                                <td className="py-2 px-4 text-sm text-foreground">
                                  {result.timestamp.toLocaleString()}
                                </td>
                                <td className="py-2 px-4">
                                  {getStatusBadge(result.status)}
                                </td>
                                <td className="py-2 px-4 text-sm text-foreground">
                                  {result.responseTime > 0 ? `${result.responseTime}ms` : '-'}
                                </td>
                                <td className="py-2 px-4 text-sm text-foreground">
                                  {result.status === 'Up' ? '200' : '500'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>

                    <TabsContent value="logs" className="space-y-4">
                      <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
                        <div className="space-y-2">
                          <div className="text-muted-foreground">[2024-01-15 10:30:00] INFO: Probe execution started</div>
                          <div className="text-secondary">[2024-01-15 10:30:01] SUCCESS: HTTP 200 OK - Response time: 245ms</div>
                          <div className="text-muted-foreground">[2024-01-15 10:25:00] INFO: Probe execution started</div>
                          <div className="text-destructive">[2024-01-15 10:25:01] ERROR: Connection timeout after 5000ms</div>
                          <div className="text-muted-foreground">[2024-01-15 10:20:00] INFO: Probe execution started</div>
                          <div className="text-secondary">[2024-01-15 10:20:01] SUCCESS: HTTP 200 OK - Response time: 189ms</div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
