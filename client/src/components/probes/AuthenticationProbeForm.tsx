import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AuthenticationProbeFormProps {
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
  showAdvanced: boolean;
}

export function AuthenticationProbeForm({
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
  showAdvanced,
}: AuthenticationProbeFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Probe Configuration</h3>
      
      {/* Mandatory Field */}
      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
        <div className="sm:text-right flex items-center justify-end gap-1">
          <Label htmlFor="auth-url">
            URL *
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>The authentication endpoint URL to test (e.g., https://api.example.com/auth)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="auth-url"
          className="sm:col-span-3"
          placeholder="https://api.example.com/auth"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
        />
      </div>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="auth-method">
                Method
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>HTTP method to use for authentication request</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={method} onValueChange={onMethodChange} className="sm:col-span-3">
              <SelectTrigger className="w-full" id="auth-method">
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
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <div className="sm:text-right flex items-center justify-end gap-1">
              <Label htmlFor="auth-expected-status">
                Expected Status
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>HTTP status code that indicates successful authentication</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="auth-expected-status"
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
              <Label htmlFor="credential-type">
                Credential Type
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Type of credentials to use for authentication (Username/Password, API Key, or Token)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={credentialType} onValueChange={onCredentialTypeChange} className="sm:col-span-3">
              <SelectTrigger className="w-full" id="credential-type">
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
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <div className="sm:text-right flex items-center justify-end gap-1">
                  <Label htmlFor="username">
                    Username
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Username for authentication</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="username"
                  className="sm:col-span-3"
                  placeholder="test@example.com"
                  value={username}
                  onChange={(e) => onUsernameChange(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <div className="sm:text-right flex items-center justify-end gap-1">
                  <Label htmlFor="password">
                    Password
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Password for authentication</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="password"
                  type="password"
                  className="sm:col-span-3"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                />
              </div>
            </>
          )}
          {credentialType === 'api_key' && (
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <div className="sm:text-right flex items-center justify-end gap-1">
                <Label htmlFor="api-key">
                  API Key
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>API key for authentication</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="api-key"
                type="password"
                className="sm:col-span-3"
                placeholder="Enter API key"
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
              />
            </div>
          )}
          {credentialType === 'token' && (
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <div className="sm:text-right flex items-center justify-end gap-1">
                <Label htmlFor="token">
                  Token
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Authentication token</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="token"
                type="password"
                className="sm:col-span-3"
                placeholder="Enter token"
                value={token}
                onChange={(e) => onTokenChange(e.target.value)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
