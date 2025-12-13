import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Server, AlertTriangle, CheckCircle, ArrowDown, ArrowUp } from 'lucide-react';
import type { Probe, ProbeResult } from '@/types/probe';
import type { GatewayResponse } from '@/types/gateway';
import type { AlertResponse } from '@/types/alert';
import { formatDate } from './utils';

interface MonitorOverviewProps {
  probesData?: { data: Probe[] };
  gatewaysData?: { data: GatewayResponse[] };
  alertsData?: { data: AlertResponse[] };
  probeResultsData: Record<string, ProbeResult[]>;
  isLoading: boolean;
  onAlertClick: (alertId: string) => void;
  selectedAlertId?: string;
}

export function MonitorOverview({
  probesData,
  gatewaysData,
  alertsData,
  probeResultsData,
  isLoading,
  onAlertClick,
  selectedAlertId,
}: MonitorOverviewProps) {
  // Calculate probe statuses from latest results
  const probeStatuses = useMemo(() => {
    if (!probesData?.data) return { up: 0, down: 0, warning: 0, pending: 0, total: 0 };
    
    const total = probesData.data.length;
    let up = 0;
    let down = 0;
    let warning = 0;
    let pending = 0;
    
    probesData.data.forEach((probe) => {
      if (!probe.is_active) return;
      
      const results = probeResultsData?.[probe.id] || [];
      const latestResult = results[0];
      
      if (latestResult) {
        const status = latestResult.status;
        if (status === 'Success') {
          up++;
        } else if (status === 'Failure') {
          down++;
        } else if (status === 'Warning') {
          warning++;
        } else if (status === 'Pending') {
          pending++;
        } else {
          pending++;
        }
      } else {
        pending++;
      }
    });
    
    return { up, down, warning, pending, total };
  }, [probesData, probeResultsData]);

  // Calculate gateway statuses
  const gatewayStatuses = useMemo(() => {
    if (!gatewaysData?.data) return { online: 0, offline: 0, pending: 0, total: 0 };
    
    const total = gatewaysData.data.length;
    const pending = gatewaysData.data.filter((g) => g.status === 'pending').length;
    const activeGateways = gatewaysData.data.filter((g) => g.status !== 'pending');
    const online = activeGateways.filter((g) => g.is_online).length;
    const offline = activeGateways.filter((g) => !g.is_online).length;
    
    return { online, offline, pending, total };
  }, [gatewaysData]);

  // Get alerts list
  const alerts = useMemo(() => {
    if (!alertsData?.data) return [];
    return alertsData.data;
  }, [alertsData]);

  // Helper function to format alert icon
  const getAlertIcon = (alert: AlertResponse) => {
    if (alert.is_resolved) {
      return <ArrowUp className="w-4 h-4 text-green-600" />;
    }
    return <ArrowDown className="w-4 h-4 text-red-600" />;
  };

  return (
    <>
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
                <div className="grid grid-cols-5 gap-4">
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
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{probeStatuses.pending}</div>
                    <div className="text-xs text-muted-foreground mt-1">Pending</div>
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
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors cursor-pointer ${
                      selectedAlertId === alert.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => onAlertClick(alert.id)}
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
    </>
  );
}
