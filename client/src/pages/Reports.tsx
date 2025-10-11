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
      <div className="p-3 sm:p-4 lg:p-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground" data-testid="text-page-title">Reports</h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Select value={selectedProbe} onValueChange={setSelectedProbe}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-probe-filter">
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
              <Button variant="outline" disabled data-testid="button-export" className="w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                <span className="sm:inline">Export (Coming Soon)</span>
              </Button>
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Comprehensive analytics and monitoring insights</p>
        </div>

        {/* Date Range Filter */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground">Date Range:</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                  </span>
                  <Button variant="outline" size="sm" data-testid="button-change-date" className="text-xs">
                    Change
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })} className="text-xs flex-1 sm:flex-none">
                    Last 7 days
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })} className="text-xs flex-1 sm:flex-none">
                    Last 30 days
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })} className="text-xs flex-1 sm:flex-none">
                    Last 90 days
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Checks</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1" data-testid="text-total-checks">
                    {mockAnalytics.totalChecks.toLocaleString()}
                  </p>
                  <p className="text-xs text-secondary mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +15% from last period
                  </p>
                </div>
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-xl sm:text-2xl font-bold text-secondary mt-1" data-testid="text-success-rate">
                    {((mockAnalytics.successfulChecks / mockAnalytics.totalChecks) * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-secondary mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +0.1% from last period
                  </p>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-secondary font-bold">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Response Time</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1" data-testid="text-avg-response">
                    {mockAnalytics.avgResponseTime}ms
                  </p>
                  <p className="text-xs text-destructive mt-1 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    -12ms from last period
                  </p>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-muted-foreground font-bold">⚡</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">MTTR</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1" data-testid="text-mttr">
                    {mockAnalytics.mttr}m
                  </p>
                  <p className="text-xs text-secondary mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    -2.3m from last period
                  </p>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-muted-foreground font-bold">🔧</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Uptime Overview - Single View */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <CardTitle className="text-base sm:text-lg">Uptime Overview</CardTitle>
                <Button variant="outline" size="sm" data-testid="button-advanced-filters" className="w-full sm:w-auto text-xs sm:text-sm">
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Advanced Filters
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 sm:pt-0">
              {/* Enhanced Analytics Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-muted-foreground">Average Response Time</div>
                  <div className="text-xl sm:text-2xl font-semibold text-foreground mt-1">{mockAnalytics.avgResponseTime}ms</div>
                  <div className="text-xs text-destructive mt-1">-12ms from last period</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-muted-foreground">95th Percentile</div>
                  <div className="text-xl sm:text-2xl font-semibold text-foreground mt-1">
                    {Math.round(mockAnalytics.avgResponseTime * 1.8)}ms
                  </div>
                  <div className="text-xs text-secondary mt-1">+5ms from last period</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-muted-foreground">Incident Rate</div>
                  <div className="text-xl sm:text-2xl font-semibold text-foreground mt-1">{mockAnalytics.incidentCount}</div>
                  <div className="text-xs text-secondary mt-1">-3 from last period</div>
                </div>
              </div>
              
              {/* Detailed Probe Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Probe</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Uptime</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Avg Response</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Min Response</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Max Response</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Total Checks</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Failed Checks</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Incidents</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Last Check</th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockProbeAnalytics.map((probe, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="text-xs sm:text-sm font-medium text-foreground" data-testid={`text-probe-${index}`}>
                            {probe.name}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="text-xs sm:text-sm font-medium text-foreground">{probe.uptime}%</div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-foreground">{probe.avgResponse}ms</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-foreground">{Math.round(probe.avgResponse * 0.7)}ms</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-foreground">{Math.round(probe.avgResponse * 2.1)}ms</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-foreground">{probe.checks.toLocaleString()}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-foreground">{Math.round(probe.checks * (100 - probe.uptime) / 100)}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-foreground">{probe.incidents}</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-foreground">{Math.floor(Math.random() * 5) + 1}m ago</td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
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
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <CardTitle className="text-base sm:text-lg">Recent Incidents</CardTitle>
                <Badge variant="outline">{mockIncidents.length} incidents</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 sm:pt-0">
              <div className="space-y-3 sm:space-y-4">
                {mockIncidents.map((incident) => (
                  <div key={incident.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border border-border rounded-lg" data-testid={`incident-${incident.id}`}>
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${incident.resolved ? 'bg-secondary' : 'bg-destructive'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base font-medium text-foreground truncate">{incident.probe}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {incident.timestamp.toLocaleDateString()} at {incident.timestamp.toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Duration: {incident.duration}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
