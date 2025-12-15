import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Server, Search, Filter, X, Wifi, WifiOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GatewayResponse } from '@/types/gateway';
import type { Probe } from '@/types/probe';
import { getGatewayStatusColor, getGatewayStatusBgColor, formatRelativeTime } from './utils';

interface GatewaysListProps {
  gatewaysData?: { data: GatewayResponse[] };
  probesData?: { data: Probe[] };
  isLoading: boolean;
  onGatewayClick: (gatewayId: string) => void;
}

export function GatewaysList({
  gatewaysData,
  probesData,
  isLoading,
  onGatewayClick,
}: GatewaysListProps) {
  const [gatewaySearch, setGatewaySearch] = useState('');
  const [gatewayFilters, setGatewayFilters] = useState<{
    type?: string;
    status?: string;
  }>({});
  const [showGatewayFilters, setShowGatewayFilters] = useState(false);

  const filteredGateways = useMemo(() => {
    if (!gatewaysData?.data) return [];
    
    return gatewaysData.data.filter((gateway) => {
      // Search filter
      if (gatewaySearch) {
        const searchLower = gatewaySearch.toLowerCase();
        if (!gateway.name.toLowerCase().includes(searchLower) &&
            !(gateway.location && gateway.location.toLowerCase().includes(searchLower)) &&
            !(gateway.ip_address && gateway.ip_address.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      // Type filter
      if (gatewayFilters.type && gateway.type !== gatewayFilters.type) {
        return false;
      }
      // Status filter
      if (gatewayFilters.status) {
        if (gatewayFilters.status === 'online' && !gateway.is_online) return false;
        if (gatewayFilters.status === 'offline' && gateway.is_online) return false;
        if (gatewayFilters.status === 'pending' && gateway.status !== 'pending') return false;
      }
      return true;
    });
  }, [gatewaysData, gatewaySearch, gatewayFilters]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search gateways by name, location..."
                value={gatewaySearch}
                onChange={(e) => setGatewaySearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGatewayFilters(!showGatewayFilters)}
              className="sm:w-auto w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
          
          {showGatewayFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/50">
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select
                  value={gatewayFilters.type || 'all'}
                  onValueChange={(value) => setGatewayFilters({ ...gatewayFilters, type: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Core">Core</SelectItem>
                    <SelectItem value="TenantSpecific">Tenant Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={gatewayFilters.status || 'all'}
                  onValueChange={(value) => setGatewayFilters({ ...gatewayFilters, status: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(gatewayFilters.type || gatewayFilters.status) && (
                <div className="md:col-span-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGatewayFilters({})}
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
        ) : !gatewaysData?.data || gatewaysData.data.length === 0 ? (
          <div className="text-center py-8">
            <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No gateways found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGateways.map((gateway) => {
              const statusColor = getGatewayStatusColor(gateway.is_online, gateway.status);
              const statusBgColor = getGatewayStatusBgColor(gateway.is_online, gateway.status);
              const probeCount = probesData?.data?.filter((p) => p.gateway_id === gateway.id).length || 0;
              
              return (
                <div
                  key={gateway.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onGatewayClick(gateway.id)}
                >
                  <div className="flex-shrink-0">
                    {gateway.is_online ? (
                      <Wifi className={`w-5 h-5 ${statusColor}`} />
                    ) : (
                      <WifiOff className={`w-5 h-5 ${statusColor}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{gateway.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {gateway.type}
                      </Badge>
                      <Badge className={statusBgColor}>
                        {gateway.is_online ? 'Online' : 'Offline'}
                      </Badge>
                      {gateway.status === 'pending' && (
                        <Badge className="bg-amber-600 dark:bg-amber-400 text-white">Pending</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {gateway.location && <span>Location: {gateway.location}</span>}
                      <span>Probes: {probeCount}</span>
                      {gateway.last_heartbeat && (
                        <span>Last heartbeat: {formatRelativeTime(gateway.last_heartbeat)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
