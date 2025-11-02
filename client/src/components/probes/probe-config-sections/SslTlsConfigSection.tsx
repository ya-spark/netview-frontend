import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface SslTlsConfigSectionProps {
  hostname: string;
  port: number;
  warningDays: number;
  checkExpiry: boolean;
  onHostnameChange: (value: string) => void;
  onPortChange: (value: number) => void;
  onWarningDaysChange: (value: number) => void;
  onCheckExpiryChange: (value: boolean) => void;
}

export function SslTlsConfigSection({
  hostname,
  port,
  warningDays,
  checkExpiry,
  onHostnameChange,
  onPortChange,
  onWarningDaysChange,
  onCheckExpiryChange,
}: SslTlsConfigSectionProps) {
  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="hostname" className="text-right">
          Hostname *
        </Label>
        <Input
          id="hostname"
          className="col-span-3"
          placeholder="www.google.com"
          value={hostname}
          onChange={(e) => onHostnameChange(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="port" className="text-right">
          Port
        </Label>
        <Input
          id="port"
          type="number"
          className="col-span-3"
          placeholder="443"
          value={port}
          onChange={(e) => onPortChange(parseInt(e.target.value) || 443)}
          min="1"
          max="65535"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="warning-days" className="text-right">
          Warning Days
        </Label>
        <Input
          id="warning-days"
          type="number"
          className="col-span-3"
          placeholder="30"
          value={warningDays}
          onChange={(e) => onWarningDaysChange(parseInt(e.target.value) || 30)}
          min="1"
          max="365"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="check-expiry" className="text-right">
          Check Expiry
        </Label>
        <div className="col-span-3 flex items-center gap-2">
          <Checkbox
            id="check-expiry"
            checked={checkExpiry}
            onCheckedChange={(checked) => onCheckExpiryChange(checked === true)}
          />
          <Label htmlFor="check-expiry" className="text-sm text-muted-foreground cursor-pointer">
            Check certificate expiry
          </Label>
        </div>
      </div>
    </>
  );
}
