import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, FileText, ArrowLeft } from 'lucide-react';
import type { Probe, ProbeResult } from '@/types/probe';
import type { LogEntry } from '@/services/logsApi';
import { getProbeStatusBgColor, getProbeStatusLabel, getProbeStatus, formatRelativeTime, formatDate } from './utils';

interface ProbeDetailProps {
  probeId: string;
  probeDetailData?: { data: Probe };
  probeLogsData?: { data: LogEntry[] };
  probeResultsData: Record<string, ProbeResult[]>;
  isLoading: boolean;
  logsLoading: boolean;
  onBack: () => void;
  onViewAllLogs: (probeId: string) => void;
  getLatestProbeResult: (probeId: string) => ProbeResult | null;
  getGatewayName: (gatewayId?: string | null) => string;
}

export function ProbeDetail({
  probeId,
  probeDetailData,
  probeLogsData,
  probeResultsData,
  isLoading,
  logsLoading,
  onBack,
  onViewAllLogs,
  getLatestProbeResult,
  getGatewayName,
}: ProbeDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Probes
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : !probeDetailData?.data ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Probe not found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {probeDetailData.data.name}
              </CardTitle>
              <CardDescription>{probeDetailData.data.description || 'No description'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Type</p>
                  <p className="text-foreground">{probeDetailData.data.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Category</p>
                  <p className="text-foreground">{probeDetailData.data.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  {(() => {
                    const latestResult = getLatestProbeResult(probeId);
                    const status = latestResult ? getProbeStatus(latestResult) : 'Pending';
                    const statusLabel = getProbeStatusLabel(status);
                    return (
                      <Badge className={getProbeStatusBgColor(status, probeDetailData.data.is_active)}>
                        {statusLabel}
                      </Badge>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Active</p>
                  <Badge variant={probeDetailData.data.is_active ? 'default' : 'secondary'}>
                    {probeDetailData.data.is_active ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Last Pulled</p>
                  <p className="text-foreground">
                    {getLatestProbeResult(probeId)?.checked_at 
                      ? formatRelativeTime(getLatestProbeResult(probeId)!.checked_at)
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Gateway</p>
                  <p className="text-foreground">{getGatewayName(probeDetailData.data.gateway_id)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Response Time</p>
                  <p className="text-foreground">
                    {getLatestProbeResult(probeId)?.execution_time 
                      ? `${getLatestProbeResult(probeId)!.execution_time}ms`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Uptime</p>
                  <p className="text-foreground">Calculating...</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                  onClick={() => onViewAllLogs(probeId)}
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
              ) : !probeLogsData?.data || probeLogsData.data.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No logs available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {probeLogsData.data.map((log: LogEntry, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </span>
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
