import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Search, Filter, X, Circle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Probe, ProbeResult } from '@/types/probe';
import type { GatewayResponse } from '@/types/gateway';
import { getProbeStatusColor, getProbeStatusBgColor, getProbeStatusLabel, getProbeStatus, formatRelativeTime, formatResponseTime } from './utils';

interface ProbesListProps {
  probesData?: { data: Probe[] };
  gatewaysData?: { data: GatewayResponse[] };
  probeResultsData: Record<string, ProbeResult[]>;
  isLoading: boolean;
  onProbeClick: (probeId: string) => void;
  getLatestProbeResult: (probeId: string) => ProbeResult | null;
  getGatewayName: (gatewayId?: string | null) => string;
}

export function ProbesList({
  probesData,
  gatewaysData,
  probeResultsData,
  isLoading,
  onProbeClick,
  getLatestProbeResult,
  getGatewayName,
}: ProbesListProps) {
  const [probeSearch, setProbeSearch] = useState('');
  const [probeFilters, setProbeFilters] = useState<{
    gateway?: string;
    type?: string;
    category?: string;
    status?: string;
  }>({});
  const [showProbeFilters, setShowProbeFilters] = useState(false);

  const filteredProbes = useMemo(() => {
    if (!probesData?.data) return [];
    
    return probesData.data.filter((probe) => {
      // Search filter
      if (probeSearch && !probe.name.toLowerCase().includes(probeSearch.toLowerCase())) {
        return false;
      }
      // Gateway filter
      if (probeFilters.gateway && probe.gateway_id !== probeFilters.gateway) {
        return false;
      }
      // Type filter
      if (probeFilters.type && probe.type !== probeFilters.type) {
        return false;
      }
      // Category filter
      if (probeFilters.category && probe.category !== probeFilters.category) {
        return false;
      }
      // Status filter
      if (probeFilters.status) {
        try {
          const latestResult = getLatestProbeResult(probe.id);
          const status = latestResult ? getProbeStatus(latestResult) : 'Pending';
          if (status !== probeFilters.status) {
            return false;
          }
        } catch (error) {
          // If there's an error getting status, don't filter it out
          console.error('Error getting probe status:', error);
        }
      }
      return true;
    });
  }, [probesData, probeSearch, probeFilters, probeResultsData, getLatestProbeResult]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search probes by name..."
                value={probeSearch}
                onChange={(e) => setProbeSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProbeFilters(!showProbeFilters)}
              className="sm:w-auto w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
          
          {showProbeFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border rounded-lg bg-muted/50">
              <div>
                <label className="text-sm font-medium mb-1 block">Gateway</label>
                <Select
                  value={probeFilters.gateway || 'all'}
                  onValueChange={(value) => setProbeFilters({ ...probeFilters, gateway: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Gateways" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Gateways</SelectItem>
                    {gatewaysData?.data?.map((gw) => (
                      <SelectItem key={gw.id} value={gw.id}>{gw.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select
                  value={probeFilters.type || 'all'}
                  onValueChange={(value) => setProbeFilters({ ...probeFilters, type: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ICMP/Ping">ICMP/Ping</SelectItem>
                    <SelectItem value="HTTP/HTTPS">HTTP/HTTPS</SelectItem>
                    <SelectItem value="DNS Resolution">DNS Resolution</SelectItem>
                    <SelectItem value="SSL/TLS">SSL/TLS</SelectItem>
                    <SelectItem value="Authentication">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select
                  value={probeFilters.category || 'all'}
                  onValueChange={(value) => setProbeFilters({ ...probeFilters, category: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Uptime">Uptime</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Browser">Browser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={probeFilters.status || 'all'}
                  onValueChange={(value) => setProbeFilters({ ...probeFilters, status: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Success">Up</SelectItem>
                    <SelectItem value="Failure">Down</SelectItem>
                    <SelectItem value="Warning">Warning</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(probeFilters.gateway || probeFilters.type || probeFilters.category || probeFilters.status) && (
                <div className="md:col-span-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProbeFilters({})}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !probesData?.data || probesData.data.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No probes found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProbes.map((probe) => {
              try {
                const latestResult = getLatestProbeResult(probe.id);
                const status = latestResult ? getProbeStatus(latestResult) : 'Pending';
                const statusColor = getProbeStatusColor(status, probe.is_active);
                const statusLabel = getProbeStatusLabel(status);
                const statusBgColor = getProbeStatusBgColor(status, probe.is_active);
                
                return (
                  <div
                    key={probe.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onProbeClick(probe.id)}
                  >
                    <div className="flex-shrink-0">
                      <Circle className={`w-4 h-4 ${statusColor} fill-current`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{probe.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {probe.type}
                        </Badge>
                        {!probe.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Category: {probe.category}</span>
                        <span>Gateway: {getGatewayName(probe.gateway_id)}</span>
                        {latestResult && (
                          <>
                            <span>Last check: {formatRelativeTime(latestResult.checked_at)}</span>
                            <span>Response: {formatResponseTime(latestResult.execution_time)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge className={statusBgColor}>
                        {statusLabel}
                      </Badge>
                    </div>
                  </div>
                );
              } catch (error) {
                console.error('Error rendering probe:', error, probe);
                // Return a fallback component instead of null
                return (
                  <div
                    key={probe.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <span className="font-semibold text-foreground">{probe.name}</span>
                      <p className="text-sm text-muted-foreground">Error loading probe status</p>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
