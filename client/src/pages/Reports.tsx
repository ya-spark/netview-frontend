import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, Download, Calendar, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProbeApiService } from '@/services/probeApi';
import { logger } from '@/lib/logger';
import { subDays, format } from 'date-fns';

export default function Reports() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedProbe, setSelectedProbe] = useState('all');

  useEffect(() => {
    logger.debug('Reports page initialized', {
      component: 'Reports',
      userId: user?.id,
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
    });
  }, [user?.id, dateRange]);

  const { data: probes } = useQuery({
    queryKey: ['/api/probes'],
    enabled: !!user,
    queryFn: async () => {
      logger.debug('Fetching probes for reports', {
        component: 'Reports',
        action: 'fetch_probes',
        userId: user?.id,
      });
      const result = await ProbeApiService.listProbes();
      logger.info('Probes loaded for reports', {
        component: 'Reports',
        action: 'fetch_probes',
        probeCount: result?.data?.length || 0,
      });
      return result;
    },
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
    mttr: 8.5,
    mtbf: 1440,
  };

  // Note: In production, this would fetch real probe analytics from the API
  const mockProbeAnalytics: Array<{name: string, uptime: number, avgResponse: number, checks: number, incidents: number}> = [];

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
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2" data-testid="text-page-title">Reports</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:hidden">Comprehensive analytics and monitoring insights</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
              <Select value={selectedProbe} onValueChange={setSelectedProbe}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-probe-filter">
                  <SelectValue placeholder="Select probe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Probes</SelectItem>
                  {(probes?.data || []).map((probe: any) => (
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
          <p className="text-muted-foreground hidden sm:block">Comprehensive analytics and monitoring insights</p>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })} 
                    className="text-xs flex-1 sm:flex-none"
                    data-testid="button-7-days"
                  >
                    Last 7 days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })} 
                    className="text-xs flex-1 sm:flex-none"
                    data-testid="button-30-days"
                  >
                    Last 30 days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })} 
                    className="text-xs flex-1 sm:flex-none"
                    data-testid="button-90-days"
                  >
                    Last 90 days
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Overview - Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Checks</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-1" data-testid="text-total-checks">
                    {mockAnalytics.totalChecks.toLocaleString()}
                  </p>
                  <p className="text-xs text-secondary mt-1">
                    <span className="inline-flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +15% from last period
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
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-secondary mt-1" data-testid="text-success-rate">
                    {((mockAnalytics.successfulChecks / mockAnalytics.totalChecks) * 100).toFixed(2)}%
                  </p>
                  <p className="text-xs text-secondary mt-1">
                    <span className="inline-flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +0.1% from last period
                    </span>
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-secondary font-bold text-xl">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Response Time</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-1" data-testid="text-avg-response">
                    {mockAnalytics.avgResponseTime}ms
                  </p>
                  <p className="text-xs text-destructive mt-1">
                    <span className="inline-flex items-center">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      -12ms from last period
                    </span>
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-muted-foreground font-bold text-xl">⚡</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">MTTR</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-1" data-testid="text-mttr">
                    {mockAnalytics.mttr}m
                  </p>
                  <p className="text-xs text-secondary mt-1">
                    <span className="inline-flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      -2.3m from last period
                    </span>
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-muted-foreground font-bold text-xl">🔧</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Uptime Overview Table */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <CardTitle className="text-base sm:text-lg">Uptime Overview</CardTitle>
              <Button variant="outline" size="sm" data-testid="button-advanced-filters" className="w-full sm:w-auto text-xs sm:text-sm">
                <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {/* Enhanced Analytics Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 px-4 sm:px-0">
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
            
            {/* Probe Summary Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Probe</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Uptime</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden sm:table-cell">Avg Response</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden md:table-cell">Total Checks</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden lg:table-cell">Incidents</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockProbeAnalytics.map((probe, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="py-3 sm:py-4 px-3 sm:px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            probe.uptime >= 99.5 ? 'bg-secondary' : 
                            probe.uptime >= 99.0 ? 'bg-primary' : 'bg-amber-500'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-medium text-foreground truncate" data-testid={`text-probe-${index}`}>
                              {probe.name}
                            </div>
                            <div className="sm:hidden text-xs text-muted-foreground mt-1">
                              {probe.avgResponse}ms avg
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4">
                        <div className="text-xs sm:text-sm font-medium text-foreground">{probe.uptime}%</div>
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm text-foreground hidden sm:table-cell">
                        {probe.avgResponse}ms
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm text-foreground hidden md:table-cell">
                        {probe.checks.toLocaleString()}
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm text-foreground hidden lg:table-cell">
                        {probe.incidents}
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4">
                        {getUptimeBadge(probe.uptime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
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
                <div 
                  key={incident.id} 
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border border-border rounded-lg" 
                  data-testid={`incident-${incident.id}`}
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 mt-1 sm:mt-0 ${
                      incident.resolved ? 'bg-secondary' : 'bg-destructive'
                    }`} />
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
    </Layout>
  );
}
