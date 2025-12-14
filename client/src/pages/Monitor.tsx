import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Map, Construction } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProbeApiService } from '@/services/probeApi';
import { GatewayApiService } from '@/services/gatewayApi';
import { AlertApiService } from '@/services/alertApi';
import { LogsApiService } from '@/services/logsApi';
import type { Probe, ProbeResult } from '@/types/probe';
import type { GatewayResponse } from '@/types/gateway';
import type { AlertResponse } from '@/types/alert';
import { MonitorHeader } from '@/components/monitor/MonitorHeader';
import { MonitorOverview } from '@/components/monitor/MonitorOverview';
import { ProbesList } from '@/components/monitor/ProbesList';
import { ProbeDetail } from '@/components/monitor/ProbeDetail';
import { GatewaysList } from '@/components/monitor/GatewaysList';
import { GatewayDetail } from '@/components/monitor/GatewayDetail';
import { LogsView } from '@/components/monitor/LogsView';
import { formatDate } from '@/components/monitor/utils';

export default function Monitor() {
  const { user, selectedTenant } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Detect current section and item IDs from route
  const [isOverviewRoute] = useRoute('/monitor/overview');
  const [isAlertsRoute, alertsParams] = useRoute('/monitor/alerts/:alertId?');
  const [isProbesRoute, probesParams] = useRoute('/monitor/probes/:probeId?');
  const [isGatewaysRoute, gatewaysParams] = useRoute('/monitor/gateways/:gatewayId?');
  const [isMapRoute] = useRoute('/monitor/map');
  const [isLogsRoute] = useRoute('/monitor/logs');
  const [isMonitorRoot] = useRoute('/monitor');
  
  // Determine current section (default to overview)
  const currentSection = isOverviewRoute || isMonitorRoot ? 'overview' :
    isAlertsRoute ? 'alerts' :
    isProbesRoute ? 'probes' :
    isGatewaysRoute ? 'gateways' :
    isMapRoute ? 'map' :
    isLogsRoute ? 'logs' : 'overview';
  
  // Get item IDs from route params
  const alertId = alertsParams?.alertId;
  const probeId = probesParams?.probeId;
  const gatewayId = gatewaysParams?.gatewayId;

  // Fetch all probes
  const { data: probesData, isLoading: probesLoading, refetch: refetchProbes, error: probesError } = useQuery({
    queryKey: ['/api/probes'],
    queryFn: () => {
      console.log('[FRONTEND] Loading probes list from controller:', {
        tenantId: selectedTenant?.id,
        timestamp: new Date().toISOString()
      });
      return ProbeApiService.listProbes();
    },
    enabled: !!user && !!selectedTenant,
    refetchInterval: 30000,
  });

  // Log probe loading results
  useEffect(() => {
    if (probesData) {
      console.log('[FRONTEND] Successfully loaded probes list from controller:', {
        tenantId: selectedTenant?.id,
        probeCount: probesData?.data?.length || 0,
        timestamp: new Date().toISOString()
      });
    }
    if (probesError) {
      console.error('[FRONTEND] Failed to load probes list from controller:', {
        tenantId: selectedTenant?.id,
        error: probesError,
        timestamp: new Date().toISOString()
      });
    }
  }, [probesData, probesError, selectedTenant?.id]);

  // Fetch all gateways
  const { data: gatewaysData, isLoading: gatewaysLoading, refetch: refetchGateways } = useQuery({
    queryKey: ['/api/gateways'],
    queryFn: () => GatewayApiService.listGateways(),
    enabled: !!user && !!selectedTenant,
    refetchInterval: 30000,
  });

  // Fetch all alerts
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/alerts'],
    queryFn: () => AlertApiService.listAlerts(),
    enabled: !!user && !!selectedTenant,
    refetchInterval: 30000,
  });

  // Fetch latest probe results for all probes from controller (batch endpoint)
  const { data: latestResultsData, error: latestResultsError } = useQuery({
    queryKey: ['/api/results/latest', selectedTenant?.id],
    queryFn: () => {
      console.log('[FRONTEND] Loading latest probe results from controller:', {
        tenantId: selectedTenant?.id,
        timestamp: new Date().toISOString()
      });
      return ProbeApiService.getLatestResults(1000);
    },
    enabled: !!user && !!selectedTenant,
    refetchInterval: 30000,
  });

  // Log latest results loading
  useEffect(() => {
    if (latestResultsData) {
      console.log('[FRONTEND] Successfully loaded latest probe results from controller:', {
        tenantId: selectedTenant?.id,
        resultCount: latestResultsData?.data?.length || 0,
        timestamp: new Date().toISOString()
      });
    }
    if (latestResultsError) {
      console.error('[FRONTEND] Failed to load latest probe results from controller:', {
        tenantId: selectedTenant?.id,
        error: latestResultsError,
        timestamp: new Date().toISOString()
      });
    }
  }, [latestResultsData, latestResultsError, selectedTenant?.id]);

  // Convert latest results array to a map by probe_id for easy lookup
  const probeResultsData = useMemo(() => {
    if (!latestResultsData?.data) {
      console.log('[FRONTEND] No latest results data available for processing');
      return {};
    }
    
    console.log('[FRONTEND] Processing latest probe results into map:', {
      totalResults: latestResultsData.data.length,
      timestamp: new Date().toISOString()
    });
    
    const resultsMap: Record<string, ProbeResult[]> = {};
    latestResultsData.data.forEach((result: ProbeResult) => {
      if (result.probe_id) {
        if (!resultsMap[result.probe_id]) {
          resultsMap[result.probe_id] = [];
        }
        resultsMap[result.probe_id].push(result);
      }
    });
    
    console.log('[FRONTEND] Successfully processed probe results into map:', {
      uniqueProbes: Object.keys(resultsMap).length,
      totalResults: latestResultsData.data.length,
      timestamp: new Date().toISOString()
    });
    
    return resultsMap;
  }, [latestResultsData]);

  // Fetch selected probe details
  const { data: probeDetailData, isLoading: probeDetailLoading } = useQuery({
    queryKey: ['/api/probes', probeId],
    queryFn: () => probeId ? ProbeApiService.getProbe(probeId) : null,
    enabled: !!probeId && !!user && !!selectedTenant,
  });

  // Fetch selected gateway details
  const { data: gatewayDetailData, isLoading: gatewayDetailLoading } = useQuery({
    queryKey: ['/api/gateways', gatewayId],
    queryFn: () => gatewayId ? GatewayApiService.getGateway(gatewayId) : null,
    enabled: !!gatewayId && !!user && !!selectedTenant,
  });

  // Fetch probe logs (last 10)
  const { data: probeLogsData, isLoading: probeLogsLoading } = useQuery({
    queryKey: ['/api/logs/probe', probeId],
    queryFn: () => probeId ? LogsApiService.getProbeLogs(probeId, 10, 0) : null,
    enabled: !!probeId && !!user && !!selectedTenant,
  });

  // Fetch all probe results for statistics (success/failure/misses)
  const { data: probeResultsForStats } = useQuery({
    queryKey: ['/api/results/probe', probeId],
    queryFn: () => probeId ? ProbeApiService.getProbeResults(probeId, { limit: 1000 }) : null,
    enabled: !!probeId && !!user && !!selectedTenant,
  });

  // Fetch gateway logs (last 10)
  const { data: gatewayLogsData, isLoading: gatewayLogsLoading } = useQuery({
    queryKey: ['/api/logs/gateway', gatewayId],
    queryFn: () => gatewayId ? LogsApiService.getGatewayLogs(gatewayId, 10, 0) : null,
    enabled: !!gatewayId && !!user && !!selectedTenant,
  });

  // Fetch gateway uptime
  const { data: gatewayUptimeData } = useQuery({
    queryKey: ['/api/gateways', gatewayId, 'uptime'],
    queryFn: () => gatewayId ? GatewayApiService.getGatewayUptime(gatewayId) : null,
    enabled: !!gatewayId && !!user && !!selectedTenant,
  });

  // Get gateway name for probe
  const getGatewayName = (gatewayId?: string | null) => {
    if (!gatewayId || !gatewaysData?.data) return 'Unknown';
    const gateway = gatewaysData.data.find((g) => g.id === gatewayId);
    return gateway?.name || 'Unknown';
  };

  // Get latest probe result for a probe
  const getLatestProbeResult = (probeId: string): ProbeResult | null => {
    const results = probeResultsData?.[probeId] || [];
    return results[0] || null;
  };

  const handleRefresh = () => {
    refetchProbes();
    refetchGateways();
    refetchAlerts();
  };

  // Get selected alert if alertId is in route
  const selectedAlert = useMemo(() => {
    if (!alertId || !alertsData?.data) return null;
    return alertsData.data.find((alert) => alert.id === alertId) || null;
  }, [alertId, alertsData]);

  const isLoading = probesLoading || gatewaysLoading || alertsLoading;

  // Get page title and description
  const getPageTitle = () => {
    if (currentSection === 'overview') return 'Overview';
    if (currentSection === 'probes') return probeId ? 'Probe Details' : 'Probes';
    if (currentSection === 'gateways') return gatewayId ? 'Gateway Details' : 'Gateways';
    if (currentSection === 'map') return 'Map';
    if (currentSection === 'logs') return 'Logs';
    return 'Monitor';
  };

  const getPageDescription = () => {
    if (currentSection === 'overview') return 'Real-time monitoring of all probes and gateways';
    if (currentSection === 'probes') return probeId ? 'Detailed probe information and logs' : 'List of all probes with their current status';
    if (currentSection === 'gateways') return gatewayId ? 'Detailed gateway information and logs' : 'List of all gateways with their connection status';
    if (currentSection === 'map') return 'Geographic view of probes and gateways';
    if (currentSection === 'logs') return 'View logs for gateways or probes';
    return 'Real-time monitoring of all probes and gateways';
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        <MonitorHeader
          title={getPageTitle()}
          description={getPageDescription()}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        {/* Overview Section */}
        {currentSection === 'overview' && (
          <MonitorOverview
            probesData={probesData}
            gatewaysData={gatewaysData}
            alertsData={alertsData}
            probeResultsData={probeResultsData}
            isLoading={isLoading}
            onAlertClick={(alertId) => setLocation(`/monitor/alerts/${alertId}`)}
            selectedAlertId={alertId}
          />
        )}

        {/* Alert Detail View */}
        {selectedAlert && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Alert Details
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/monitor/alerts')}
                >
                  Back to Alerts
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {selectedAlert.probe_name || 'Unknown Probe'}
                  </span>
                  <Badge
                    variant={selectedAlert.is_resolved ? 'outline' : 'default'}
                    className={
                      selectedAlert.is_resolved
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }
                  >
                    {selectedAlert.is_resolved ? 'Resolved' : 'Active'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Message</p>
                  <p className="text-sm text-muted-foreground">{selectedAlert.message}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Created At</p>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedAlert.created_at)}</p>
                </div>
                {selectedAlert.resolved_at && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Resolved At</p>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedAlert.resolved_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Probes List View */}
        {currentSection === 'probes' && !probeId && (
          <ProbesList
            probesData={probesData}
            gatewaysData={gatewaysData}
            probeResultsData={probeResultsData}
            isLoading={probesLoading}
            onProbeClick={(probeId) => setLocation(`/monitor/probes/${probeId}`)}
            getLatestProbeResult={getLatestProbeResult}
            getGatewayName={getGatewayName}
          />
        )}

        {/* Probe Detail View */}
        {currentSection === 'probes' && probeId && (
          <ProbeDetail
            probeId={probeId}
            probeDetailData={probeDetailData || undefined}
            probeLogsData={probeLogsData || undefined}
            probeResultsData={probeResultsData}
            probeResultsForStats={probeResultsForStats || undefined}
            isLoading={probeDetailLoading}
            logsLoading={probeLogsLoading}
            onBack={() => setLocation('/monitor/probes')}
            onViewAllLogs={(probeId) => setLocation(`/monitor/logs?type=probe&id=${probeId}`)}
            getLatestProbeResult={getLatestProbeResult}
            getGatewayName={getGatewayName}
          />
        )}

        {/* Gateways List View */}
        {currentSection === 'gateways' && !gatewayId && (
          <GatewaysList
            gatewaysData={gatewaysData}
            probesData={probesData}
            isLoading={gatewaysLoading}
            onGatewayClick={(gatewayId) => setLocation(`/monitor/gateways/${gatewayId}`)}
          />
        )}

        {/* Gateway Detail View */}
        {currentSection === 'gateways' && gatewayId && (
          <GatewayDetail
            gatewayId={gatewayId}
            gatewayDetailData={gatewayDetailData ?? undefined}
            gatewayLogsData={gatewayLogsData ?? undefined}
            gatewayUptimeData={gatewayUptimeData ?? undefined}
            probesData={probesData}
            probeResultsData={probeResultsData}
            isLoading={gatewayDetailLoading}
            logsLoading={gatewayLogsLoading}
            onBack={() => setLocation('/monitor/gateways')}
            onViewAllLogs={(gatewayId) => setLocation(`/monitor/logs?type=gateway&id=${gatewayId}`)}
            onProbeClick={(probeId) => setLocation(`/monitor/probes/${probeId}`)}
            getLatestProbeResult={getLatestProbeResult}
          />
        )}

        {/* Map View */}
        {currentSection === 'map' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16">
                <Construction className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Under Construction</h3>
                <p className="text-muted-foreground">The map view is currently under development.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logs View */}
        {currentSection === 'logs' && (
          <LogsView 
            probesData={probesData?.data || []}
            gatewaysData={gatewaysData?.data || []}
            setLocation={setLocation}
          />
        )}
      </div>
    </Layout>
  );
}
