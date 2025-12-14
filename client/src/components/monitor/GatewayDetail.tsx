import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Server, FileText, ArrowLeft, Wifi, WifiOff, Circle } from 'lucide-react';
import type { GatewayResponse } from '@/types/gateway';
import type { Probe, ProbeResult } from '@/types/probe';
import type { LogEntry } from '@/services/logsApi';
import { getGatewayStatusColor, getProbeStatusColor, getProbeStatusLabel, getProbeStatusBgColor, formatRelativeTime, formatDate } from './utils';

interface GatewayDetailProps {
  gatewayId: string;
  gatewayDetailData?: { data: GatewayResponse };
  gatewayLogsData?: { data: LogEntry[] };
  gatewayUptimeData?: { data: { uptime_percentage: number } };
  probesData?: { data: Probe[] };
  probeResultsData: Record<string, ProbeResult[]>;
  isLoading: boolean;
  logsLoading: boolean;
  onBack: () => void;
  onViewAllLogs: (gatewayId: string) => void;
  onProbeClick: (probeId: string) => void;
  getLatestProbeResult: (probeId: string) => ProbeResult | null;
}

export function GatewayDetail({
  gatewayId,
  gatewayDetailData,
  gatewayLogsData,
  gatewayUptimeData,
  probesData,
  probeResultsData,
  isLoading,
  logsLoading,
  onBack,
  onViewAllLogs,
  onProbeClick,
  getLatestProbeResult,
}: GatewayDetailProps) {
  const assignedProbes = probesData?.data?.filter((p) => p.gateway_id === gatewayId) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Gateways
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : !gatewayDetailData?.data ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Gateway not found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                {gatewayDetailData.data.name}
              </CardTitle>
              <CardDescription>
                {gatewayDetailData.data.location || 'No location specified'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Type</p>
                  <p className="text-foreground">{gatewayDetailData.data.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <Badge className={getGatewayStatusColor(gatewayDetailData.data.is_online, gatewayDetailData.data.status)}>
                    {gatewayDetailData.data.is_online ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Last Heartbeat</p>
                  <p className="text-foreground">
                    {gatewayDetailData.data.last_heartbeat 
                      ? formatRelativeTime(gatewayDetailData.data.last_heartbeat)
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Connection Status</p>
                  <div className="flex items-center gap-2">
                    {gatewayDetailData.data.is_online ? (
                      <Wifi className="w-4 h-4 text-green-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-foreground">
                      {gatewayDetailData.data.is_online ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Probe Count</p>
                  <p className="text-foreground">
                    {assignedProbes.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Uptime</p>
                  <p className="text-foreground">
                    {gatewayUptimeData?.data?.uptime_percentage !== undefined
                      ? `${gatewayUptimeData.data.uptime_percentage.toFixed(2)}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Probes */}
          {assignedProbes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Probes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assignedProbes.map((probe) => {
                    const latestResult = getLatestProbeResult(probe.id);
                    return (
                      <div
                        key={probe.id}
                        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => onProbeClick(probe.id)}
                      >
                        <Circle className={`w-4 h-4 ${getProbeStatusColor(latestResult?.status, probe.is_active)} fill-current`} />
                        <span className="font-medium text-foreground">{probe.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {probe.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground ml-auto">
                          {getProbeStatusLabel(latestResult?.status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last 10 Logs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Last 10 Logs
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewAllLogs(gatewayId)}
                >
                  View All Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !gatewayLogsData?.data || gatewayLogsData.data.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No logs available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gatewayLogsData.data.map((log: LogEntry, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </span>
                        {log.status && (
                          <Badge className={`text-xs ${getProbeStatusBgColor(log.status, true)}`}>
                            {getProbeStatusLabel(log.status)}
                          </Badge>
                        )}
                        {log.level && (
                          <Badge variant="outline" className="text-xs">
                            {log.level}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{log.message || log.content || 'No message'}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
