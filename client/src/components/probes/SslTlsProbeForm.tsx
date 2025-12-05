import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SslTlsProbeFormProps {
  hostname: string;
  port: number;
  warningDays: number;
  checkExpiry: boolean;
  onHostnameChange: (value: string) => void;
  onPortChange: (value: number) => void;
  onWarningDaysChange: (value: number) => void;
  onCheckExpiryChange: (value: boolean) => void;
  showAdvanced: boolean;
}

export function SslTlsProbeForm({
  hostname,
  port,
  warningDays,
  checkExpiry,
  onHostnameChange,
  onPortChange,
  onWarningDaysChange,
  onCheckExpiryChange,
  showAdvanced,
}: SslTlsProbeFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Probe Configuration</h3>
      
      {/* Mandatory Field */}
      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
        <div className="sm:text-right flex items-center justify-end gap-1">
          <Label htmlFor="hostname">
            Hostname *
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>The hostname to check SSL/TLS certificate for (e.g., www.example.com)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="hostname"
          className="sm:col-span-3"
          placeholder="www.google.com"
          value={hostname}
          onChange={(e) => onHostnameChange(e.target.value)}
        />
      </div>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="port">
                Port
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>TCP port to check SSL/TLS certificate on (default: 443)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="port"
              type="number"
              className="sm:col-span-3"
              placeholder="443"
              value={port}
              onChange={(e) => onPortChange(parseInt(e.target.value) || 443)}
              min="1"
              max="65535"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="warning-days">
                Warning Days
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Number of days before certificate expiry to trigger a warning</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="warning-days"
              type="number"
              className="sm:col-span-3"
              placeholder="30"
              value={warningDays}
              onChange={(e) => onWarningDaysChange(parseInt(e.target.value) || 30)}
              min="1"
              max="365"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="check-expiry">
                Check Expiry
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Check if the SSL/TLS certificate is expired or expiring soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="sm:col-span-3 flex items-center gap-2">
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
      )}
    </div>
  );
}
