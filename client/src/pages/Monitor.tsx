import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
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
import { logger } from '@/lib/logger';
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

  // Determine if we need probes list (needed for overview, lists, logs, and gateway detail for assigned probes)
  const needsProbesList = currentSection === 'overview' || 
    (currentSection === 'probes' && !probeId) || 
    currentSection === 'gateways' || // Gateway detail needs probes list for assigned probes
    currentSection === 'logs';

  // Fetch all probes - only when a section that needs probes list is active
  const { data: probesData, isLoading: probesLoading, refetch: refetchProbes, error: probesError } = useQuery({
    queryKey: ['/api/probes'],
    queryFn: () => {
      logger.debug('Loading probes list from controller', {
        component: 'Monitor',
        action: 'load_probes',
        tenantId: selectedTenant?.id ? parseInt(selectedTenant.id, 10) : undefined,
      });
      return ProbeApiService.listProbes();
    },
    enabled: !!user && !!selectedTenant && needsProbesList,
    refetchInterval: needsProbesList ? 30000 : false,
  });

  // Log probe loading results
  useEffect(() => {
    if (probesData) {
      logger.info('Successfully loaded probes list from controller', {
        component: 'Monitor',
        action: 'load_probes_success',
        tenantId: selectedTenant?.id ? parseInt(selectedTenant.id, 10) : undefined,
        probeCount: probesData?.data?.length || 0,
      });
    }
    if (probesError) {
      const err = probesError instanceof Error ? probesError : new Error(String(probesError));
      logger.error('Failed to load probes list from controller', err, {
        component: 'Monitor',
        action: 'load_probes_error',
        tenantId: selectedTenant?.id ? parseInt(selectedTenant.id, 10) : undefined,
      });
    }
  }, [probesData, probesError, selectedTenant?.id]);

  // Determine if we need gateways list (not needed for probe detail or gateway detail pages)
  const needsGatewaysList = currentSection === 'overview' || 
    (currentSection === 'probes' && !probeId) || 
    (currentSection === 'gateways' && !gatewayId) || 
    currentSection === 'logs';

  // Fetch all gateways - only when a section that needs gateways list is active
  const { data: gatewaysData, isLoading: gatewaysLoading, refetch: refetchGateways } = useQuery({
    queryKey: ['/api/gateways'],
    queryFn: () => GatewayApiService.listGateways(),
    enabled: !!user && !!selectedTenant && needsGatewaysList,
    refetchInterval: needsGatewaysList ? 30000 : false,
  });

  // Determine if we need alerts (only for overview and alerts sections)
  const needsAlerts = currentSection === 'overview' || currentSection === 'alerts';

  // Fetch all alerts - only when overview or alerts section is active
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/alerts'],
    queryFn: () => AlertApiService.listAlerts(),
    enabled: !!user && !!selectedTenant && needsAlerts,
    refetchInterval: needsAlerts ? 30000 : false,
  });

  // Determine if we need latest probe results (needed for overview, lists, alerts, and detail pages)
  const needsLatestResults = currentSection === 'overview' || 
    currentSection === 'probes' || // Probe detail needs latest result for the probe
    currentSection === 'gateways' || // Gateway detail needs latest results for assigned probes
    currentSection === 'alerts';

  // Fetch latest probe results for all probes from controller (batch endpoint) - only when a section that needs results is active
  const { data: latestResultsData, error: latestResultsError, refetch: refetchLatestResults } = useQuery({
    queryKey: ['/api/results/latest', selectedTenant?.id],
    queryFn: () => {
      logger.debug('Loading latest probe results from controller', {
        component: 'Monitor',
        action: 'load_latest_results',
        tenantId: selectedTenant?.id ? parseInt(selectedTenant.id, 10) : undefined,
      });
      return ProbeApiService.getLatestResults(1000);
    },
    enabled: !!user && !!selectedTenant && needsLatestResults,
    refetchInterval: needsLatestResults ? 30000 : false,
  });

  // Log latest results loading
  useEffect(() => {
    if (latestResultsData) {
      logger.info('Successfully loaded latest probe results from controller', {
        component: 'Monitor',
        action: 'load_latest_results_success',
        tenantId: selectedTenant?.id ? parseInt(selectedTenant.id, 10) : undefined,
        resultCount: latestResultsData?.data?.length || 0,
      });
    }
    if (latestResultsError) {
      const err = latestResultsError instanceof Error ? latestResultsError : new Error(String(latestResultsError));
      logger.error('Failed to load latest probe results from controller', err, {
        component: 'Monitor',
        action: 'load_latest_results_error',
        tenantId: selectedTenant?.id ? parseInt(selectedTenant.id, 10) : undefined,
      });
    }
  }, [latestResultsData, latestResultsError, selectedTenant?.id]);

  // Convert latest results array to a map by probe_id for easy lookup
  const probeResultsData = useMemo(() => {
    if (!latestResultsData?.data) {
      logger.debug('No latest results data available for processing', {
        component: 'Monitor',
        action: 'process_results',
      });
      return {};
    }
    
    logger.debug('Processing latest probe results into map', {
      component: 'Monitor',
      action: 'process_results',
      totalResults: latestResultsData.data.length,
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
    
    logger.debug('Successfully processed probe results into map', {
      component: 'Monitor',
      action: 'process_results',
      uniqueProbes: Object.keys(resultsMap).length,
      totalResults: latestResultsData.data.length,
    });
    
    return resultsMap;
  }, [latestResultsData]);

  // Fetch selected probe details - only when probe detail page is shown
  const { data: probeDetailData, isLoading: probeDetailLoading, refetch: refetchProbeDetail } = useQuery({
    queryKey: ['/api/probes', probeId],
    queryFn: () => probeId ? ProbeApiService.getProbe(probeId) : null,
    enabled: !!probeId && !!user && !!selectedTenant && currentSection === 'probes' && !!probeId,
  });

  // Fetch selected gateway details - only when gateway detail page is shown
  const { data: gatewayDetailData, isLoading: gatewayDetailLoading, refetch: refetchGatewayDetail } = useQuery({
    queryKey: ['/api/gateways', gatewayId],
    queryFn: () => gatewayId ? GatewayApiService.getGateway(gatewayId) : null,
    enabled: !!gatewayId && !!user && !!selectedTenant && currentSection === 'gateways' && !!gatewayId,
  });

  // Fetch probe logs (last 10) - only when probe detail page is shown
  const { data: probeLogsData, isLoading: probeLogsLoading, refetch: refetchProbeLogs } = useQuery({
    queryKey: ['/api/logs/probe', probeId],
    queryFn: () => probeId ? LogsApiService.getProbeLogs(probeId, 10, 0) : null,
    enabled: !!probeId && !!user && !!selectedTenant && currentSection === 'probes' && !!probeId,
  });

  // Fetch all probe results for statistics (success/failure/misses) - only when probe detail page is shown
  const { data: probeResultsForStats, refetch: refetchProbeResultsForStats } = useQuery({
    queryKey: ['/api/results/probe', probeId],
    queryFn: () => probeId ? ProbeApiService.getProbeResults(probeId, { limit: 1000 }) : null,
    enabled: !!probeId && !!user && !!selectedTenant && currentSection === 'probes' && !!probeId,
  });

  // Fetch gateway logs (last 10) - only when gateway detail page is shown
  const { data: gatewayLogsData, isLoading: gatewayLogsLoading, refetch: refetchGatewayLogs } = useQuery({
    queryKey: ['/api/logs/gateway', gatewayId],
    queryFn: () => gatewayId ? LogsApiService.getGatewayLogs(gatewayId, 10, 0) : null,
    enabled: !!gatewayId && !!user && !!selectedTenant && currentSection === 'gateways' && !!gatewayId,
  });

  // Fetch gateway uptime - only when gateway detail page is shown
  const { data: gatewayUptimeData, refetch: refetchGatewayUptime } = useQuery({
    queryKey: ['/api/gateways', gatewayId, 'uptime'],
    queryFn: () => gatewayId ? GatewayApiService.getGatewayUptime(gatewayId) : null,
    enabled: !!gatewayId && !!user && !!selectedTenant && currentSection === 'gateways' && !!gatewayId,
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

  const handleRefresh = async () => {
    logger.info('Refresh button clicked - refreshing APIs for section', {
      component: 'Monitor',
      action: 'refresh_data',
      section: currentSection,
      tenantId: selectedTenant?.id ? parseInt(selectedTenant.id, 10) : undefined,
    });
    
    try {
      // Always refresh main data
      await Promise.all([
        refetchProbes(),
        refetchGateways(),
        refetchAlerts(),
      ]);
      
      // Refresh latest probe results if needed
      if (needsLatestResults) {
        await refetchLatestResults();
      }
      
      // Refresh probe detail data if on probe detail page
      if (currentSection === 'probes' && probeId) {
        await Promise.all([
          refetchProbeDetail(),
          refetchProbeLogs(),
          refetchProbeResultsForStats(),
        ]);
      }
      
      // Refresh gateway detail data if on gateway detail page
      if (currentSection === 'gateways' && gatewayId) {
        await Promise.all([
          refetchGatewayDetail(),
          refetchGatewayLogs(),
          refetchGatewayUptime(),
        ]);
      }
      
      // Refresh logs data if on logs section
      if (currentSection === 'logs') {
        queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
      }
      
      logger.info('Successfully refreshed data for section', {
        component: 'Monitor',
        action: 'refresh_data_success',
        section: currentSection,
        tenantId: selectedTenant?.id ? parseInt(selectedTenant.id, 10) : undefined,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to refresh data for section', err, {
        component: 'Monitor',
        action: 'refresh_data_error',
        section: currentSection,
      });
    }
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
            onRefreshLogs={() => refetchProbeLogs()}
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
            onRefreshLogs={() => refetchGatewayLogs()}
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
