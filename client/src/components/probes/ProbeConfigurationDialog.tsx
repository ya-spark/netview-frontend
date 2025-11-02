import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IcmpPingConfigSection } from './probe-config-sections/IcmpPingConfigSection';
import { HttpHttpsConfigSection } from './probe-config-sections/HttpHttpsConfigSection';
import { DnsConfigSection } from './probe-config-sections/DnsConfigSection';
import { SslTlsConfigSection } from './probe-config-sections/SslTlsConfigSection';
import { AuthenticationConfigSection } from './probe-config-sections/AuthenticationConfigSection';
import type { ProbeCategory, ProbeType } from '@/types/probe';
import type { GatewayResponse } from '@/types/gateway';
import type { NotificationGroup } from '@/types/notification';

interface ProbeConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: ProbeCategory;
  selectedType: ProbeType;
  gateways?: { data?: GatewayResponse[] };
  notificationGroups?: NotificationGroup[];
  onSubmit: (data: {
    name: string;
    description?: string;
    category: ProbeCategory;
    type: ProbeType;
    gateway_type: 'Core' | 'TenantSpecific';
    gateway_id?: string | null;
    notification_group_id?: string | null;
    check_interval: number;
    timeout?: number;
    retries?: number;
    configuration: Record<string, any>;
    is_active: boolean;
  }) => void;
  isPending?: boolean;
  onBack?: () => void;
}

export function ProbeConfigurationDialog({
  open,
  onOpenChange,
  selectedCategory,
  selectedType,
  gateways,
  notificationGroups = [],
  onSubmit,
  isPending = false,
  onBack,
}: ProbeConfigurationDialogProps) {
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

  // Reset all state when dialog closes
  useEffect(() => {
    if (!open) {
      setProbeName('');
      setProbeDescription('');
      setGatewayType('Core');
      setGatewayId(null);
      setNotificationGroupId(null);
      setCheckInterval(300);
      setProbeTimeout(30);
      setRetries(3);
      setIsActive(true);
      
      // Reset probe-specific fields
      setTarget('');
      setPacketCount(4);
      setIcmpTimeout(5);
      setUrl('');
      setMethod('GET');
      setExpectedStatus(200);
      setFollowRedirects(true);
      setHeaders('');
      setSslVerify(true);
      setHttpTimeout(10);
      setDnsTarget('');
      setRecordType('A');
      setNameserver('');
      setDnsTimeout(10);
      setHostname('');
      setPort(443);
      setWarningDays(30);
      setCheckExpiry(true);
      setAuthUrl('');
      setAuthMethod('POST');
      setAuthExpectedStatus(200);
      setCredentialType('username_password');
      setUsername('');
      setPassword('');
      setApiKey('');
      setToken('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!probeName || !selectedCategory || !selectedType) {
      return;
    }

    const config: Record<string, any> = {};

    if (selectedType === 'ICMP/Ping') {
      if (target) config.target = target;
      if (packetCount) config.packet_count = packetCount;
      if (icmpTimeout) config.timeout = icmpTimeout;
    } else if (selectedType === 'HTTP/HTTPS') {
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
    } else if (selectedType === 'DNS Resolution') {
      if (dnsTarget) config.target = dnsTarget;
      if (recordType) config.record_type = recordType;
      if (nameserver) config.nameserver = nameserver;
      if (dnsTimeout) config.timeout = dnsTimeout;
    } else if (selectedType === 'SSL/TLS') {
      if (hostname) config.hostname = hostname;
      if (port) config.port = port;
      if (warningDays) config.warning_days = warningDays;
      config.check_expiry = checkExpiry;
    } else if (selectedType === 'Authentication') {
      if (authUrl) config.url = authUrl;
      config.method = authMethod || 'POST';
      if (authExpectedStatus) config.expected_status = authExpectedStatus;
      
      // Build credentials object based on type
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
      category: selectedCategory,
      type: selectedType,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure {selectedType} Probe</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-1">
          <div className="grid gap-4 py-4">
          {/* Common fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="probe-name" className="text-right">
              Name *
            </Label>
            <Input
              id="probe-name"
              value={probeName}
              onChange={(e) => setProbeName(e.target.value)}
              className="col-span-3"
              placeholder="Enter probe name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="probe-description" className="text-right">
              Description
            </Label>
            <Input
              id="probe-description"
              value={probeDescription}
              onChange={(e) => setProbeDescription(e.target.value)}
              className="col-span-3"
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gateway-type-select" className="text-right">
              Gateway Type *
            </Label>
            <Select
              value={gatewayType}
              onValueChange={(value: 'Core' | 'TenantSpecific') => {
                setGatewayType(value);
                if (value === 'Core') {
                  setGatewayId(null);
                }
              }}
            >
              <SelectTrigger className="col-span-3" id="gateway-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Core">Core</SelectItem>
                <SelectItem value="TenantSpecific">Tenant Specific</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {gatewayType === 'TenantSpecific' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gateway-id-select" className="text-right">
                Gateway
              </Label>
              <Select
                value={gatewayId || ''}
                onValueChange={(value) => setGatewayId(value || null)}
              >
                <SelectTrigger className="col-span-3" id="gateway-id-select">
                  <SelectValue placeholder="Select gateway" />
                </SelectTrigger>
                <SelectContent>
                  {gateways?.data?.filter((g) => g.type === 'TenantSpecific').map((gateway) => (
                    <SelectItem key={gateway.id} value={gateway.id}>
                      {gateway.name} {gateway.location ? `(${gateway.location})` : ''}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notification-group-select" className="text-right">
              Notification Group
            </Label>
            <Select
              value={notificationGroupId || '__none__'}
              onValueChange={(value) => setNotificationGroupId(value === '__none__' ? null : value)}
            >
              <SelectTrigger className="col-span-3" id="notification-group-select">
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
            </Select>
          </div>

          {/* Probe-specific configuration sections */}
          {selectedType === 'ICMP/Ping' && (
            <IcmpPingConfigSection
              target={target}
              packetCount={packetCount}
              timeout={icmpTimeout}
              onTargetChange={setTarget}
              onPacketCountChange={setPacketCount}
              onTimeoutChange={setIcmpTimeout}
            />
          )}

          {selectedType === 'HTTP/HTTPS' && (
            <HttpHttpsConfigSection
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
            />
          )}

          {selectedType === 'DNS Resolution' && (
            <DnsConfigSection
              target={dnsTarget}
              recordType={recordType}
              nameserver={nameserver}
              timeout={dnsTimeout}
              onTargetChange={setDnsTarget}
              onRecordTypeChange={setRecordType}
              onNameserverChange={setNameserver}
              onTimeoutChange={setDnsTimeout}
            />
          )}

          {selectedType === 'SSL/TLS' && (
            <SslTlsConfigSection
              hostname={hostname}
              port={port}
              warningDays={warningDays}
              checkExpiry={checkExpiry}
              onHostnameChange={setHostname}
              onPortChange={setPort}
              onWarningDaysChange={setWarningDays}
              onCheckExpiryChange={setCheckExpiry}
            />
          )}

          {selectedType === 'Authentication' && (
            <AuthenticationConfigSection
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
            />
          )}

          {/* Common fields for all probe types */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="check-interval" className="text-right">
              Check Interval (seconds) *
            </Label>
            <Input
              id="check-interval"
              type="number"
              value={checkInterval}
              onChange={(e) => setCheckInterval(parseInt(e.target.value) || 300)}
              className="col-span-3"
              placeholder="300"
              min="60"
              max="86400"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="probe-timeout" className="text-right">
              Timeout (seconds)
            </Label>
            <Input
              id="probe-timeout"
              type="number"
              value={probeTimeout}
              onChange={(e) => setProbeTimeout(parseInt(e.target.value) || 30)}
              className="col-span-3"
              placeholder="30"
              min="5"
              max="300"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="retries" className="text-right">
              Retries
            </Label>
            <Input
              id="retries"
              type="number"
              value={retries}
              onChange={(e) => setRetries(parseInt(e.target.value) || 3)}
              className="col-span-3"
              placeholder="3"
              min="0"
              max="10"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="is-active" className="text-right">
              Active
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="is-active" className="text-sm text-muted-foreground">
                Enable this probe
              </Label>
            </div>
          </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
          <div className="flex space-x-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!probeName || isPending}
            >
              {isPending ? 'Creating...' : 'Create Probe'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
