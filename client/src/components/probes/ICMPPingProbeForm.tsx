import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ICMPPingProbeFormProps {
  target: string;
  packetCount: number;
  timeout: number;
  onTargetChange: (value: string) => void;
  onPacketCountChange: (value: number) => void;
  onTimeoutChange: (value: number) => void;
  showAdvanced: boolean;
}

export function ICMPPingProbeForm({
  target,
  packetCount,
  timeout,
  onTargetChange,
  onPacketCountChange,
  onTimeoutChange,
  showAdvanced,
}: ICMPPingProbeFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Probe Configuration</h3>
      
      {/* Mandatory Field */}
      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
        <div className="sm:text-right flex items-center justify-end gap-1">
          <Label htmlFor="target">
            Target *
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>The IP address or hostname to ping (e.g., 8.8.8.8 or google.com)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="target"
          className="sm:col-span-3"
          placeholder="IP address or hostname (e.g., 8.8.8.8)"
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
        />
      </div>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="packet-count">
                Packet Count
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Number of ICMP packets to send (1-100)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="packet-count"
              type="number"
              className="sm:col-span-3"
              placeholder="4"
              value={packetCount}
              onChange={(e) => onPacketCountChange(parseInt(e.target.value) || 4)}
              min="1"
              max="100"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="icmp-timeout">
                Timeout (seconds)
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maximum time to wait for ICMP ping response</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="icmp-timeout"
              type="number"
              className="sm:col-span-3"
              placeholder="5"
              value={timeout}
              onChange={(e) => onTimeoutChange(parseInt(e.target.value) || 5)}
              min="1"
              max="300"
            />
          </div>
        </>
      )}
    </div>
  );
}
