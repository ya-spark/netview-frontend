import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuthenticationConfigSectionProps {
  url: string;
  method: string;
  expectedStatus: number;
  credentialType: 'username_password' | 'api_key' | 'token';
  username: string;
  password: string;
  apiKey: string;
  token: string;
  onUrlChange: (value: string) => void;
  onMethodChange: (value: string) => void;
  onExpectedStatusChange: (value: number) => void;
  onCredentialTypeChange: (value: 'username_password' | 'api_key' | 'token') => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onTokenChange: (value: string) => void;
}

export function AuthenticationConfigSection({
  url,
  method,
  expectedStatus,
  credentialType,
  username,
  password,
  apiKey,
  token,
  onUrlChange,
  onMethodChange,
  onExpectedStatusChange,
  onCredentialTypeChange,
  onUsernameChange,
  onPasswordChange,
  onApiKeyChange,
  onTokenChange,
}: AuthenticationConfigSectionProps) {
  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="url" className="text-right">
          URL *
        </Label>
        <Input
          id="url"
          className="col-span-3"
          placeholder="https://api.example.com/auth"
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
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
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
        <Label htmlFor="credential-type" className="text-right">
          Credential Type
        </Label>
        <Select value={credentialType} onValueChange={onCredentialTypeChange}>
          <SelectTrigger className="col-span-3" id="credential-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="username_password">Username/Password</SelectItem>
            <SelectItem value="api_key">API Key</SelectItem>
            <SelectItem value="token">Token</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {credentialType === 'username_password' && (
        <>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <Input
              id="username"
              className="col-span-3"
              placeholder="test@example.com"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              className="col-span-3"
              placeholder="Enter password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
          </div>
        </>
      )}
      {credentialType === 'api_key' && (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="api-key" className="text-right">
            API Key
          </Label>
          <Input
            id="api-key"
            type="password"
            className="col-span-3"
            placeholder="Enter API key"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
          />
        </div>
      )}
      {credentialType === 'token' && (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="token" className="text-right">
            Token
          </Label>
          <Input
            id="token"
            type="password"
            className="col-span-3"
            placeholder="Enter token"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
          />
        </div>
      )}
    </>
  );
}
