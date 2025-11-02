import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DnsConfigSectionProps {
  target: string;
  recordType: string;
  nameserver: string;
  timeout: number;
  onTargetChange: (value: string) => void;
  onRecordTypeChange: (value: string) => void;
  onNameserverChange: (value: string) => void;
  onTimeoutChange: (value: number) => void;
}

export function DnsConfigSection({
  target,
  recordType,
  nameserver,
  timeout,
  onTargetChange,
  onRecordTypeChange,
  onNameserverChange,
  onTimeoutChange,
}: DnsConfigSectionProps) {
  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="target" className="text-right">
          Target *
        </Label>
        <Input
          id="target"
          className="col-span-3"
          placeholder="Domain name (e.g., google.com)"
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="record-type" className="text-right">
          Record Type
        </Label>
        <Select value={recordType} onValueChange={onRecordTypeChange}>
          <SelectTrigger className="col-span-3" id="record-type">
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
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="nameserver" className="text-right">
          Nameserver (Optional)
        </Label>
        <Input
          id="nameserver"
          className="col-span-3"
          placeholder="8.8.8.8"
          value={nameserver}
          onChange={(e) => onNameserverChange(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="dns-timeout" className="text-right">
          Timeout (seconds)
        </Label>
        <Input
          id="dns-timeout"
          type="number"
          className="col-span-3"
          placeholder="10"
          value={timeout}
          onChange={(e) => onTimeoutChange(parseInt(e.target.value) || 10)}
          min="1"
          max="300"
        />
      </div>
    </>
  );
}
