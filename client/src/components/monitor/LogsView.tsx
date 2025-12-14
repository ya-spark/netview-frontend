import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { LogsApiService } from '@/services/logsApi';
import type { Probe } from '@/types/probe';
import type { GatewayResponse } from '@/types/gateway';
import type { LogEntry } from '@/services/logsApi';
import { formatDate, getProbeStatusBgColor, getProbeStatusLabel } from './utils';
import { LogFileViewer } from './LogFileViewer';

interface LogsViewProps {
  probesData: Probe[];
  gatewaysData: GatewayResponse[];
  setLocation: (path: string) => void;
}

export function LogsView({ 
  probesData, 
  gatewaysData, 
  setLocation 
}: LogsViewProps) {
  const [logType, setLogType] = useState<'gateway' | 'probe' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [viewingExecutionId, setViewingExecutionId] = useState<string | null>(null);
  const limit = 10;

  // Read from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') as 'gateway' | 'probe' | null;
    const id = params.get('id');
    const pageParam = params.get('page');
    
    if (type === 'gateway' || type === 'probe') {
      setLogType(type);
    }
    if (id) {
      setSelectedId(id);
    }
    if (pageParam) {
      setPage(parseInt(pageParam, 10));
    }
  }, []);

  // Update URL when state changes
  useEffect(() => {
    if (logType && selectedId) {
      const params = new URLSearchParams();
      params.set('type', logType);
      params.set('id', selectedId);
      params.set('page', page.toString());
      setLocation(`/monitor/logs?${params.toString()}`);
    }
  }, [logType, selectedId, page, setLocation]);

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/logs', logType, selectedId, page],
    queryFn: async () => {
      if (!logType || !selectedId) return null;
      if (logType === 'gateway') {
        return LogsApiService.getGatewayLogs(selectedId, limit, (page - 1) * limit);
      } else {
        return LogsApiService.getProbeLogs(selectedId, limit, (page - 1) * limit);
      }
    },
    enabled: !!logType && !!selectedId,
  });

  const totalPages = logsData?.total_count ? Math.ceil(logsData.total_count / limit) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Logs
        </CardTitle>
        <CardDescription>View logs for gateways or probes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Log Type Selection */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Select Log Type</p>
          <div className="flex gap-2">
            <Button
              variant={logType === 'gateway' ? 'default' : 'outline'}
              onClick={() => {
                setLogType('gateway');
                setSelectedId(null);
                setPage(1);
              }}
            >
              Gateway Logs
            </Button>
            <Button
              variant={logType === 'probe' ? 'default' : 'outline'}
              onClick={() => {
                setLogType('probe');
                setSelectedId(null);
                setPage(1);
              }}
            >
              Probe Logs
            </Button>
          </div>
        </div>

        {/* Target Selection */}
        {logType && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              Select {logType === 'gateway' ? 'Gateway' : 'Probe'}
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedId
                    ? (logType === 'gateway'
                        ? gatewaysData.find((gw) => gw.id === selectedId)?.name
                        : probesData.find((probe) => probe.id === selectedId)?.name) || 'Select...'
                    : `Select ${logType === 'gateway' ? 'Gateway' : 'Probe'}...`}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder={`Search ${logType === 'gateway' ? 'gateways' : 'probes'}...`} />
                  <CommandList>
                    <CommandEmpty>No {logType === 'gateway' ? 'gateways' : 'probes'} found.</CommandEmpty>
                    <CommandGroup>
                      {logType === 'gateway'
                        ? gatewaysData.map((gw) => (
                            <CommandItem
                              key={gw.id}
                              value={`${gw.id}-${gw.name}`}
                              onSelect={() => {
                                setSelectedId(gw.id);
                                setPage(1);
                              }}
                            >
                              {gw.name}
                            </CommandItem>
                          ))
                        : probesData.map((probe) => (
                            <CommandItem
                              key={probe.id}
                              value={`${probe.id}-${probe.name}`}
                              onSelect={() => {
                                setSelectedId(probe.id);
                                setPage(1);
                              }}
                            >
                              {probe.name}
                            </CommandItem>
                          ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Logs Display */}
        {logType && selectedId && (
          <div className="space-y-4">
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !logsData?.data || logsData.data.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No logs available</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {logsData.data.map((log: LogEntry, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
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
                        {logType === 'probe' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs shrink-0 whitespace-nowrap"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (log.execution_id) {
                                setViewingExecutionId(log.execution_id);
                              }
                            }}
                            disabled={!log.execution_id}
                          >
                            Get Execution Log
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {log.message || log.content || 'No message'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
      
      {logType === 'probe' && selectedId && (
        <LogFileViewer
          executionId={viewingExecutionId}
          probeId={selectedId}
          isOpen={!!viewingExecutionId}
          onClose={() => setViewingExecutionId(null)}
        />
      )}
    </Card>
  );
}
