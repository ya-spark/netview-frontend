import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, AlertCircle } from 'lucide-react';
import { LogsApiService } from '@/services/logsApi';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

interface LogFileViewerProps {
  executionId: string | null;
  probeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LogFileViewer({
  executionId,
  probeId,
  isOpen,
  onClose,
}: LogFileViewerProps) {
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/logs/probe/execution', executionId, probeId],
    queryFn: async () => {
      if (!executionId) return null;
      return LogsApiService.getProbeLogFile(executionId, probeId);
    },
    enabled: isOpen && !!executionId && !!probeId,
    retry: 1,
  });

  const handleDownload = () => {
    if (!data?.content) {
      toast({
        title: 'Error',
        description: 'No log content available to download',
        variant: 'destructive',
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `probe_execution_${executionId}_${timestamp}.log`;
      
      const blob = new Blob([data.content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      logger.info('Log file downloaded successfully', {
        component: 'LogFileViewer',
        action: 'download_log_file',
        executionId,
        filename,
      });

      toast({
        title: 'Success',
        description: 'Log file downloaded successfully',
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to download log file', err, {
        component: 'LogFileViewer',
        action: 'download_log_file',
        executionId,
      });

      toast({
        title: 'Error',
        description: 'Failed to download log file',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Probe Execution Log</DialogTitle>
              <DialogDescription>
                Execution ID: {executionId}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!data?.content || isLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden mt-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-destructive font-medium">
                Failed to load log file
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
            </div>
          ) : !data?.content ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No log content available
              </p>
            </div>
          ) : (
            <div className="border rounded-lg bg-muted/50 p-4 h-full overflow-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground">
                {data.content}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
