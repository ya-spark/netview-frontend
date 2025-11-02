import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface IcmpPingConfigSectionProps {
  target: string;
  packetCount: number;
  timeout: number;
  onTargetChange: (value: string) => void;
  onPacketCountChange: (value: number) => void;
  onTimeoutChange: (value: number) => void;
}

export function IcmpPingConfigSection({
  target,
  packetCount,
  timeout,
  onTargetChange,
  onPacketCountChange,
  onTimeoutChange,
}: IcmpPingConfigSectionProps) {
  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="target" className="text-right">
          Target *
        </Label>
        <Input
          id="target"
          className="col-span-3"
          placeholder="IP address or hostname (e.g., 8.8.8.8)"
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="packet-count" className="text-right">
          Packet Count
        </Label>
        <Input
          id="packet-count"
          type="number"
          className="col-span-3"
          placeholder="4"
          value={packetCount}
          onChange={(e) => onPacketCountChange(parseInt(e.target.value) || 4)}
          min="1"
          max="100"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="icmp-timeout" className="text-right">
          Timeout (seconds)
        </Label>
        <Input
          id="icmp-timeout"
          type="number"
          className="col-span-3"
          placeholder="5"
          value={timeout}
          onChange={(e) => onTimeoutChange(parseInt(e.target.value) || 5)}
          min="1"
          max="300"
        />
      </div>
    </>
  );
}
