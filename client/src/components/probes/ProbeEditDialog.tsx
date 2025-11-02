import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IcmpPingConfigSection } from './probe-config-sections/IcmpPingConfigSection';
import { HttpHttpsConfigSection } from './probe-config-sections/HttpHttpsConfigSection';
import { DnsConfigSection } from './probe-config-sections/DnsConfigSection';
import { SslTlsConfigSection } from './probe-config-sections/SslTlsConfigSection';
import { AuthenticationConfigSection } from './probe-config-sections/AuthenticationConfigSection';
import type { Probe } from '@/types/probe';
import type { GatewayResponse } from '@/types/gateway';
import type { NotificationGroup } from '@/types/notification';

interface ProbeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  probe: Probe | null;
  gateways?: { data?: GatewayResponse[] };
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
  isPending?: boolean;
}

export function ProbeEditDialog({
  open,
  onOpenChange,
  probe,
  gateways,
  notificationGroups = [],
  onSubmit,
  isPending = false,
}: ProbeEditDialogProps) {
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

  // Load probe data when dialog opens or probe changes
  useEffect(() => {
    if (probe && open) {
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
  }, [probe, open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Probe</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-1 space-y-4">
          {/* Read-only category and type */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Editable fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-probe-name" className="text-right">
              Name *
            </Label>
            <Input
              id="edit-probe-name"
              value={probeName}
              onChange={(e) => setProbeName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-probe-description" className="text-right">
              Description
            </Label>
            <Textarea
              id="edit-probe-description"
              value={probeDescription}
              onChange={(e) => setProbeDescription(e.target.value)}
              className="col-span-3"
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-gateway-type" className="text-right">
              Gateway Type
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
              <SelectTrigger className="col-span-3">
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
              <Label htmlFor="edit-gateway-id" className="text-right">
                Gateway
              </Label>
              <Select
                value={gatewayId || ''}
                onValueChange={(value) => setGatewayId(value || null)}
              >
                <SelectTrigger className="col-span-3">
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
            <Label htmlFor="edit-notification-group" className="text-right">
              Notification Group
            </Label>
            <Select
              value={notificationGroupId || '__none__'}
              onValueChange={(value) => setNotificationGroupId(value === '__none__' ? null : value)}
            >
              <SelectTrigger className="col-span-3" id="edit-notification-group">
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
          {probe.type === 'ICMP/Ping' && (
            <IcmpPingConfigSection
              target={target}
              packetCount={packetCount}
              timeout={icmpTimeout}
              onTargetChange={setTarget}
              onPacketCountChange={setPacketCount}
              onTimeoutChange={setIcmpTimeout}
            />
          )}

          {probe.type === 'HTTP/HTTPS' && (
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

          {probe.type === 'DNS Resolution' && (
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

          {probe.type === 'SSL/TLS' && (
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

          {probe.type === 'Authentication' && (
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

          {/* Common fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-check-interval" className="text-right">
              Check Interval (seconds)
            </Label>
            <Input
              id="edit-check-interval"
              type="number"
              value={checkInterval}
              onChange={(e) => setCheckInterval(parseInt(e.target.value) || 300)}
              className="col-span-3"
              min={60}
              max={86400}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-timeout" className="text-right">
              Timeout (seconds)
            </Label>
            <Input
              id="edit-timeout"
              type="number"
              value={probeTimeout}
              onChange={(e) => setProbeTimeout(parseInt(e.target.value) || 30)}
              className="col-span-3"
              min={5}
              max={300}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-retries" className="text-right">
              Retries
            </Label>
            <Input
              id="edit-retries"
              type="number"
              value={retries}
              onChange={(e) => setRetries(parseInt(e.target.value) || 3)}
              className="col-span-3"
              min={0}
              max={10}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-is-active" className="text-right">
              Active
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-is-active" className="text-sm text-muted-foreground">
                Enable this probe
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
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
            {isPending ? 'Updating...' : 'Update Probe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
