import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/ui/date-picker';
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
    enabled: !!user?.tenantId,
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
      <div className="p-6 overflow-y-auto">
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
                  {probes?.map((probe: any) => (
                    <SelectItem key={probe.id} value={probe.id}>
                      {probe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Export
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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
            <TabsTrigger value="incidents" data-testid="tab-incidents">Incidents</TabsTrigger>
            <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Uptime Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Uptime Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="chart-placeholder mb-6">
                  Uptime Chart - {format(dateRange.from, 'MMM dd')} to {format(dateRange.to, 'MMM dd, yyyy')}
                </div>
                
                {/* Probe Summary Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Probe</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Uptime</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Avg Response</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total Checks</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Incidents</th>
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
                          <td className="py-3 px-4 text-foreground">{probe.checks.toLocaleString()}</td>
                          <td className="py-3 px-4 text-foreground">{probe.incidents}</td>
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
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="chart-placeholder mb-6">
                  Response Time Trends - {format(dateRange.from, 'MMM dd')} to {format(dateRange.to, 'MMM dd, yyyy')}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Average</div>
                    <div className="text-2xl font-semibold text-foreground">{mockAnalytics.avgResponseTime}ms</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">95th Percentile</div>
                    <div className="text-2xl font-semibold text-foreground">
                      {Math.round(mockAnalytics.avgResponseTime * 1.8)}ms
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">99th Percentile</div>
                    <div className="text-2xl font-semibold text-foreground">
                      {Math.round(mockAnalytics.avgResponseTime * 2.5)}ms
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Uptime Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="chart-placeholder">
                    Monthly Uptime Comparison Chart
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Time Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="chart-placeholder">
                    Response Time Histogram
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Rate by Time of Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="chart-placeholder">
                    Error Rate Heatmap
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Geographic Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="chart-placeholder">
                    Performance by Gateway Location
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
