import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Activity, AlertTriangle, CheckCircle, TrendingUp, Server, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProbeCategory, ProbeType, GatewayType, ProbeStatus } from '@/types/probe';

interface MockProbe {
  id: string;
  name: string;
  description?: string;
  category: ProbeCategory;
  type: ProbeType;
  gateway_type: GatewayType;
  is_active: boolean;
  status: ProbeStatus;
  response_time?: number;
  last_check?: string;
  check_interval: number;
  uptime?: string;
  url?: string;
}

interface MockGateway {
  id: string;
  name: string;
  location?: string;
  ip_address?: string;
  platform?: string;
  version?: string;
  type: GatewayType;
  status: 'pending' | 'registered' | 'active' | 'revoked';
  is_online: boolean;
  last_heartbeat?: string;
}

interface MockProbeResult {
  id: string;
  timestamp: Date;
  status: ProbeStatus;
  response_time: number;
  status_code?: number;
  error_message?: string;
}

const mockStats = {
  totalProbes: 12,
  activeProbes: 10,
  probesUp: 8,
  probesDown: 2,
  probesWarning: 2,
  activeAlerts: 3,
  overallUptime: 98.5,
  avgResponseTime: 245,
};

const mockProbes: MockProbe[] = [
  {
    id: '1',
    name: 'Production API',
    description: 'Main production API endpoint',
    category: 'API',
    type: 'HTTP/HTTPS',
    gateway_type: 'Core',
    is_active: true,
    status: 'Success',
    response_time: 245,
    last_check: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    check_interval: 300,
    uptime: '99.8%',
    url: 'https://api.example.com/health',
  },
  {
    id: '2',
    name: 'E-commerce Site',
    category: 'Uptime',
    type: 'HTTP/HTTPS',
    gateway_type: 'TenantSpecific',
    is_active: true,
    status: 'Success',
    response_time: 189,
    last_check: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    check_interval: 300,
    uptime: '99.5%',
    url: 'https://shop.example.com',
  },
  {
    id: '3',
    name: 'Database Connection',
    category: 'API',
    type: 'HTTP/HTTPS',
    gateway_type: 'Core',
    is_active: true,
    status: 'Failure',
    response_time: 0,
    last_check: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    check_interval: 60,
    uptime: '95.2%',
    url: 'https://db.example.com/health',
  },
  {
    id: '4',
    name: 'SSL Certificate Check',
    category: 'Security',
    type: 'SSL/TLS',
    gateway_type: 'Core',
    is_active: true,
    status: 'Warning',
    response_time: 1250,
    last_check: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    check_interval: 3600,
    uptime: '98.1%',
    url: 'https://secure.example.com',
  },
  {
    id: '5',
    name: 'DNS Resolution',
    category: 'Uptime',
    type: 'DNS Resolution',
    gateway_type: 'TenantSpecific',
    is_active: true,
    status: 'Success',
    response_time: 45,
    last_check: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    check_interval: 300,
    uptime: '99.9%',
    url: 'example.com',
  },
  {
    id: '6',
    name: 'User Authentication',
    category: 'Security',
    type: 'Authentication',
    gateway_type: 'Core',
    is_active: true,
    status: 'Success',
    response_time: 320,
    last_check: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    check_interval: 300,
    uptime: '99.7%',
    url: 'https://auth.example.com',
  },
];

const mockGateways: MockGateway[] = [
  {
    id: '1',
    name: 'US East Gateway',
    location: 'New York, USA',
    ip_address: '192.168.1.100',
    platform: 'Linux',
    version: '1.2.3',
    type: 'Core',
    status: 'active',
    is_online: true,
    last_heartbeat: new Date(Date.now() - 30 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'EU West Gateway',
    location: 'London, UK',
    ip_address: '192.168.1.101',
    platform: 'Linux',
    version: '1.2.3',
    type: 'TenantSpecific',
    status: 'active',
    is_online: true,
    last_heartbeat: new Date(Date.now() - 45 * 1000).toISOString(),
  },
  {
    id: '3',
    name: 'Asia Pacific Gateway',
    location: 'Singapore',
    ip_address: '192.168.1.102',
    platform: 'Linux',
    version: '1.2.2',
    type: 'TenantSpecific',
    status: 'pending',
    is_online: false,
    last_heartbeat: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

const mockProbeResults: Record<string, MockProbeResult[]> = {
  '1': [
    { id: 'r1', timestamp: new Date(Date.now() - 2 * 60 * 1000), status: 'Success', response_time: 245, status_code: 200 },
    { id: 'r2', timestamp: new Date(Date.now() - 7 * 60 * 1000), status: 'Success', response_time: 189, status_code: 200 },
    { id: 'r3', timestamp: new Date(Date.now() - 12 * 60 * 1000), status: 'Success', response_time: 267, status_code: 200 },
    { id: 'r4', timestamp: new Date(Date.now() - 17 * 60 * 1000), status: 'Warning', response_time: 1250, status_code: 200 },
    { id: 'r5', timestamp: new Date(Date.now() - 22 * 60 * 1000), status: 'Success', response_time: 198, status_code: 200 },
  ],
  '2': [
    { id: 'r6', timestamp: new Date(Date.now() - 5 * 60 * 1000), status: 'Success', response_time: 189, status_code: 200 },
    { id: 'r7', timestamp: new Date(Date.now() - 10 * 60 * 1000), status: 'Success', response_time: 201, status_code: 200 },
    { id: 'r8', timestamp: new Date(Date.now() - 15 * 60 * 1000), status: 'Success', response_time: 175, status_code: 200 },
  ],
  '3': [
    { id: 'r9', timestamp: new Date(Date.now() - 1 * 60 * 1000), status: 'Failure', response_time: 0, status_code: 500, error_message: 'Connection timeout' },
    { id: 'r10', timestamp: new Date(Date.now() - 6 * 60 * 1000), status: 'Failure', response_time: 0, status_code: 500, error_message: 'Connection timeout' },
    { id: 'r11', timestamp: new Date(Date.now() - 11 * 60 * 1000), status: 'Success', response_time: 234, status_code: 200 },
  ],
};

const mockProbeLogs: Record<string, string[]> = {
  '1': [
    '[2024-01-15 10:30:00] INFO: Probe execution started',
    '[2024-01-15 10:30:01] SUCCESS: HTTP 200 OK - Response time: 245ms',
    '[2024-01-15 10:25:00] INFO: Probe execution started',
    '[2024-01-15 10:25:01] SUCCESS: HTTP 200 OK - Response time: 189ms',
    '[2024-01-15 10:20:00] INFO: Probe execution started',
    '[2024-01-15 10:20:01] WARNING: High response time detected (1250ms)',
  ],
  '2': [
    '[2024-01-15 10:30:00] INFO: Probe execution started',
    '[2024-01-15 10:30:01] SUCCESS: HTTP 200 OK - Response time: 189ms',
    '[2024-01-15 10:25:00] INFO: Probe execution started',
    '[2024-01-15 10:25:01] SUCCESS: HTTP 200 OK - Response time: 201ms',
  ],
  '3': [
    '[2024-01-15 10:30:00] INFO: Probe execution started',
    '[2024-01-15 10:30:05] ERROR: Connection timeout after 5000ms',
    '[2024-01-15 10:25:00] INFO: Probe execution started',
    '[2024-01-15 10:25:05] ERROR: Connection timeout after 5000ms',
  ],
};

export default function Monitor() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayTypeFilter, setGatewayTypeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedProbes, setExpandedProbes] = useState<Set<string>>(new Set());

  const toggleProbeExpansion = (probeId: string) => {
    setExpandedProbes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(probeId)) {
        newSet.delete(probeId);
      } else {
        newSet.add(probeId);
      }
      return newSet;
    });
  };

  const filteredProbes = mockProbes.filter(probe => {
    const matchesSearch = 
      probe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      probe.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      probe.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || probe.category === categoryFilter;
    const matchesType = typeFilter === 'all' || probe.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || probe.status === statusFilter;
    const matchesGatewayType = gatewayTypeFilter === 'all' || probe.gateway_type === gatewayTypeFilter;
    const matchesActive = 
      activeFilter === 'all' || 
      (activeFilter === 'active' && probe.is_active) ||
      (activeFilter === 'inactive' && !probe.is_active);

    return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesGatewayType && matchesActive;
  });

  const getStatusIcon = (status: ProbeStatus) => {
    switch (status) {
      case 'Success':
        return <CheckCircle className="w-4 h-4 text-secondary" />;
      case 'Failure':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'Warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ProbeStatus) => {
    switch (status) {
      case 'Success':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Up</Badge>;
      case 'Failure':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Down</Badge>;
      case 'Warning':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Warning</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getCategoryBadge = (category: ProbeCategory) => {
    const colors: Record<ProbeCategory, string> = {
      'Uptime': 'bg-primary/10 text-primary',
      'API': 'bg-secondary/10 text-secondary',
      'Security': 'bg-purple-100 text-purple-700',
      'Browser': 'bg-green-100 text-green-700',
    };
    return <Badge className={colors[category] || 'bg-muted text-muted-foreground'}>{category}</Badge>;
  };

  const getTypeBadge = (type: ProbeType) => {
    return <Badge variant="outline" className="capitalize">{type}</Badge>;
  };

  const formatLastCheck = (lastCheck?: string) => {
    if (!lastCheck) return 'Never';
    const date = new Date(lastCheck);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Monitor</h1>
          <p className="text-muted-foreground">Real-time monitoring and historical data for your probes and gateways</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-8">
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Probes</p>
                  <p className="text-2xl font-bold text-foreground">{mockStats.totalProbes}</p>
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
                  <p className="text-2xl font-bold text-secondary">{mockStats.activeProbes}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Up</p>
                  <p className="text-2xl font-bold text-secondary">{mockStats.probesUp}</p>
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
                  <p className="text-2xl font-bold text-destructive">{mockStats.probesDown}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alerts</p>
                  <p className="text-2xl font-bold text-destructive">{mockStats.activeAlerts}</p>
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
                  <p className="text-2xl font-bold text-foreground">{mockStats.avgResponseTime}ms</p>
                </div>
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 sm:pt-1 lg:px-6 lg:pb-6 lg:pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search probes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                    data-testid="input-search-probes"
                  />
                </div>
                <Button variant="outline" size="icon" data-testid="button-filter-probes" className="w-10 h-10 flex-shrink-0">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-32" data-testid="select-category-filter">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Uptime">Uptime</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Browser">Browser</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-32" data-testid="select-type-filter">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ICMP/Ping">ICMP/Ping</SelectItem>
                    <SelectItem value="HTTP/HTTPS">HTTP/HTTPS</SelectItem>
                    <SelectItem value="DNS Resolution">DNS Resolution</SelectItem>
                    <SelectItem value="SSL/TLS">SSL/TLS</SelectItem>
                    <SelectItem value="Authentication">Authentication</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Success">Success</SelectItem>
                    <SelectItem value="Failure">Failure</SelectItem>
                    <SelectItem value="Warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={gatewayTypeFilter} onValueChange={setGatewayTypeFilter}>
                  <SelectTrigger className="w-full sm:w-32" data-testid="select-gateway-type-filter">
                    <SelectValue placeholder="Gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Gateways</SelectItem>
                    <SelectItem value="Core">Core</SelectItem>
                    <SelectItem value="TenantSpecific">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger className="w-full sm:w-32" data-testid="select-active-filter">
                    <SelectValue placeholder="Active" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Gateways ({mockGateways.length})</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 sm:pt-1 lg:px-6 lg:pb-6 lg:pt-1">
            {mockGateways.length === 0 ? (
              <div className="text-center py-8">
                <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No gateways available</h3>
                <p className="text-muted-foreground">Gateways execute your monitoring probes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mockGateways.map((gateway) => (
                  <div
                    key={gateway.id}
                    className="flex flex-col sm:flex-row sm:items-center p-4 border rounded-lg gap-4 transition-colors border-border hover:border-primary/50"
                    data-testid={`gateway-${gateway.id}`}
                  >
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          gateway.is_online ? 'bg-secondary' : 'bg-destructive'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground" data-testid={`text-gateway-name-${gateway.id}`}>
                          {gateway.name}
                        </div>
                        <div className="text-sm text-muted-foreground">{gateway.location || 'No location specified'}</div>
                        {gateway.ip_address && (
                          <div className="text-xs text-muted-foreground">{gateway.ip_address}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <div className="flex flex-wrap gap-1">
                        {gateway.platform && <Badge variant="outline">{gateway.platform}</Badge>}
                        {gateway.version && <Badge variant="outline">v{gateway.version}</Badge>}
                        <Badge
                          variant="outline"
                          className={
                            gateway.type === 'Core'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                          }
                        >
                          {gateway.type === 'Core' ? 'Core' : 'Custom'}
                        </Badge>
                        <Badge
                          className={
                            gateway.is_online
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : gateway.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }
                        >
                          {gateway.is_online ? 'Online' : gateway.status === 'pending' ? 'Pending' : 'Offline'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground" data-testid="text-probes-title">
                Probes ({filteredProbes.length})
              </h2>
              <p className="text-muted-foreground">Click on a probe card to view detailed monitoring information</p>
            </div>
          </div>

          {filteredProbes.length === 0 ? (
            <Card>
              <CardContent className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 sm:pt-1 lg:px-6 lg:pb-6 lg:pt-1">
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No probes found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or create probes in the Manage section</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredProbes.map((probe) => {
                const isExpanded = expandedProbes.has(probe.id);
                const probeResults = mockProbeResults[probe.id] || [];
                const probeLogs = mockProbeLogs[probe.id] || [];

                return (
                  <Card
                    key={probe.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    data-testid={`probe-monitor-${probe.id}`}
                    onClick={() => toggleProbeExpansion(probe.id)}
                  >
                    <CardContent className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 sm:pt-1 lg:px-6 lg:pb-6 lg:pt-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          {getStatusIcon(probe.status)}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold text-foreground" data-testid={`text-probe-name-${probe.id}`}>
                              {probe.name}
                            </h3>
                            <p className="text-sm text-muted-foreground" data-testid={`text-probe-url-${probe.id}`}>
                              {probe.url || probe.description || 'No URL specified'}
                            </p>
                            {probe.description && probe.url && (
                              <p className="text-xs text-muted-foreground mt-1">{probe.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 flex-shrink-0">
                          {getCategoryBadge(probe.category)}
                          {getTypeBadge(probe.type)}
                          {getStatusBadge(probe.status)}
                          <Badge
                            variant="outline"
                            className={
                              probe.gateway_type === 'Core'
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                            }
                          >
                            {probe.gateway_type === 'Core' ? 'Core' : 'Custom'}
                          </Badge>
                          <div className="text-sm text-foreground font-medium">
                            {probe.response_time ? `${probe.response_time}ms` : 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">{formatLastCheck(probe.last_check)}</div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProbeExpansion(probe.id);
                            }}
                            data-testid={`button-toggle-details-${probe.id}`}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-border">
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
                                    {probe.response_time ? `${probe.response_time}ms` : 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-4">
                                  <div className="text-sm text-muted-foreground">Uptime (24h)</div>
                                  <div className="text-xl font-semibold text-secondary">{probe.uptime || 'N/A'}</div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-4">
                                  <div className="text-sm text-muted-foreground">Check Interval</div>
                                  <div className="text-xl font-semibold text-foreground">{probe.check_interval}s</div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-4">
                                  <div className="text-sm text-muted-foreground">Last Check</div>
                                  <div className="text-xl font-semibold text-foreground">{formatLastCheck(probe.last_check)}</div>
                                </div>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-4">
                                <div className="text-sm font-medium text-foreground mb-2">Probe Details</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Category:</span>{' '}
                                    <span className="font-medium">{probe.category}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Type:</span>{' '}
                                    <span className="font-medium">{probe.type}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Gateway Type:</span>{' '}
                                    <span className="font-medium">{probe.gateway_type}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Status:</span>{' '}
                                    <span className="font-medium">{probe.is_active ? 'Active' : 'Inactive'}</span>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="history" className="space-y-4">
                              {probeResults.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No history data available</div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[500px]">
                                    <thead>
                                      <tr className="border-b border-border">
                                        <th className="text-left py-2 px-2 sm:px-4 font-medium text-muted-foreground">Timestamp</th>
                                        <th className="text-left py-2 px-4 font-medium text-muted-foreground">Status</th>
                                        <th className="text-left py-2 px-4 font-medium text-muted-foreground">Response Time</th>
                                        <th className="text-left py-2 px-4 font-medium text-muted-foreground">Status Code</th>
                                        <th className="text-left py-2 px-4 font-medium text-muted-foreground">Error</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {probeResults.map((result) => (
                                        <tr key={result.id} className="border-b border-border">
                                          <td className="py-2 px-4 text-sm text-foreground">
                                            {result.timestamp.toLocaleString()}
                                          </td>
                                          <td className="py-2 px-4">{getStatusBadge(result.status)}</td>
                                          <td className="py-2 px-4 text-sm text-foreground">
                                            {result.response_time > 0 ? `${result.response_time}ms` : '-'}
                                          </td>
                                          <td className="py-2 px-4 text-sm text-foreground">
                                            {result.status_code || '-'}
                                          </td>
                                          <td className="py-2 px-4 text-sm text-muted-foreground">
                                            {result.error_message || '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </TabsContent>

                            <TabsContent value="logs" className="space-y-4">
                              {probeLogs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No logs available</div>
                              ) : (
                                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
                                  <div className="space-y-2">
                                    {probeLogs.map((log, index) => {
                                      const isError = log.includes('ERROR');
                                      const isWarning = log.includes('WARNING');
                                      const isSuccess = log.includes('SUCCESS');
                                      return (
                                        <div
                                          key={index}
                                          className={
                                            isError
                                              ? 'text-destructive'
                                              : isWarning
                                              ? 'text-amber-500'
                                              : isSuccess
                                              ? 'text-secondary'
                                              : 'text-muted-foreground'
                                          }
                                        >
                                          {log}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
