import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DnsProbeFormProps {
  target: string;
  recordType: string;
  nameserver: string;
  timeout: number;
  onTargetChange: (value: string) => void;
  onRecordTypeChange: (value: string) => void;
  onNameserverChange: (value: string) => void;
  onTimeoutChange: (value: number) => void;
  showAdvanced: boolean;
}

export function DnsProbeForm({
  target,
  recordType,
  nameserver,
  timeout,
  onTargetChange,
  onRecordTypeChange,
  onNameserverChange,
  onTimeoutChange,
  showAdvanced,
}: DnsProbeFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Probe Configuration</h3>
      
      {/* Mandatory Field */}
      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
        <div className="sm:text-right flex items-center justify-end gap-1">
          <Label htmlFor="dns-target">
            Target *
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>The domain name to resolve (e.g., google.com)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="dns-target"
          className="sm:col-span-3"
          placeholder="Domain name (e.g., google.com)"
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
        />
      </div>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="record-type">
                Record Type
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The DNS record type to query (A, AAAA, CNAME, MX, etc.)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={recordType} onValueChange={onRecordTypeChange} className="sm:col-span-3">
              <SelectTrigger className="w-full" id="record-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="AAAA">AAAA</SelectItem>
                <SelectItem value="CNAME">CNAME</SelectItem>
                <SelectItem value="MX">MX</SelectItem>
                <SelectItem value="TXT">TXT</SelectItem>
                <SelectItem value="NS">NS</SelectItem>
                <SelectItem value="SOA">SOA</SelectItem>
                <SelectItem value="PTR">PTR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="nameserver">
                Nameserver
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Choose the nameserver to which the DNS query will be sent (e.g., 8.8.8.8). Leave empty to use default nameservers.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="nameserver"
              className="sm:col-span-3"
              placeholder="8.8.8.8"
              value={nameserver}
              onChange={(e) => onNameserverChange(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="dns-timeout">
                Timeout (seconds)
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maximum time to wait for DNS resolution response</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="dns-timeout"
              type="number"
              className="sm:col-span-3"
              placeholder="10"
              value={timeout}
              onChange={(e) => onTimeoutChange(parseInt(e.target.value) || 10)}
              min="1"
              max="300"
            />
          </div>
        </>
      )}
    </div>
  );
}
