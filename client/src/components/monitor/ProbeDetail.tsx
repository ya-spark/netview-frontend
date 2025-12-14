import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, FileText, ArrowLeft, Settings } from 'lucide-react';
import { useLocation } from 'wouter';
import { useMemo } from 'react';
import type { Probe, ProbeResult, ProbeResultsListResponse } from '@/types/probe';
import type { LogEntry } from '@/services/logsApi';
import { getProbeStatusBgColor, getProbeStatusLabel, getProbeStatus, formatRelativeTime, formatDate, formatResponseTime } from './utils';

interface ProbeDetailProps {
  probeId: string;
  probeDetailData?: { data: Probe };
  probeLogsData?: { data: LogEntry[] };
  probeResultsData: Record<string, ProbeResult[]>;
  probeResultsForStats?: ProbeResultsListResponse;
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
  probeResultsForStats,
  isLoading,
  logsLoading,
  onBack,
  onViewAllLogs,
  getLatestProbeResult,
  getGatewayName,
}: ProbeDetailProps) {
  const [, setLocation] = useLocation();

  // Calculate success/failure/misses from probe results (last 1 hour only)
  const resultsStats = useMemo(() => {
    if (!probeResultsForStats?.data || probeResultsForStats.data.length === 0) {
      return { up: 0, down: 0, misses: 0 };
    }

    // Calculate the timestamp for 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Filter results to only include those from the last 1 hour
    const recentResults = probeResultsForStats.data.filter((result) => {
      if (!result.checked_at) return false;
      const checkedAt = new Date(result.checked_at);
      return checkedAt >= oneHourAgo;
    });

    let up = 0;
    let down = 0;
    let misses = 0;

    recentResults.forEach((result) => {
      if (result.status === 'Success') {
        up++;
      } else if (result.status === 'Failure') {
        down++;
      } else {
        // Warning, Pending, or unknown are considered misses
        misses++;
      }
    });

    return { up, down, misses };
  }, [probeResultsForStats]);

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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation(`/manage/probes/${probeId}`)}
        >
          <Settings className="w-4 h-4 mr-2" />
          Configuration
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
                    {formatResponseTime(getLatestProbeResult(probeId)?.execution_time)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Results (Success/failures/Misses)</p>
                  <p className="text-foreground">
                    {resultsStats.up}/{resultsStats.down}/{resultsStats.misses}
                  </p>
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
