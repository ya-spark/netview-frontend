import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { LogsApiService } from '@/services/logsApi';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

interface RunProbeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunAgain: () => void;
  probeId: string;
  result: {
    result: string;
    status?: string;
    execution_time?: number;
    error_message?: string;
    execution_id?: string;
    timestamp?: string;
  } | null;
  isLoading?: boolean;
}

export function RunProbeResultModal({
  isOpen,
  onClose,
  onRunAgain,
  probeId,
  result,
  isLoading: resultLoading = false,
}: RunProbeResultModalProps) {
  const { toast } = useToast();

  const { data: logData, isLoading: logLoading, error: logError } = useQuery({
    queryKey: ['/api/logs/probe/execution', result?.execution_id, probeId],
    queryFn: async () => {
      if (!result?.execution_id) return null;
      return LogsApiService.getProbeLogFile(result.execution_id, probeId);
    },
    enabled: isOpen && !!result?.execution_id && !!probeId,
    retry: 1,
  });

  const handleDownload = () => {
    if (!logData?.content) {
      toast({
        title: 'Error',
        description: 'No log content available to download',
        variant: 'destructive',
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `probe_execution_${result?.execution_id || 'unknown'}_${timestamp}.log`;
      
      const blob = new Blob([logData.content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      logger.info('Log file downloaded successfully', {
        component: 'RunProbeResultModal',
        action: 'download_log_file',
        executionId: result?.execution_id,
        filename,
      });

      toast({
        title: 'Success',
        description: 'Log file downloaded successfully',
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to download log file', err, {
        component: 'RunProbeResultModal',
        action: 'download_log_file',
        executionId: result?.execution_id,
      });

      toast({
        title: 'Error',
        description: 'Failed to download log file',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = () => {
    if (resultLoading) return null;
    if (result?.result === 'okay' || result?.status === 'Success') {
      return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    }
    return <XCircle className="w-6 h-6 text-red-500" />;
  };

  const getStatusBadge = () => {
    if (resultLoading) return null;
    const status = result?.status || (result?.result === 'okay' ? 'Success' : 'Failure');
    const variant = status === 'Success' ? 'default' : 'destructive';
    return (
      <Badge variant={variant} className="ml-2">
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <div>
                <DialogTitle>Probe Run Result</DialogTitle>
                <div className="flex items-center gap-2">
                  <DialogDescription>
                    {result?.execution_id ? `Execution ID: ${result.execution_id}` : 'Running probe...'}
                  </DialogDescription>
                  {getStatusBadge()}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {logData?.content && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={logLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Log
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={onRunAgain}
                disabled={resultLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Again
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden mt-4 space-y-4">
          {/* Result Summary */}
          {resultLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : result ? (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Result Summary</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.timestamp ? new Date(result.timestamp).toLocaleString() : 'Just now'}
                  </p>
                </div>
                <div className="text-right">
                  {result.execution_time !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      Execution Time: <span className="font-medium">{result.execution_time.toFixed(2)}ms</span>
                    </div>
                  )}
                </div>
              </div>
              
              {result.error_message && (
                <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80 mt-1">{result.error_message}</p>
                    </div>
                  </div>
                </div>
              )}

              {result.result === 'okay' && !result.error_message && (
                <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-green-700 dark:text-green-400">Success</p>
                      <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                        Probe executed successfully
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Execution Log */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <h3 className="font-semibold mb-2">Execution Log</h3>
            {logLoading ? (
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : logError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                <p className="text-destructive font-medium">
                  Failed to load log file
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {logError instanceof Error ? logError.message : 'Unknown error occurred'}
                </p>
              </div>
            ) : !logData?.content ? (
              <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {result?.execution_id 
                    ? 'Log file not available yet. It may still be processing.' 
                    : 'No log content available'}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg bg-muted/50 p-4 h-full overflow-auto flex-1">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground">
                  {logData.content}
                </pre>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


