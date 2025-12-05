import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ICMPPingProbeForm } from './ICMPPingProbeForm';
import { HttpHttpsProbeForm } from './HttpHttpsProbeForm';
import { DnsProbeForm } from './DnsProbeForm';
import { SslTlsProbeForm } from './SslTlsProbeForm';
import { AuthenticationProbeForm } from './AuthenticationProbeForm';
import { ArrowLeft, HelpCircle, Play, Trash2, Edit } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Probe } from '@/types/probe';
import type { GatewayResponse } from '@/types/gateway';
import type { NotificationGroup } from '@/types/notification';

interface ProbeEditFormProps {
  probe: Probe | null;
  gateways?: { data?: GatewayResponse[] };
  sharedGateways?: { data?: GatewayResponse[] };
  notificationGroups?: NotificationGroup[];
  onSubmit: (data: {
    name?: string;
    description?: string;
    gateway_type?: 'Core' | 'TenantSpecific';
    gateway_id?: string | null;
    notification_group_id?: string | null;
    check_interval?: number;
    timeout?: number;
    retries?: number;
    configuration?: Record<string, any>;
    is_active?: boolean;
  }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onTestProbe?: () => void;
  isPending?: boolean;
  isDeleting?: boolean;
  isTesting?: boolean;
  viewMode?: boolean;
  onToggleViewMode?: () => void;
}

export function ProbeEditForm({
  probe,
  gateways,
  sharedGateways,
  notificationGroups = [],
  onSubmit,
  onCancel,
  onDelete,
  onTestProbe,
  isPending = false,
  isDeleting = false,
  isTesting = false,
  viewMode = false,
  onToggleViewMode,
}: ProbeEditFormProps) {
  // Advanced settings visibility
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Common fields
  const [probeName, setProbeName] = useState('');
  const [probeDescription, setProbeDescription] = useState('');
  const [gatewayType, setGatewayType] = useState<'Core' | 'TenantSpecific'>('Core');
  const [gatewayId, setGatewayId] = useState<string | null>(null);
  const [notificationGroupId, setNotificationGroupId] = useState<string | null>(null);
  const [checkInterval, setCheckInterval] = useState<number>(300);
  const [probeTimeout, setProbeTimeout] = useState<number>(30);
  const [retries, setRetries] = useState<number>(3);
  const [isActive, setIsActive] = useState<boolean>(true);

  // ICMP/Ping fields
  const [target, setTarget] = useState('');
  const [packetCount, setPacketCount] = useState(4);
  const [icmpTimeout, setIcmpTimeout] = useState(5);

  // HTTP/HTTPS fields
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [followRedirects, setFollowRedirects] = useState(true);
  const [headers, setHeaders] = useState('');
  const [sslVerify, setSslVerify] = useState(true);
  const [httpTimeout, setHttpTimeout] = useState(10);

  // DNS fields
  const [dnsTarget, setDnsTarget] = useState('');
  const [recordType, setRecordType] = useState('A');
  const [nameserver, setNameserver] = useState('');
  const [dnsTimeout, setDnsTimeout] = useState(10);

  // SSL/TLS fields
  const [hostname, setHostname] = useState('');
  const [port, setPort] = useState(443);
  const [warningDays, setWarningDays] = useState(30);
  const [checkExpiry, setCheckExpiry] = useState(true);

  // Authentication fields
  const [authUrl, setAuthUrl] = useState('');
  const [authMethod, setAuthMethod] = useState('POST');
  const [authExpectedStatus, setAuthExpectedStatus] = useState(200);
  const [credentialType, setCredentialType] = useState<'username_password' | 'api_key' | 'token'>('username_password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');

  // Get Core gateways from shared gateways endpoint, fallback to filtering regular gateways
  const coreGateways = sharedGateways?.data || gateways?.data?.filter((g: GatewayResponse) => g.type === 'Core') || [];
  const tenantSpecificGateways = gateways?.data?.filter((g: GatewayResponse) => g.type === 'TenantSpecific') || [];

  // Load probe data when probe changes
  useEffect(() => {
    if (probe) {
      setProbeName(probe.name);
      setProbeDescription(probe.description || '');
      setGatewayType(probe.gateway_type);
      setGatewayId(probe.gateway_id || null);
      setNotificationGroupId(probe.notification_group_id || null);
      setCheckInterval(probe.check_interval);
      setProbeTimeout(probe.timeout || 30);
      setRetries(probe.retries || 3);
      setIsActive(probe.is_active ?? true);

      const config = probe.configuration || {};

      if (probe.type === 'ICMP/Ping') {
        setTarget(config.target || '');
        setPacketCount(config.packet_count || 4);
        setIcmpTimeout(config.timeout || 5);
      } else if (probe.type === 'HTTP/HTTPS') {
        setUrl(config.url || '');
        setMethod(config.method || 'GET');
        setExpectedStatus(config.expected_status || 200);
        setFollowRedirects(config.follow_redirects !== false);
        setHeaders(config.headers ? JSON.stringify(config.headers, null, 2) : '');
        setSslVerify(config.ssl_verify !== false);
        setHttpTimeout(config.timeout || 10);
      } else if (probe.type === 'DNS Resolution') {
        setDnsTarget(config.target || config.domain || '');
        setRecordType(config.record_type || 'A');
        setNameserver(config.nameserver || config.dns_server || '');
        setDnsTimeout(config.timeout || 10);
      } else if (probe.type === 'SSL/TLS') {
        setHostname(config.hostname || config.host || '');
        setPort(config.port || 443);
        setWarningDays(config.warning_days || config.days_before_expiry || config.alert_days || 30);
        setCheckExpiry(config.check_expiry !== false);
      } else if (probe.type === 'Authentication') {
        setAuthUrl(config.url || '');
        setAuthMethod(config.method || 'POST');
        setAuthExpectedStatus(config.expected_status || 200);
        if (config.credentials) {
          if (config.credentials.username) {
            setCredentialType('username_password');
            setUsername(config.credentials.username || '');
            setPassword(config.credentials.password || '');
          } else if (config.credentials.api_key) {
            setCredentialType('api_key');
            setApiKey(config.credentials.api_key || '');
          } else if (config.credentials.token) {
            setCredentialType('token');
            setToken(config.credentials.token || '');
          }
        }
      }
    }
  }, [probe]);

  const handleSubmit = () => {
    if (!probeName || !probe) {
      return;
    }

    const config: Record<string, any> = {};

    if (probe.type === 'ICMP/Ping') {
      if (target) config.target = target;
      if (packetCount) config.packet_count = packetCount;
      if (icmpTimeout) config.timeout = icmpTimeout;
    } else if (probe.type === 'HTTP/HTTPS') {
      if (url) config.url = url;
      config.method = method || 'GET';
      if (expectedStatus) config.expected_status = expectedStatus;
      config.follow_redirects = followRedirects;
      if (headers) {
        try {
          config.headers = JSON.parse(headers);
        } catch (e) {
          // If invalid JSON, ignore headers
        }
      }
      config.ssl_verify = sslVerify;
      if (httpTimeout) config.timeout = httpTimeout;
    } else if (probe.type === 'DNS Resolution') {
      if (dnsTarget) config.target = dnsTarget;
      if (recordType) config.record_type = recordType;
      if (nameserver) config.nameserver = nameserver;
      if (dnsTimeout) config.timeout = dnsTimeout;
    } else if (probe.type === 'SSL/TLS') {
      if (hostname) config.hostname = hostname;
      if (port) config.port = port;
      if (warningDays) config.warning_days = warningDays;
      config.check_expiry = checkExpiry;
    } else if (probe.type === 'Authentication') {
      if (authUrl) config.url = authUrl;
      config.method = authMethod || 'POST';
      if (authExpectedStatus) config.expected_status = authExpectedStatus;
      
      config.credentials = {};
      if (credentialType === 'username_password') {
        if (username) config.credentials.username = username;
        if (password) config.credentials.password = password;
      } else if (credentialType === 'api_key') {
        if (apiKey) config.credentials.api_key = apiKey;
      } else if (credentialType === 'token') {
        if (token) config.credentials.token = token;
      }
    }

    onSubmit({
      name: probeName,
      description: probeDescription || undefined,
      gateway_type: gatewayType,
      gateway_id: gatewayId || undefined,
      notification_group_id: notificationGroupId || undefined,
      check_interval: checkInterval,
      timeout: probeTimeout,
      retries: retries,
      configuration: config,
      is_active: isActive,
    });
  };

  if (!probe) return null;

  const renderField = (label: string, id: string, children: React.ReactNode, tooltip?: string) => (
    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
      <div className="sm:text-right flex items-center justify-end gap-1">
        <Label htmlFor={id}>
          {label}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="sm:col-span-3">
        {children}
      </div>
    </div>
  );

  const renderReadOnlyField = (label: string, value: string | number | boolean, tooltip?: string) => (
    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
      <div className="sm:text-right flex items-center justify-end gap-1">
        <Label>{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="sm:col-span-3 text-sm text-muted-foreground py-2">
        {String(value)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Probes
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {viewMode ? 'View Probe' : 'Edit Probe'}
            </h1>
            <p className="text-muted-foreground">
              {viewMode ? 'View probe details' : 'Update probe configuration'}
            </p>
          </div>
          <div className="flex gap-2">
            {onTestProbe && (
              <Button
                variant="outline"
                onClick={onTestProbe}
                disabled={isTesting}
              >
                <Play className="w-4 h-4 mr-2" />
                {isTesting ? 'Testing...' : 'Test Probe'}
              </Button>
            )}
            {viewMode && onToggleViewMode && (
              <Button
                variant="outline"
                onClick={onToggleViewMode}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                onClick={onDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            {!viewMode && (
              <>
                {onToggleViewMode && (
                  <Button
                    variant="outline"
                    onClick={onToggleViewMode}
                  >
                    View
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!probeName || isPending}
                >
                  {isPending ? 'Updating...' : 'Update Probe'}
                </Button>
              </>
            )}
            {viewMode && (
              <Button
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Probe Type Card (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Probe Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="text-sm text-muted-foreground py-2">
                {probe.category}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="text-sm text-muted-foreground py-2">
                {probe.type}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Configure {probe.type} Probe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Configuration</h3>
            {viewMode ? (
              <>
                {renderReadOnlyField('Name', probeName, 'A unique name to identify this probe')}
                {renderReadOnlyField('Active', isActive ? 'Yes' : 'No', 'Enable or disable this probe. Disabled probes will not run checks.')}
              </>
            ) : (
              <>
                {renderField('Name *', 'edit-probe-name',
                  <Input
                    id="edit-probe-name"
                    value={probeName}
                    onChange={(e) => setProbeName(e.target.value)}
                    placeholder="Enter probe name"
                  />,
                  'A unique name to identify this probe'
                )}
                {renderField('Active', 'edit-is-active',
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="edit-is-active"
                      checked={isActive}
                      onCheckedChange={(checked) => setIsActive(checked === true)}
                    />
                    <Label htmlFor="edit-is-active" className="text-sm text-muted-foreground">
                      Enable this probe
                    </Label>
                  </div>,
                  'Enable or disable this probe. Disabled probes will not run checks.'
                )}
              </>
            )}
          </div>

          {/* Probe-Specific Configuration */}
          {!viewMode && probe.type === 'ICMP/Ping' && (
            <ICMPPingProbeForm
              target={target}
              packetCount={packetCount}
              timeout={icmpTimeout}
              onTargetChange={setTarget}
              onPacketCountChange={setPacketCount}
              onTimeoutChange={setIcmpTimeout}
              showAdvanced={showAdvanced}
            />
          )}

          {!viewMode && probe.type === 'HTTP/HTTPS' && (
            <HttpHttpsProbeForm
              url={url}
              method={method}
              expectedStatus={expectedStatus}
              followRedirects={followRedirects}
              headers={headers}
              sslVerify={sslVerify}
              timeout={httpTimeout}
              onUrlChange={setUrl}
              onMethodChange={setMethod}
              onExpectedStatusChange={setExpectedStatus}
              onFollowRedirectsChange={setFollowRedirects}
              onHeadersChange={setHeaders}
              onSslVerifyChange={setSslVerify}
              onTimeoutChange={setHttpTimeout}
              showAdvanced={showAdvanced}
            />
          )}

          {!viewMode && probe.type === 'DNS Resolution' && (
            <DnsProbeForm
              target={dnsTarget}
              recordType={recordType}
              nameserver={nameserver}
              timeout={dnsTimeout}
              onTargetChange={setDnsTarget}
              onRecordTypeChange={setRecordType}
              onNameserverChange={setNameserver}
              onTimeoutChange={setDnsTimeout}
              showAdvanced={showAdvanced}
            />
          )}

          {!viewMode && probe.type === 'SSL/TLS' && (
            <SslTlsProbeForm
              hostname={hostname}
              port={port}
              warningDays={warningDays}
              checkExpiry={checkExpiry}
              onHostnameChange={setHostname}
              onPortChange={setPort}
              onWarningDaysChange={setWarningDays}
              onCheckExpiryChange={setCheckExpiry}
              showAdvanced={showAdvanced}
            />
          )}

          {!viewMode && probe.type === 'Authentication' && (
            <AuthenticationProbeForm
              url={authUrl}
              method={authMethod}
              expectedStatus={authExpectedStatus}
              credentialType={credentialType}
              username={username}
              password={password}
              apiKey={apiKey}
              token={token}
              onUrlChange={setAuthUrl}
              onMethodChange={setAuthMethod}
              onExpectedStatusChange={setAuthExpectedStatus}
              onCredentialTypeChange={setCredentialType}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onApiKeyChange={setApiKey}
              onTokenChange={setToken}
              showAdvanced={showAdvanced}
            />
          )}

          {/* View mode probe-specific display */}
          {viewMode && probe.type === 'ICMP/Ping' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Probe Configuration</h3>
              {renderReadOnlyField('Target', target || 'N/A')}
              {renderReadOnlyField('Packet Count', packetCount)}
              {renderReadOnlyField('Timeout (seconds)', icmpTimeout)}
            </div>
          )}

          {viewMode && probe.type === 'HTTP/HTTPS' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Probe Configuration</h3>
              {renderReadOnlyField('URL', url || 'N/A')}
              {renderReadOnlyField('Method', method)}
              {renderReadOnlyField('Expected Status', expectedStatus)}
              {renderReadOnlyField('Follow Redirects', followRedirects ? 'Yes' : 'No')}
              {renderReadOnlyField('SSL Verify', sslVerify ? 'Yes' : 'No')}
              {renderReadOnlyField('Timeout (seconds)', httpTimeout)}
              {headers && (
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-4">
                  <Label className="sm:text-right">Headers</Label>
                  <div className="sm:col-span-3 text-sm text-muted-foreground py-2 whitespace-pre-wrap">
                    {headers}
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode && probe.type === 'DNS Resolution' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Probe Configuration</h3>
              {renderReadOnlyField('Target', dnsTarget || 'N/A')}
              {renderReadOnlyField('Record Type', recordType)}
              {renderReadOnlyField('Nameserver', nameserver || 'Default')}
              {renderReadOnlyField('Timeout (seconds)', dnsTimeout)}
            </div>
          )}

          {viewMode && probe.type === 'SSL/TLS' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Probe Configuration</h3>
              {renderReadOnlyField('Hostname', hostname || 'N/A')}
              {renderReadOnlyField('Port', port)}
              {renderReadOnlyField('Warning Days', warningDays)}
              {renderReadOnlyField('Check Expiry', checkExpiry ? 'Yes' : 'No')}
            </div>
          )}

          {viewMode && probe.type === 'Authentication' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Probe Configuration</h3>
              {renderReadOnlyField('URL', authUrl || 'N/A')}
              {renderReadOnlyField('Method', authMethod)}
              {renderReadOnlyField('Expected Status', authExpectedStatus)}
              {renderReadOnlyField('Credential Type', credentialType.replace('_', ' '))}
              {credentialType === 'username_password' && (
                <>
                  {renderReadOnlyField('Username', username || 'N/A')}
                  {renderReadOnlyField('Password', password ? '••••••••' : 'N/A')}
                </>
              )}
              {credentialType === 'api_key' && renderReadOnlyField('API Key', apiKey ? '••••••••' : 'N/A')}
              {credentialType === 'token' && renderReadOnlyField('Token', token ? '••••••••' : 'N/A')}
            </div>
          )}

          {/* Advanced Settings Button */}
          {!viewMode && (
            <div className="flex justify-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Configuration
              </Button>
            </div>
          )}

          {/* Advanced Settings Panel */}
          {showAdvanced && !viewMode && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Advanced Configuration</h3>
              
              {/* Description */}
              {renderField('Description', 'edit-probe-description',
                <Input
                  id="edit-probe-description"
                  value={probeDescription}
                  onChange={(e) => setProbeDescription(e.target.value)}
                  placeholder="Optional description"
                />,
                'Optional description to help identify this probe'
              )}

              {/* Gateway Type */}
              {renderField('Gateway Type', 'edit-gateway-type',
                <Select
                  value={gatewayType}
                  onValueChange={(value: 'Core' | 'TenantSpecific') => {
                    setGatewayType(value);
                    if (value === 'Core') {
                      // Auto-select first Core gateway if available
                      if (coreGateways.length > 0 && !gatewayId) {
                        const usEastGateway = coreGateways.find((g: GatewayResponse) => 
                          g.name.toLowerCase().includes('us-east') || 
                          g.location?.toLowerCase().includes('us-east')
                        );
                        setGatewayId(usEastGateway?.id || coreGateways[0].id);
                      }
                    } else {
                      setGatewayId(null);
                    }
                  }}
                >
                  <SelectTrigger className="w-full" id="edit-gateway-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Core">Core</SelectItem>
                    <SelectItem value="TenantSpecific">Tenant Specific</SelectItem>
                  </SelectContent>
                </Select>,
                'Choose Core for shared gateways or Tenant Specific for your own gateway'
              )}
              
              {gatewayType === 'Core' && renderField('Gateway *', 'edit-core-gateway-id',
                <Select
                  value={gatewayId || ''}
                  onValueChange={(value) => setGatewayId(value || null)}
                  disabled={coreGateways.length === 0}
                >
                  <SelectTrigger className="w-full" id="edit-core-gateway-id">
                    <SelectValue placeholder={coreGateways.length === 0 ? "No Core gateways available" : "Select Core gateway"} />
                  </SelectTrigger>
                  <SelectContent>
                    {coreGateways.length === 0 ? (
                      <SelectItem value="__no_gateways__" disabled>No Core gateways available</SelectItem>
                    ) : (
                      coreGateways.map((gateway) => (
                        <SelectItem key={gateway.id} value={gateway.id}>
                          {gateway.name} {gateway.location ? `(${gateway.location})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>,
                'Select the Core gateway to use for this probe'
              )}
              
              {gatewayType === 'TenantSpecific' && (
                tenantSpecificGateways.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <Label className="sm:text-right">Gateway</Label>
                    <div className="sm:col-span-3 text-sm text-muted-foreground">
                      No Tenant specific gateway created
                    </div>
                  </div>
                ) : (
                  renderField('Gateway', 'edit-gateway-id',
                    <Select
                      value={gatewayId || '__none__'}
                      onValueChange={(value) => setGatewayId(value === '__none__' ? null : value)}
                    >
                      <SelectTrigger className="w-full" id="edit-gateway-id">
                        <SelectValue placeholder="Select gateway (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {tenantSpecificGateways.map((gateway) => (
                          <SelectItem key={gateway.id} value={gateway.id}>
                            {gateway.name} {gateway.location ? `(${gateway.location})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                )
              )}

              {/* Notification Group */}
              {renderField('Notification Group', 'edit-notification-group',
                <Select
                  value={notificationGroupId || '__none__'}
                  onValueChange={(value) => setNotificationGroupId(value === '__none__' ? null : value)}
                >
                  <SelectTrigger className="w-full" id="edit-notification-group">
                    <SelectValue placeholder="Select notification group (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {notificationGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
                'Select a notification group to receive alerts when this probe fails'
              )}

              {/* General advanced settings */}
              {renderField('Check Interval (seconds) *', 'edit-check-interval',
                <Input
                  id="edit-check-interval"
                  type="number"
                  value={checkInterval}
                  onChange={(e) => setCheckInterval(parseInt(e.target.value) || 300)}
                  placeholder="300"
                  min="60"
                  max="86400"
                />,
                'How often the probe should run checks (minimum 60 seconds, maximum 86400 seconds)'
              )}
              
              {renderField('Timeout (seconds)', 'edit-probe-timeout',
                <Input
                  id="edit-probe-timeout"
                  type="number"
                  value={probeTimeout}
                  onChange={(e) => setProbeTimeout(parseInt(e.target.value) || 30)}
                  placeholder="30"
                  min="5"
                  max="300"
                />,
                'Maximum time to wait for probe execution before timing out (minimum 5 seconds, maximum 300 seconds)'
              )}
              
              {renderField('Retries', 'edit-retries',
                <Input
                  id="edit-retries"
                  type="number"
                  value={retries}
                  onChange={(e) => setRetries(parseInt(e.target.value) || 3)}
                  placeholder="3"
                  min="0"
                  max="10"
                />,
                'Number of retry attempts if the probe check fails (0-10)'
              )}
            </div>
          )}

          {/* View mode advanced settings */}
          {viewMode && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Advanced Configuration</h3>
              {renderReadOnlyField('Description', probeDescription || 'N/A', 'Optional description to help identify this probe')}
              {renderReadOnlyField('Gateway Type', gatewayType, 'Choose Core for shared gateways or Tenant Specific for your own gateway')}
              {gatewayId && renderReadOnlyField('Gateway', gateways?.data?.find(g => g.id === gatewayId)?.name || gatewayId)}
              {renderReadOnlyField('Notification Group', notificationGroupId ? notificationGroups.find(g => g.id === notificationGroupId)?.name || 'N/A' : 'None', 'Select a notification group to receive alerts when this probe fails')}
              {renderReadOnlyField('Check Interval (seconds)', checkInterval, 'How often the probe should run checks (minimum 60 seconds, maximum 86400 seconds)')}
              {renderReadOnlyField('Timeout (seconds)', probeTimeout, 'Maximum time to wait for probe execution before timing out (minimum 5 seconds, maximum 300 seconds)')}
              {renderReadOnlyField('Retries', retries, 'Number of retry attempts if the probe check fails (0-10)')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
