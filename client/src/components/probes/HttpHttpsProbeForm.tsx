import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HttpHttpsProbeFormProps {
  url: string;
  method: string;
  expectedStatus: number;
  followRedirects: boolean;
  headers: string;
  sslVerify: boolean;
  timeout: number;
  onUrlChange: (value: string) => void;
  onMethodChange: (value: string) => void;
  onExpectedStatusChange: (value: number) => void;
  onFollowRedirectsChange: (value: boolean) => void;
  onHeadersChange: (value: string) => void;
  onSslVerifyChange: (value: boolean) => void;
  onTimeoutChange: (value: number) => void;
  showAdvanced: boolean;
}

export function HttpHttpsProbeForm({
  url,
  method,
  expectedStatus,
  followRedirects,
  headers,
  sslVerify,
  timeout,
  onUrlChange,
  onMethodChange,
  onExpectedStatusChange,
  onFollowRedirectsChange,
  onHeadersChange,
  onSslVerifyChange,
  onTimeoutChange,
  showAdvanced,
}: HttpHttpsProbeFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Probe Configuration</h3>
      
      {/* Mandatory Field */}
      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
        <div className="sm:text-right flex items-center justify-end gap-1">
          <Label htmlFor="url">
            URL *
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>The full URL to monitor (e.g., https://www.example.com)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="url"
          className="sm:col-span-3"
          placeholder="https://www.google.com"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
        />
      </div>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="method">
                Method
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>HTTP method to use for the request (GET, POST, PUT, etc.)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={method} onValueChange={onMethodChange} className="sm:col-span-3">
              <SelectTrigger className="w-full" id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="HEAD">HEAD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="expected-status">
                Expected Status
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>HTTP status code that indicates success (e.g., 200 for OK)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="expected-status"
              type="number"
              className="sm:col-span-3"
              placeholder="200"
              value={expectedStatus}
              onChange={(e) => onExpectedStatusChange(parseInt(e.target.value) || 200)}
              min="100"
              max="599"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="follow-redirects">
                Follow Redirects
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Automatically follow HTTP redirects (3xx status codes)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="sm:col-span-3 flex items-center gap-2">
              <Checkbox
                id="follow-redirects"
                checked={followRedirects}
                onCheckedChange={(checked) => onFollowRedirectsChange(checked === true)}
              />
              <Label htmlFor="follow-redirects" className="text-sm text-muted-foreground cursor-pointer">
                Automatically follow HTTP redirects
              </Label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="headers">
                Headers (JSON)
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Custom HTTP headers to include in the request (JSON format)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="headers"
              className="sm:col-span-3"
              placeholder='{"Authorization": "Bearer token", "User-Agent": "NetView-Probe/1.0"}'
              value={headers}
              onChange={(e) => onHeadersChange(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="ssl-verify">
                SSL Verify
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Verify SSL/TLS certificate validity</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="sm:col-span-3 flex items-center gap-2">
              <Checkbox
                id="ssl-verify"
                checked={sslVerify}
                onCheckedChange={(checked) => onSslVerifyChange(checked === true)}
              />
              <Label htmlFor="ssl-verify" className="text-sm text-muted-foreground cursor-pointer">
                Verify SSL certificate
              </Label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="http-timeout">
                Timeout (seconds)
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maximum time to wait for HTTP response</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="http-timeout"
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
