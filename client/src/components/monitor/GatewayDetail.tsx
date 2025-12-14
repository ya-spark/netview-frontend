import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Server, FileText, ArrowLeft, Wifi, WifiOff, Circle, HardDrive, Database, Cpu, MemoryStick } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { GatewayResponse, GatewaySystemInfo, LogsBreakdown, DbBreakdown } from '@/types/gateway';
import type { Probe, ProbeResult } from '@/types/probe';
import type { LogEntry } from '@/services/logsApi';
import { getGatewayStatusColor, getProbeStatusColor, getProbeStatusLabel, getProbeStatusBgColor, formatRelativeTime, formatDate } from './utils';
import { GatewayApiService } from '@/services/gatewayApi';
import { StorageBreakdown } from './StorageBreakdown';

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
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
  const [logsBreakdownOpen, setLogsBreakdownOpen] = useState(false);
  const [dbBreakdownOpen, setDbBreakdownOpen] = useState(false);
  
  const assignedProbes = probesData?.data?.filter((p) => p.gateway_id === gatewayId) || [];
  const systemInfo = gatewayDetailData?.data?.system_info;

  // Fetch logs breakdown on-demand
  const { data: logsBreakdownData, isLoading: logsBreakdownLoading } = useQuery({
    queryKey: ['/api/gateways', gatewayId, 'logs-breakdown'],
    queryFn: () => GatewayApiService.getGatewayLogsBreakdown(gatewayId),
    enabled: logsBreakdownOpen && !!gatewayId,
  });

  // Fetch DB breakdown on-demand
  const { data: dbBreakdownData, isLoading: dbBreakdownLoading } = useQuery({
    queryKey: ['/api/gateways', gatewayId, 'db-breakdown'],
    queryFn: () => GatewayApiService.getGatewayDbBreakdown(gatewayId),
    enabled: dbBreakdownOpen && !!gatewayId,
  });

  const handleLogsBreakdownClick = () => {
    setLogsBreakdownOpen(true);
  };

  const handleDbBreakdownClick = () => {
    setDbBreakdownOpen(true);
  };

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
          {/* Basic Info Card */}
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
                  <p className="text-sm font-medium text-muted-foreground mb-1">IP Address</p>
                  <p className="text-foreground">{gatewayDetailData.data.ip_address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Registration Date</p>
                  <p className="text-foreground">
                    {gatewayDetailData.data.created_at 
                      ? formatDate(gatewayDetailData.data.created_at)
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Last Successful Heartbeat</p>
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
                  <p className="text-foreground">{assignedProbes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Information Card */}
          {systemInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  System Information
                </CardTitle>
                <CardDescription>
                  Last updated: {formatRelativeTime(systemInfo.updated_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CPU Usage */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">CPU Usage</p>
                      <span className="text-sm font-semibold">{systemInfo.cpu_usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={systemInfo.cpu_usage} className="h-2" />
                  </div>

                  {/* Memory */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <MemoryStick className="w-4 h-4" />
                        Memory
                      </p>
                      <span className="text-sm font-semibold">
                        {formatBytes(systemInfo.memory_used)} / {formatBytes(systemInfo.memory_total)}
                      </span>
                    </div>
                    <Progress 
                      value={(systemInfo.memory_used / systemInfo.memory_total) * 100} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Free: {formatBytes(systemInfo.memory_free)}
                    </p>
                  </div>

                  {/* Disk */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <HardDrive className="w-4 h-4" />
                        Disk
                      </p>
                      <span className="text-sm font-semibold">
                        {formatBytes(systemInfo.disk_used)} / {formatBytes(systemInfo.disk_total)}
                      </span>
                    </div>
                    <Progress 
                      value={(systemInfo.disk_used / systemInfo.disk_total) * 100} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Free: {formatBytes(systemInfo.disk_free)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Storage Information Card */}
          {systemInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Storage Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logs Folder Size */}
                  <div 
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={handleLogsBreakdownClick}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Logs Folder Size</p>
                        <p className="text-lg font-semibold">{formatBytes(systemInfo.logs_size)}</p>
                      </div>
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Click to view breakdown</p>
                  </div>

                  {/* DB Folder Size */}
                  <div 
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={handleDbBreakdownClick}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Database Folder Size</p>
                        <p className="text-lg font-semibold">{formatBytes(systemInfo.db_size)}</p>
                      </div>
                      <Database className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Click to view breakdown</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

      {/* Storage Breakdown Modals */}
      <StorageBreakdown
        type="logs"
        breakdown={logsBreakdownData?.data || {}}
        isOpen={logsBreakdownOpen}
        onClose={() => setLogsBreakdownOpen(false)}
      />
      <StorageBreakdown
        type="db"
        breakdown={dbBreakdownData?.data || {}}
        isOpen={dbBreakdownOpen}
        onClose={() => setDbBreakdownOpen(false)}
      />
    </div>
  );
}
