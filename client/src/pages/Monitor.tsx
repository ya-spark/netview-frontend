import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Server, 
  RefreshCw,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProbeApiService } from '@/services/probeApi';
import { GatewayApiService } from '@/services/gatewayApi';
import { AlertApiService } from '@/services/alertApi';
import type { Probe, ProbeResult, ProbeStatus as ProbeStatusType } from '@/types/probe';
import type { GatewayResponse } from '@/types/gateway';
import type { AlertResponse } from '@/types/alert';

export default function Monitor() {
  const { user } = useAuth();

  // Fetch all probes
  const { data: probesData, isLoading: probesLoading, refetch: refetchProbes } = useQuery({
    queryKey: ['/api/probes'],
    queryFn: () => ProbeApiService.listProbes(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Fetch all gateways
  const { data: gatewaysData, isLoading: gatewaysLoading, refetch: refetchGateways } = useQuery({
    queryKey: ['/api/gateways'],
    queryFn: () => GatewayApiService.listGateways(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Fetch all alerts
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/alerts'],
    queryFn: () => AlertApiService.listAlerts(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Fetch probe results for all probes (last result for each)
  const { data: probeResultsData } = useQuery({
    queryKey: ['/api/probe-results'],
    queryFn: async () => {
      if (!probesData?.data) return {};
      const results: Record<string, ProbeResult[]> = {};
      await Promise.all(
        probesData.data.map(async (probe) => {
          try {
            const response = await ProbeApiService.getProbeResults(probe.id, { limit: 1 });
            results[probe.id] = response.data;
          } catch (error) {
            results[probe.id] = [];
          }
        })
      );
      return results;
    },
    enabled: !!user && !!probesData?.data,
    refetchInterval: 30000,
  });

  // Calculate probe statuses from latest results
  const probeStatuses = useMemo(() => {
    if (!probesData?.data || !probeResultsData) return { up: 0, down: 0, warning: 0, total: 0 };
    
    let up = 0;
    let down = 0;
    let warning = 0;
    
    probesData.data.forEach((probe) => {
      if (!probe.is_active) return;
      
      const results = probeResultsData[probe.id] || [];
      const latestResult = results[0];
      
      if (latestResult) {
        if (latestResult.status === 'Success') {
          up++;
        } else if (latestResult.status === 'Failure') {
          down++;
        } else if (latestResult.status === 'Warning') {
          warning++;
        }
      }
    });
    
    return {
      up,
      down,
      warning,
      total: probesData.data.length,
    };
  }, [probesData, probeResultsData]);

  // Calculate gateway statuses
  const gatewayStatuses = useMemo(() => {
    if (!gatewaysData?.data) return { online: 0, offline: 0, pending: 0, total: 0 };
    
    const online = gatewaysData.data.filter((g) => g.is_online && g.status === 'active').length;
    const offline = gatewaysData.data.filter((g) => !g.is_online && g.status === 'active').length;
    const pending = gatewaysData.data.filter((g) => g.status === 'pending').length;
    
    return {
      online,
      offline,
      pending,
      total: gatewaysData.data.length,
    };
  }, [gatewaysData]);

  // Get alerts list
  const alerts = useMemo(() => {
    if (!alertsData?.data) return [];
    return alertsData.data;
  }, [alertsData]);

  const handleRefresh = () => {
    refetchProbes();
    refetchGateways();
    refetchAlerts();
  };

  // Helper function to format alert icon (Down for active, Up for resolved)
  const getAlertIcon = (alert: AlertResponse) => {
    if (alert.is_resolved) {
      return <ArrowUp className="w-4 h-4 text-green-600" />;
    }
    return <ArrowDown className="w-4 h-4 text-red-600" />;
  };

  // Helper function to format date
  const formatDate = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const isLoading = probesLoading || gatewaysLoading || alertsLoading;

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
              Monitor
            </h1>
            <p className="text-muted-foreground">Real-time monitoring of all probes and gateways</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="button-refresh-monitor"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Probes Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Probes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{probeStatuses.total}</div>
                      <div className="text-xs text-muted-foreground mt-1">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{probeStatuses.up}</div>
                      <div className="text-xs text-muted-foreground mt-1">Up</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{probeStatuses.down}</div>
                      <div className="text-xs text-muted-foreground mt-1">Down</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{probeStatuses.warning}</div>
                      <div className="text-xs text-muted-foreground mt-1">Warning</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gateways Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Gateways
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{gatewayStatuses.total}</div>
                      <div className="text-xs text-muted-foreground mt-1">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{gatewayStatuses.online}</div>
                      <div className="text-xs text-muted-foreground mt-1">Online</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{gatewayStatuses.offline}</div>
                      <div className="text-xs text-muted-foreground mt-1">Offline</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{gatewayStatuses.pending}</div>
                      <div className="text-xs text-muted-foreground mt-1">Pending</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Alarms List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alarms
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No alarms</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {getAlertIcon(alert)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">
                            {alert.probe_name || 'Unknown Probe'}
                          </span>
                          <Badge
                            variant={alert.is_resolved ? 'outline' : 'default'}
                            className={
                              alert.is_resolved
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }
                          >
                            {alert.is_resolved ? 'Resolved' : 'Active'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(alert.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

