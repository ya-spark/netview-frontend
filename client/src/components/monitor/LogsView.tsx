import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { FileText, ChevronLeft, ChevronRight, ChevronDown, X, Search } from 'lucide-react';
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
  
  // Filter input values (not applied yet)
  const [dateStartInput, setDateStartInput] = useState<string>('');
  const [dateEndInput, setDateEndInput] = useState<string>('');
  const [statusFilterInput, setStatusFilterInput] = useState<string[]>([]);
  
  // Applied filter values (used for API calls)
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [limit, setLimit] = useState<number>(10);
  
  const statusOptions = ['Success', 'Failure', 'Warning', 'Pending', 'Unknown'];
  const itemsPerPageOptions = [5, 10, 20];

  // Read from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') as 'gateway' | 'probe' | null;
    const id = params.get('id');
    const pageParam = params.get('page');
    const limitParam = params.get('limit');
    const dateStartParam = params.get('dateStart');
    const dateEndParam = params.get('dateEnd');
    const statusParam = params.get('status');
    
    if (type === 'gateway' || type === 'probe') {
      setLogType(type);
    }
    if (id) {
      setSelectedId(id);
    }
    if (pageParam) {
      setPage(parseInt(pageParam, 10));
    }
    if (limitParam) {
      const limitValue = parseInt(limitParam, 10);
      if ([5, 10, 20].includes(limitValue)) {
        setLimit(limitValue);
      }
    }
    if (dateStartParam) {
      setDateStart(dateStartParam);
      setDateStartInput(dateStartParam);
    }
    if (dateEndParam) {
      setDateEnd(dateEndParam);
      setDateEndInput(dateEndParam);
    }
    if (statusParam) {
      // Parse comma-separated status values
      const statuses = statusParam.split(',').filter(s => s.trim());
      setStatusFilter(statuses);
      setStatusFilterInput(statuses);
    }
  }, []);

  // Update URL when state changes
  useEffect(() => {
    if (logType && selectedId) {
      const params = new URLSearchParams();
      params.set('type', logType);
      params.set('id', selectedId);
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (dateStart) {
        params.set('dateStart', dateStart);
      }
      if (dateEnd) {
        params.set('dateEnd', dateEnd);
      }
      if (statusFilter.length > 0) {
        params.set('status', statusFilter.join(','));
      }
      setLocation(`/monitor/logs?${params.toString()}`);
    }
  }, [logType, selectedId, page, limit, dateStart, dateEnd, statusFilter, setLocation]);

  // Handle search button click - apply filters
  const handleSearch = () => {
    setDateStart(dateStartInput);
    setDateEnd(dateEndInput);
    setStatusFilter(statusFilterInput);
    setPage(1);
  };
  
  // Handle status checkbox toggle
  const handleStatusToggle = (status: string) => {
    setStatusFilterInput(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/logs', logType, selectedId, page, limit, dateStart, dateEnd, statusFilter.join(',')],
    queryFn: async () => {
      if (!logType || !selectedId) return null;
      // Convert datetime-local format to ISO format for API
      const convertToISO = (dateTimeLocal: string) => {
        if (!dateTimeLocal) return undefined;
        // datetime-local format is "YYYY-MM-DDTHH:mm", convert to ISO
        return new Date(dateTimeLocal).toISOString();
      };
      const filters = {
        dateStart: convertToISO(dateStart),
        dateEnd: convertToISO(dateEnd),
        status: statusFilter.length > 0 ? statusFilter.join(',') : undefined,
      };
      if (logType === 'gateway') {
        return LogsApiService.getGatewayLogs(selectedId, limit, (page - 1) * limit, filters);
      } else {
        return LogsApiService.getProbeLogs(selectedId, limit, (page - 1) * limit, filters);
      }
    },
    enabled: !!logType && !!selectedId,
  });

  const totalPages = logsData?.count ? Math.ceil(logsData.count / limit) : 1;

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
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

        {/* Filters */}
        {logType && selectedId && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Filters</p>
              {(dateStart || dateEnd || statusFilter.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateStart('');
                    setDateEnd('');
                    setStatusFilter([]);
                    setDateStartInput('');
                    setDateEndInput('');
                    setStatusFilterInput([]);
                    setPage(1);
                  }}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
              {/* Date Start Filter */}
              <DateTimePicker
                id="dateStart"
                label="Start Date/Time"
                value={dateStartInput}
                onChange={setDateStartInput}
                placeholder="Pick start date and time"
              />
              {/* Date End Filter */}
              <DateTimePicker
                id="dateEnd"
                label="End Date/Time"
                value={dateEndInput}
                onChange={setDateEndInput}
                placeholder="Pick end date and time"
              />
              {/* Status Filter */}
              {logType === 'probe' && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {statusFilterInput.length > 0
                          ? `${statusFilterInput.length} selected`
                          : 'All statuses'}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-3" align="start">
                      <div className="space-y-2">
                        {statusOptions.map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={`status-${status}`}
                              checked={statusFilterInput.includes(status)}
                              onCheckedChange={() => handleStatusToggle(status)}
                            />
                            <Label
                              htmlFor={`status-${status}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {status}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              {/* Search Button */}
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  className="gap-2 w-full"
                  disabled={!dateStartInput && !dateEndInput && statusFilterInput.length === 0}
                >
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </div>
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
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {logType && selectedId && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
                    {/* Left side: Items per page */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="itemsPerPage" className="text-sm text-muted-foreground whitespace-nowrap">
                        Items per page:
                      </Label>
                      <Select
                        value={limit.toString()}
                        onValueChange={(value) => {
                          const newLimit = parseInt(value, 10);
                          setLimit(newLimit);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger id="itemsPerPage" className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {itemsPerPageOptions.map((option) => (
                            <SelectItem key={option} value={option.toString()}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {logsData && logsData.count !== undefined && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({logsData.count} total)
                        </span>
                      )}
                    </div>
                    {/* Right side: Page navigation */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1 || !logsData || logsData.total_count === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">Page</span>
                        <span className="text-sm text-muted-foreground">
                          {page} of {totalPages || 1}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages || !logsData || logsData.count === 0}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
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
