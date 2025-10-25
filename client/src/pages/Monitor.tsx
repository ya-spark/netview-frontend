import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Eye, Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, Bell, Server, MapPin, FileText, Plus, Settings, Construction, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Monitor() {
  const { user } = useAuth();
  const [currentSection, setCurrentSection] = useState(() => {
    // Get initial hash from window.location.hash
    const hash = window.location.hash.slice(1); // Remove the '#' prefix
    return hash || "overview";
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpansion = (probeId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(probeId)) {
        newSet.delete(probeId);
      } else {
        newSet.add(probeId);
      }
      return newSet;
    });
  };

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the '#' prefix
      const newSection = hash || "overview";
      console.log('Hash changed:', hash, 'New section:', newSection);
      setCurrentSection(newSection);
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

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

  // Mock alerts data
  const mockAlerts = [
    { id: '1', title: 'API Gateway Down', severity: 'critical', status: 'active', time: '2 min ago', probe: 'Production API' },
    { id: '2', title: 'High Response Time', severity: 'warning', status: 'active', time: '5 min ago', probe: 'E-commerce Site' },
    { id: '3', title: 'SSL Certificate Expiry', severity: 'warning', status: 'acknowledged', time: '1 hour ago', probe: 'Main Website' },
    { id: '4', title: 'Database Connection Error', severity: 'critical', status: 'resolved', time: '3 hours ago', probe: 'User Service' },
  ];

  // Mock gateways data
  const mockGateways = [
    { id: '1', name: 'US East Gateway', region: 'us-east-1', status: 'healthy', probes: 24, latency: 45 },
    { id: '2', name: 'EU West Gateway', region: 'eu-west-1', status: 'healthy', probes: 18, latency: 62 },
    { id: '3', name: 'Asia Pacific Gateway', region: 'ap-southeast-1', status: 'degraded', probes: 12, latency: 180 },
    { id: '4', name: 'US West Gateway', region: 'us-west-2', status: 'healthy', probes: 30, latency: 38 },
  ];

  // Mock logs data
  const mockLogs = [
    { id: '1', timestamp: new Date(Date.now() - 1 * 60 * 1000), level: 'INFO', source: 'Monitor Service', message: 'Probe execution completed for api.example.com' },
    { id: '2', timestamp: new Date(Date.now() - 3 * 60 * 1000), level: 'ERROR', source: 'Gateway US-East', message: 'Failed to connect to target: connection timeout after 5000ms' },
    { id: '3', timestamp: new Date(Date.now() - 7 * 60 * 1000), level: 'WARN', source: 'Alert Manager', message: 'High response time detected for e-commerce.example.com (1250ms)' },
    { id: '4', timestamp: new Date(Date.now() - 15 * 60 * 1000), level: 'INFO', source: 'Monitor Service', message: 'Probe configuration updated for production-db' },
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-amber-500 text-amber-700">Warning</Badge>;
      case 'info':
        return <Badge variant="outline">Info</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getAlertStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="destructive">Active</Badge>;
      case 'acknowledged':
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Acknowledged</Badge>;
      case 'resolved':
        return <Badge variant="secondary">Resolved</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getLogLevelBadge = (level: string) => {
    switch (level) {
      case 'ERROR':
        return <Badge variant="destructive" className="font-mono text-xs">ERROR</Badge>;
      case 'WARN':
        return <Badge variant="outline" className="border-amber-500 text-amber-700 font-mono text-xs">WARN</Badge>;
      case 'INFO':
        return <Badge variant="outline" className="font-mono text-xs">INFO</Badge>;
      default:
        return <Badge variant="outline" className="font-mono text-xs">DEBUG</Badge>;
    }
  };

  const renderCriticalAlertsSection = () => (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-alerts-title">Critical Alerts</h2>
          <p className="text-muted-foreground">Monitor and manage system alerts</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" data-testid="button-alert-settings" className="w-full sm:w-auto">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button data-testid="button-create-alert" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Create Alert
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-destructive" data-testid="text-active-alerts">
                  {mockAlerts.filter(a => a.status === 'active').length}
                </p>
              </div>
              <Bell className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-destructive" data-testid="text-critical-alerts">
                  {mockAlerts.filter(a => a.severity === 'critical').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Acknowledged</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-acknowledged-alerts">
                  {mockAlerts.filter(a => a.status === 'acknowledged').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved (24h)</p>
                <p className="text-2xl font-bold text-secondary" data-testid="text-resolved-alerts">
                  {mockAlerts.filter(a => a.status === 'resolved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAlerts.map((alert) => (
              <div key={alert.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4" data-testid={`alert-${alert.id}`}>
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alert.severity === 'critical' ? 'text-destructive' : 'text-amber-500'}`} />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-foreground truncate" data-testid={`text-alert-title-${alert.id}`}>
                      {alert.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {alert.probe} • {alert.time}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <div className="flex flex-wrap gap-1">
                    {getSeverityBadge(alert.severity)}
                    {getAlertStatusBadge(alert.status)}
                  </div>
                  <Button variant="outline" size="sm" data-testid={`button-alert-details-${alert.id}`} className="w-full sm:w-auto">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderProbesSection = () => (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-probes-title">Probes</h2>
          <p className="text-muted-foreground">Manage and configure monitoring probes</p>
        </div>
        <Button data-testid="button-create-probe" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Probe
        </Button>
      </div>

      {/* Probe Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Probes</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-probes">
                  {filteredProbes.length || 4}
                </p>
              </div>
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-secondary" data-testid="text-active-probes">
                  {filteredProbes.filter((p: any) => p.status === 'Up').length || 3}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-destructive" data-testid="text-failed-probes">
                  {filteredProbes.filter((p: any) => p.status === 'Down').length || 1}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-avg-response">
                  421ms
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search probes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
                data-testid="input-search-probes"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32" data-testid="select-status-filter">
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
                <SelectTrigger className="w-full sm:w-32" data-testid="select-type-filter">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Probes List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Probes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 sm:px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">URL</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Response Time</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProbes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No probes found. Create a probe to start monitoring.
                    </td>
                  </tr>
                ) : (
                  filteredProbes.map((probe: any) => (
                    <tr key={probe.id} className="border-b border-border" data-testid={`probe-row-${probe.id}`}>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground" data-testid={`text-probe-name-${probe.id}`}>
                          {probe.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {probe.url}
                      </td>
                      <td className="py-3 px-4">
                        {getTypeBadge(probe.type)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(probe.status || 'Up')}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {probe.responseTime || 245}ms
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" data-testid={`button-edit-probe-${probe.id}`}>
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-view-probe-${probe.id}`}>
                            <Eye className="w-4 h-4" />
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
    </>
  );

  const renderGatewaysSection = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-gateways-title">Gateways</h2>
          <p className="text-muted-foreground">Monitor gateway health and performance</p>
        </div>
        <Button data-testid="button-manage-gateways">
          <Settings className="w-4 h-4 mr-2" />
          Manage Gateways
        </Button>
      </div>

      {/* Gateway Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Gateways</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-gateways">
                  {mockGateways.length}
                </p>
              </div>
              <Server className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Healthy</p>
                <p className="text-2xl font-bold text-secondary" data-testid="text-healthy-gateways">
                  {mockGateways.filter(g => g.status === 'healthy').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Degraded</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-degraded-gateways">
                  {mockGateways.filter(g => g.status === 'degraded').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-avg-latency">
                  81ms
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gateways List */}
      <div className="space-y-4">
        {mockGateways.map((gateway) => (
          <Card key={gateway.id} data-testid={`gateway-${gateway.id}`}>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${gateway.status === 'healthy' ? 'bg-secondary' : 'bg-amber-500'}`}></div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground" data-testid={`text-gateway-name-${gateway.id}`}>
                      {gateway.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{gateway.region}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Probes</p>
                    <p className="text-xl font-semibold text-foreground">{gateway.probes}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Latency</p>
                    <p className="text-xl font-semibold text-foreground">{gateway.latency}ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={gateway.status === 'healthy' ? 'secondary' : 'outline'}>
                      {gateway.status}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" data-testid={`button-gateway-details-${gateway.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );

  const renderLogsSection = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-logs-title">System Logs</h2>
          <p className="text-muted-foreground">View and search system logs and events</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" data-testid="button-export-logs">
            Export Logs
          </Button>
          <Button variant="outline" data-testid="button-log-settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Log Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10"
                data-testid="input-search-logs"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-32" data-testid="select-log-level">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40" data-testid="select-log-source">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="Monitor Service">Monitor Service</SelectItem>
                <SelectItem value="Gateway">Gateway</SelectItem>
                <SelectItem value="Alert Manager">Alert Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-4 p-3 border rounded-lg font-mono text-sm" data-testid={`log-${log.id}`}>
                <div className="text-muted-foreground min-w-0 flex-shrink-0">
                  {log.timestamp.toLocaleString()}
                </div>
                <div className="flex-shrink-0">
                  {getLogLevelBadge(log.level)}
                </div>
                <div className="text-blue-600 min-w-0 flex-shrink-0">
                  [{log.source}]
                </div>
                <div className="text-foreground flex-1 min-w-0">
                  {log.message}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" data-testid="button-load-more-logs">
              Load More Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderMapSection = () => (
    <div className="text-center py-20">
      <Construction className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-2xl font-semibold text-foreground mb-2" data-testid="text-map-title">
        Map View Coming Soon
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        We're working on an interactive global map to visualize your monitoring infrastructure. 
        This feature will show probe locations, gateway status, and real-time performance metrics.
      </p>
      <Button variant="outline" className="mt-4" data-testid="button-map-notify">
        Notify Me When Ready
      </Button>
    </div>
  );

  const renderOverviewSection = () => (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
        <Card>
          <CardContent className="p-4 sm:p-5 lg:p-6">
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
          <CardContent className="p-4 sm:p-5 lg:p-6">
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
          <CardContent className="p-4 sm:p-5 lg:p-6">
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
          <CardContent className="p-4 sm:p-5 lg:p-6">
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
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
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
        </CardContent>
      </Card>

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
          filteredProbes.map((probe: any) => {
            const isExpanded = expandedCards.has(probe.id);
            return (
              <Card key={probe.id} className="hover:shadow-md transition-shadow" data-testid={`probe-monitor-${probe.id}`}>
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="flex items-center justify-between">
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
                      <div className="text-sm text-foreground font-medium">
                        {probe.responseTime || 245}ms
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleCardExpansion(probe.id)}
                        data-testid={`button-toggle-details-${probe.id}`}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-6">
                      <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList>
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="history">History</TabsTrigger>
                          <TabsTrigger value="logs">Logs</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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
                        </TabsContent>

                        <TabsContent value="history" className="space-y-4">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[500px]">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left py-2 px-2 sm:px-4 font-medium text-muted-foreground">Timestamp</th>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );

  // Helper function to render section content
  const renderSectionContent = () => {
    console.log('Rendering section:', currentSection);
    switch (currentSection) {
      case "overview":
        return renderOverviewSection();
      case "alerts":
        return renderCriticalAlertsSection();
      case "probes":
        return renderProbesSection();
      case "gateways":
        return renderGatewaysSection();
      case "logs":
        return renderLogsSection();
      case "map":
        return renderMapSection();
      default:
        console.log('Default case triggered for section:', currentSection);
        return renderOverviewSection();
    }
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Monitor</h1>
          <p className="text-muted-foreground">Real-time monitoring and historical data for your probes</p>
        </div>

        {/* Render section content based on hash */}
        {renderSectionContent()}
      </div>
    </Layout>
  );
}