import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, Download, Calendar, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, subDays, format } from 'date-fns';

export default function Reports() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedProbe, setSelectedProbe] = useState('all');

  const { data: probes } = useQuery({
    queryKey: ['/api/probes'],
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
  });

  // Mock analytics data for demonstration
  const mockAnalytics = {
    totalChecks: 45678,
    successfulChecks: 45234,
    failedChecks: 444,
    avgResponseTime: 342,
    uptimePercentage: 99.03,
    incidentCount: 12,
    mttr: 8.5, // Mean Time To Recovery in minutes
    mtbf: 1440, // Mean Time Between Failures in minutes
  };

  const mockProbeAnalytics = [
    { name: 'Main Website', uptime: 99.9, avgResponse: 245, checks: 8640, incidents: 1 },
    { name: 'API Service', uptime: 98.5, avgResponse: 156, checks: 8640, incidents: 3 },
    { name: 'CDN Endpoint', uptime: 99.2, avgResponse: 89, checks: 8640, incidents: 2 },
    { name: 'Database Health', uptime: 100, avgResponse: 45, checks: 8640, incidents: 0 },
    { name: 'E-commerce Site', uptime: 99.7, avgResponse: 523, checks: 8640, incidents: 1 },
  ];

  const mockIncidents = [
    {
      id: '1',
      probe: 'API Service',
      type: 'Downtime',
      duration: '12 minutes',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      resolved: true,
    },
    {
      id: '2',
      probe: 'CDN Endpoint',
      type: 'Slow Response',
      duration: '8 minutes',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      resolved: true,
    },
    {
      id: '3',
      probe: 'Main Website',
      type: 'SSL Certificate',
      duration: '5 minutes',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      resolved: true,
    },
  ];

  const handleExportReport = () => {
    // Implementation for exporting reports
    console.log('Exporting report...');
  };

  const getUptimeBadge = (uptime: number) => {
    if (uptime >= 99.5) return <Badge className="bg-secondary/10 text-secondary">Excellent</Badge>;
    if (uptime >= 99.0) return <Badge className="bg-primary/10 text-primary">Good</Badge>;
    if (uptime >= 95.0) return <Badge className="bg-amber-100 text-amber-700">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  const getIncidentTypeBadge = (type: string) => {
    const colors = {
      'Downtime': 'bg-destructive/10 text-destructive',
      'Slow Response': 'bg-amber-100 text-amber-700',
      'SSL Certificate': 'bg-purple-100 text-purple-700',
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-muted text-muted-foreground'}>
        {type}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Reports</h1>
            <div className="flex items-center space-x-3">
              <Select value={selectedProbe} onValueChange={setSelectedProbe}>
                <SelectTrigger className="w-48" data-testid="select-probe-filter">
                  <SelectValue placeholder="Select probe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Probes</SelectItem>
                  {(probes as any[])?.map((probe: any) => (
                    <SelectItem key={probe.id} value={probe.id}>
                      {probe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" disabled data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Export (Coming Soon)
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">Comprehensive analytics and monitoring insights</p>
        </div>

        {/* Date Range Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Date Range:</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                </span>
                <Button variant="outline" size="sm" data-testid="button-change-date">
                  Change
                </Button>
              </div>
              <div className="flex items-center space-x-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}>
                  Last 7 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}>
                  Last 30 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}>
                  Last 90 days
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Checks</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-checks">
                    {mockAnalytics.totalChecks.toLocaleString()}
                  </p>
                  <p className="text-xs text-secondary mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +15% from last period
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-secondary" data-testid="text-success-rate">
                    {((mockAnalytics.successfulChecks / mockAnalytics.totalChecks) * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-secondary mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +0.1% from last period
                  </p>
                </div>
                <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <span className="text-secondary font-bold">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-avg-response">
                    {mockAnalytics.avgResponseTime}ms
                  </p>
                  <p className="text-xs text-destructive mt-1 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    -12ms from last period
                  </p>
                </div>
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground font-bold">⚡</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">MTTR</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-mttr">
                    {mockAnalytics.mttr}m
                  </p>
                  <p className="text-xs text-secondary mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    -2.3m from last period
                  </p>
                </div>
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground font-bold">🔧</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Uptime Overview - Single View */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Uptime Overview</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" data-testid="button-advanced-filters">
                    <Filter className="w-4 h-4 mr-2" />
                    Advanced Filters
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Enhanced Analytics Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Average Response Time</div>
                  <div className="text-2xl font-semibold text-foreground">{mockAnalytics.avgResponseTime}ms</div>
                  <div className="text-xs text-destructive mt-1">-12ms from last period</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">95th Percentile</div>
                  <div className="text-2xl font-semibold text-foreground">
                    {Math.round(mockAnalytics.avgResponseTime * 1.8)}ms
                  </div>
                  <div className="text-xs text-secondary mt-1">+5ms from last period</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Incident Rate</div>
                  <div className="text-2xl font-semibold text-foreground">{mockAnalytics.incidentCount}</div>
                  <div className="text-xs text-secondary mt-1">-3 from last period</div>
                </div>
              </div>
              
              {/* Detailed Probe Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Probe</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Uptime</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Avg Response</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Min Response</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Max Response</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total Checks</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Failed Checks</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Incidents</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Check</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockProbeAnalytics.map((probe, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground" data-testid={`text-probe-${index}`}>
                            {probe.name}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{probe.uptime}%</div>
                        </td>
                        <td className="py-3 px-4 text-foreground">{probe.avgResponse}ms</td>
                        <td className="py-3 px-4 text-foreground">{Math.round(probe.avgResponse * 0.7)}ms</td>
                        <td className="py-3 px-4 text-foreground">{Math.round(probe.avgResponse * 2.1)}ms</td>
                        <td className="py-3 px-4 text-foreground">{probe.checks.toLocaleString()}</td>
                        <td className="py-3 px-4 text-foreground">{Math.round(probe.checks * (100 - probe.uptime) / 100)}</td>
                        <td className="py-3 px-4 text-foreground">{probe.incidents}</td>
                        <td className="py-3 px-4 text-foreground">{Math.floor(Math.random() * 5) + 1}m ago</td>
                        <td className="py-3 px-4">
                          {getUptimeBadge(probe.uptime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Incidents Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Incidents</CardTitle>
                <Badge variant="outline">{mockIncidents.length} incidents</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockIncidents.map((incident) => (
                  <div key={incident.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`incident-${incident.id}`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${incident.resolved ? 'bg-secondary' : 'bg-destructive'}`} />
                      <div>
                        <div className="font-medium text-foreground">{incident.probe}</div>
                        <div className="text-sm text-muted-foreground">
                          {incident.timestamp.toLocaleDateString()} at {incident.timestamp.toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Duration: {incident.duration}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getIncidentTypeBadge(incident.type)}
                      <Badge variant={incident.resolved ? "secondary" : "destructive"}>
                        {incident.resolved ? 'Resolved' : 'Active'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
