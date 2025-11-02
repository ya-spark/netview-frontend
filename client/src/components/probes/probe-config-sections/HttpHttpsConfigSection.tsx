import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface HttpHttpsConfigSectionProps {
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
}

export function HttpHttpsConfigSection({
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
}: HttpHttpsConfigSectionProps) {
  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="url" className="text-right">
          URL *
        </Label>
        <Input
          id="url"
          className="col-span-3"
          placeholder="https://www.google.com"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="method" className="text-right">
          Method
        </Label>
        <Select value={method} onValueChange={onMethodChange}>
          <SelectTrigger className="col-span-3" id="method">
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
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="expected-status" className="text-right">
          Expected Status
        </Label>
        <Input
          id="expected-status"
          type="number"
          className="col-span-3"
          placeholder="200"
          value={expectedStatus}
          onChange={(e) => onExpectedStatusChange(parseInt(e.target.value) || 200)}
          min="100"
          max="599"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="follow-redirects" className="text-right">
          Follow Redirects
        </Label>
        <div className="col-span-3 flex items-center gap-2">
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
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="headers" className="text-right">
          Headers (JSON)
        </Label>
        <Textarea
          id="headers"
          className="col-span-3"
          placeholder='{"Authorization": "Bearer token", "User-Agent": "NetView-Probe/1.0"}'
          value={headers}
          onChange={(e) => onHeadersChange(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="ssl-verify" className="text-right">
          SSL Verify
        </Label>
        <div className="col-span-3 flex items-center gap-2">
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
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="http-timeout" className="text-right">
          Timeout (seconds)
        </Label>
        <Input
          id="http-timeout"
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
