import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ICMPPingProbeForm } from '@/components/probes/ICMPPingProbeForm';
import { HttpHttpsProbeForm } from '@/components/probes/HttpHttpsProbeForm';
import { DnsProbeForm } from '@/components/probes/DnsProbeForm';
import { SslTlsProbeForm } from '@/components/probes/SslTlsProbeForm';
import { AuthenticationProbeForm } from '@/components/probes/AuthenticationProbeForm';
import { ProbeTemplateHelp } from '@/components/probes/ProbeTemplateHelp';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { queryClient } from '@/lib/queryClient';
import { GatewayApiService } from '@/services/gatewayApi';
import { ProbeApiService } from '@/services/probeApi';
import { NotificationGroupApiService } from '@/services/notificationApi';
import { getAllTemplates, type ProbeTemplate } from '@/data/probeTemplates';
import type { ProbeCategory, ProbeType } from '@/types/probe';
import type { GatewayResponse } from '@/types/gateway';
import type { NotificationGroup } from '@/types/notification';
import { ArrowLeft, HelpCircle, Search, Filter, X, Activity, Globe2, Globe, Shield, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function CreateProbe() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Template selection state
  const [showTemplateSelection, setShowTemplateSelection] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ProbeTemplate | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateFilters, setTemplateFilters] = useState<{
    category?: string;
    type?: string;
  }>({});
  const [showTemplateFilters, setShowTemplateFilters] = useState(false);

  // Category and Type Selection (pre-filled from template)
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [templateId, setTemplateId] = useState<string | null>(null);

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

  // Advanced settings visibility
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get all templates
  const allTemplates = getAllTemplates();

  // Filter templates based on search and filters
  const filteredTemplates = useMemo(() => {
    let filtered = allTemplates;

    // Text search across all fields
    if (templateSearch) {
      const searchLower = templateSearch.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.whyNeeded.toLowerCase().includes(searchLower) ||
        template.howItWorks.toLowerCase().includes(searchLower) ||
        template.category.toLowerCase().includes(searchLower) ||
        template.type.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (templateFilters.category) {
      filtered = filtered.filter(template => template.category === templateFilters.category);
    }

    // Type filter
    if (templateFilters.type) {
      filtered = filtered.filter(template => template.type === templateFilters.type);
    }

    return filtered;
  }, [allTemplates, templateSearch, templateFilters]);

  // Handle template selection
  const handleTemplateSelect = (template: ProbeTemplate) => {
    setSelectedTemplate(template);
    setSelectedCategory(template.category);
    setSelectedType(template.type);
    setTemplateId(template.id);
    setShowTemplateSelection(false);
  };

  // Handle back to template selection
  const handleBackToTemplates = () => {
    setShowTemplateSelection(true);
    setSelectedTemplate(null);
    setTemplateSearch('');
    setTemplateFilters({});
  };

  // Get probe type icon
  const getProbeTypeIcon = (type: string) => {
    switch (type) {
      case 'ICMP/Ping':
        return <Activity className="w-5 h-5 text-muted-foreground" />;
      case 'HTTP/HTTPS':
        return <Globe2 className="w-5 h-5 text-muted-foreground" />;
      case 'DNS Resolution':
        return <Globe className="w-5 h-5 text-muted-foreground" />;
      case 'SSL/TLS':
        return <Shield className="w-5 h-5 text-muted-foreground" />;
      case 'Authentication':
        return <Lock className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const { data: probeTypes, error: typesError, isLoading: typesLoading } = useQuery({
    queryKey: ['/api/probes/types'],
    enabled: !!user,
    queryFn: async () => {
      return await ProbeApiService.getProbeTypes();
    },
  });

  const { data: gateways } = useQuery({
    queryKey: ['/api/gateways'],
    enabled: !!user,
    queryFn: async () => {
      return await GatewayApiService.listGateways();
    },
  });

  // Fetch shared/Core gateways separately
  const { data: sharedGateways } = useQuery({
    queryKey: ['/api/gateways/shared'],
    enabled: !!user,
    queryFn: async () => {
      return await GatewayApiService.getSharedGateways();
    },
  });

  const { data: notificationGroupsResponse } = useQuery({
    queryKey: ['/api/notifications/groups'],
    enabled: !!user,
    queryFn: async () => {
      return await NotificationGroupApiService.listGroups();
    },
  });

  const notificationGroups = notificationGroupsResponse?.data || [];

  // Get Core gateways from shared gateways endpoint, fallback to filtering regular gateways
  const coreGateways = sharedGateways?.data || gateways?.data?.filter((g: GatewayResponse) => g.type === 'Core') || [];
  const tenantSpecificGateways = gateways?.data?.filter((g: GatewayResponse) => g.type === 'TenantSpecific') || [];

  // Extract categories from the probe types response
  const probeCategories = probeTypes?.data 
    ? Array.isArray(probeTypes.data) 
      ? [] 
      : Object.keys(probeTypes.data)
    : [];

  // Filter probe types based on selected category
  const filteredProbeTypes = selectedCategory && probeTypes?.data 
    ? Array.isArray(probeTypes.data)
      ? probeTypes.data
      : probeTypes.data[selectedCategory] || []
    : [];

  // Reset selected type when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedType(''); // Reset type selection
  };

  // Auto-select first Core gateway (preferring US-East) when gateway_type changes to Core
  useEffect(() => {
    if (gatewayType === 'Core' && coreGateways.length > 0) {
      // If no gateway is selected or the selected gateway is not in Core gateways, auto-select
      const currentGatewayIsValid = gatewayId && coreGateways.find((g: GatewayResponse) => g.id === gatewayId);
      if (!currentGatewayIsValid) {
        // Try to find US-East first
        const usEastGateway = coreGateways.find((g: GatewayResponse) => 
          g.name.toLowerCase().includes('us-east') || 
          g.location?.toLowerCase().includes('us-east')
        );
        
        // Use US-East if found, otherwise use the first Core gateway
        const selectedGateway = usEastGateway || coreGateways[0];
        setGatewayId(selectedGateway.id);
      }
    } else if (gatewayType === 'TenantSpecific') {
      // Clear gateway_id when switching to TenantSpecific (it's optional)
      setGatewayId(null);
    }
  }, [gatewayType, coreGateways, gatewayId]);

  const createProbeMutation = useMutation({
    mutationFn: async (data: {
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
      template_id?: string | null;
    }) => {
      logger.info('Creating probe', {
        component: 'CreateProbe',
        action: 'create_probe',
        probeName: data.name,
        probeType: data.type,
        userId: user?.id,
      });
      return await ProbeApiService.createProbe(data);
    },
    onSuccess: (response) => {
      logger.info('Probe created successfully', {
        component: 'CreateProbe',
        action: 'create_probe',
        probeId: response?.data?.id,
        userId: user?.id,
      });
      // Invalidate probes queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['/api/probes'] });
      // Redirect to status page
      if (response?.data?.id) {
        setLocation(`/manage/probes/status/${response.data.id}`);
      }
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create probe', err, {
        component: 'CreateProbe',
        action: 'create_probe',
        userId: user?.id,
      });
      
      // Extract validation error details if available
      let errorMessage = error.message || 'Failed to create probe';
      if (error.details && Array.isArray(error.details)) {
        // Handle FastAPI validation errors
        const validationErrors = error.details
          .filter((detail: any) => detail.type && detail.loc && detail.msg)
          .map((detail: any) => {
            const field = detail.loc[detail.loc.length - 1];
            return `${field}: ${detail.msg}`;
          });
        if (validationErrors.length > 0) {
          errorMessage = validationErrors.join('; ');
        }
      } else if (error.details && typeof error.details === 'object') {
        // Handle other error detail formats
        if (error.details.message) {
          errorMessage = error.details.message;
        } else if (Array.isArray(error.details.errors)) {
          const validationErrors = error.details.errors
            .map((e: any) => `${e.loc?.join('.') || 'field'}: ${e.msg || e.message || 'Invalid value'}`)
            .join('; ');
          if (validationErrors) {
            errorMessage = validationErrors;
          }
        }
      }
      
      toast({ title: 'Validation Error', description: errorMessage, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!probeName || !selectedCategory || !selectedType) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please fill in all required fields', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Validate gateway configuration
    if (gatewayType === 'Core' && !gatewayId) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please select a Core gateway', 
        variant: 'destructive' 
      });
      return;
    }

    // Validate check_interval
    if (checkInterval < 10 || checkInterval > 86400) {
      toast({ 
        title: 'Validation Error', 
        description: 'Check interval must be between 10 and 86400 seconds', 
        variant: 'destructive' 
      });
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
          const err = e instanceof Error ? e : new Error(String(e));
          logger.warn('Invalid JSON in headers field, ignoring', {
            component: 'CreateProbe',
            action: 'parse_headers',
          }, err);
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
      // Add timeout to configuration (required by backend)
      if (probeTimeout) config.timeout = probeTimeout;
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
      // Add timeout to configuration (required by backend)
      if (probeTimeout) config.timeout = probeTimeout;
    }
    
    // Ensure timeout is always in configuration (backend requirement)
    if (!config.timeout && probeTimeout) {
      config.timeout = probeTimeout;
    }

    createProbeMutation.mutate({
      name: probeName,
      description: probeDescription || undefined,
      category: selectedCategory as ProbeCategory,
      type: selectedType as ProbeType,
      gateway_type: gatewayType,
      gateway_id: gatewayId || undefined,
      notification_group_id: notificationGroupId || undefined,
      check_interval: checkInterval,
      timeout: probeTimeout,
      retries: retries,
      configuration: config,
      is_active: isActive,
      template_id: templateId || undefined,
    });
  };

  const showConfigurationPanel = selectedCategory && selectedType && !showTemplateSelection;

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/manage/probes')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Probes
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
                {showTemplateSelection ? 'Select Probe Template' : 'Create Probe'}
              </h1>
              <p className="text-muted-foreground">
                {showTemplateSelection ? 'Choose a probe template to get started' : 'Configure a new monitoring probe'}
              </p>
            </div>
            {!showTemplateSelection && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBackToTemplates}
                >
                  Back to Templates
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/manage/probes')}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!probeName || createProbeMutation.isPending}
                >
                  {createProbeMutation.isPending ? 'Creating...' : 'Create Probe'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {showTemplateSelection ? (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Search and Filters */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplateFilters(!showTemplateFilters)}
                    className="sm:w-auto w-full"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </div>
                
                {showTemplateFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/50">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Category</label>
                      <Select
                        value={templateFilters.category || 'all'}
                        onValueChange={(value) => setTemplateFilters({ ...templateFilters, category: value === 'all' ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="Uptime">Uptime</SelectItem>
                          <SelectItem value="API">API</SelectItem>
                          <SelectItem value="Security">Security</SelectItem>
                          <SelectItem value="Browser">Browser</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Type</label>
                      <Select
                        value={templateFilters.type || 'all'}
                        onValueChange={(value) => setTemplateFilters({ ...templateFilters, type: value === 'all' ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="ICMP/Ping">ICMP/Ping</SelectItem>
                          <SelectItem value="HTTP/HTTPS">HTTP/HTTPS</SelectItem>
                          <SelectItem value="DNS Resolution">DNS Resolution</SelectItem>
                          <SelectItem value="SSL/TLS">SSL/TLS</SelectItem>
                          <SelectItem value="Authentication">Authentication</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(templateFilters.category || templateFilters.type) && (
                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTemplateFilters({})}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Clear Filters
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Template List */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No templates found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getProbeTypeIcon(template.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-foreground">{template.name}</span>
                          <Badge variant="outline" className="text-xs">{template.category}</Badge>
                          <Badge variant="outline" className="text-xs">{template.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p><strong>Why needed:</strong> {template.whyNeeded}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">

            {/* Configuration Panel */}
            {showConfigurationPanel && (
              <React.Fragment>
                {/* Selected Template Info */}
                {selectedTemplate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Selected Template: {selectedTemplate.name}
                        <ProbeTemplateHelp templateId={selectedTemplate.id} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline">{selectedTemplate.category}</Badge>
                        <Badge variant="outline">{selectedTemplate.type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                    </CardContent>
                  </Card>
                )}
              <Card>
                <CardHeader>
                  <CardTitle>Configure {selectedType} Probe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                {/* Basic Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Configuration</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <div className="sm:text-right flex items-center justify-end gap-1">
                      <Label htmlFor="probe-name">
                        Name *
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>A unique name to identify this probe</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="probe-name"
                      value={probeName}
                      onChange={(e) => setProbeName(e.target.value)}
                      className="sm:col-span-3"
                      placeholder="Enter probe name"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                    <div className="sm:text-right flex items-center justify-end gap-1">
                      <Label htmlFor="is-active">
                        Active
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enable or disable this probe. Disabled probes will not run checks.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <Checkbox
                        id="is-active"
                        checked={isActive}
                        onCheckedChange={(checked) => setIsActive(checked === true)}
                      />
                      <Label htmlFor="is-active" className="text-sm text-muted-foreground">
                        Enable this probe
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Probe-Specific Configuration */}
                {selectedType === 'ICMP/Ping' && (
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

                {selectedType === 'HTTP/HTTPS' && (
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

                {selectedType === 'DNS Resolution' && (
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

                {selectedType === 'SSL/TLS' && (
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

                {selectedType === 'Authentication' && (
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

                {/* Advanced Settings Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Configuration
                  </Button>
                </div>

                {/* Advanced Settings Panel */}
                {showAdvanced && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Advanced Configuration</h3>
                    
                    {/* Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                      <div className="sm:text-right flex items-center justify-end gap-1">
                        <Label htmlFor="probe-description">
                          Description
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Optional description to help identify this probe</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="probe-description"
                        value={probeDescription}
                        onChange={(e) => setProbeDescription(e.target.value)}
                        className="sm:col-span-3"
                        placeholder="Optional description"
                      />
                    </div>

                    {/* Gateway Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                      <div className="sm:text-right flex items-center justify-end gap-1">
                        <Label htmlFor="gateway-type-select">
                          Gateway Type
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Choose Core for shared gateways or Tenant Specific for your own gateway</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select
                        value={gatewayType}
                        onValueChange={(value: 'Core' | 'TenantSpecific') => {
                          setGatewayType(value);
                        }}
                        className="sm:col-span-3"
                      >
                        <SelectTrigger className="w-full" id="gateway-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Core">Core</SelectItem>
                          <SelectItem value="TenantSpecific">Tenant Specific</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {gatewayType === 'Core' && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <div className="sm:text-right flex items-center justify-end gap-1">
                          <Label htmlFor="core-gateway-id-select">
                            Gateway *
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Select the Core gateway to use for this probe</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Select
                          value={gatewayId || ''}
                          onValueChange={(value) => setGatewayId(value || null)}
                          className="sm:col-span-3"
                          disabled={coreGateways.length === 0}
                        >
                          <SelectTrigger className="w-full" id="core-gateway-id-select">
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
                        </Select>
                      </div>
                    )}
                    {gatewayType === 'TenantSpecific' && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                        <Label htmlFor="gateway-id-select" className="sm:text-right">
                          Gateway
                        </Label>
                        {tenantSpecificGateways.length === 0 ? (
                          <div className="sm:col-span-3 text-sm text-muted-foreground">
                            No Tenant specific gateway created
                          </div>
                        ) : (
                          <Select
                            value={gatewayId || '__none__'}
                            onValueChange={(value) => setGatewayId(value === '__none__' ? null : value)}
                            className="sm:col-span-3"
                          >
                            <SelectTrigger className="w-full" id="gateway-id-select">
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
                        )}
                      </div>
                    )}

                    {/* Notification Group */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                      <div className="sm:text-right flex items-center justify-end gap-1">
                        <Label htmlFor="notification-group-select">
                          Notification Group
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Select a notification group to receive alerts when this probe fails</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select
                        value={notificationGroupId || '__none__'}
                        onValueChange={(value) => setNotificationGroupId(value === '__none__' ? null : value)}
                        className="sm:col-span-3"
                      >
                        <SelectTrigger className="w-full" id="notification-group-select">
                          <SelectValue placeholder="Select notification group (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {notificationGroups.map((group: NotificationGroup) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* General advanced settings */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <div className="sm:text-right flex items-center justify-end gap-1">
                            <Label htmlFor="check-interval">
                              Check Interval (seconds) *
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>How often the probe should run checks (minimum 10 seconds, maximum 86400 seconds)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                      <div className="sm:col-span-3 space-y-1">
                        <Input
                          id="check-interval"
                          type="number"
                          value={checkInterval}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value)) {
                              // Enforce minimum of 10
                              setCheckInterval(Math.max(10, Math.min(86400, value)));
                            } else if (e.target.value === '') {
                              setCheckInterval(300); // Default to 300 if empty
                            }
                          }}
                          className="w-full"
                          placeholder="300"
                          min="10"
                          max="86400"
                        />
                        {checkInterval < 10 && (
                          <p className="text-sm text-destructive">Check interval must be at least 10 seconds</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                      <div className="sm:text-right flex items-center justify-end gap-1">
                        <Label htmlFor="probe-timeout">
                          Timeout (seconds)
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Maximum time to wait for probe execution before timing out (minimum 5 seconds, maximum 300 seconds)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="probe-timeout"
                        type="number"
                        value={probeTimeout}
                        onChange={(e) => setProbeTimeout(parseInt(e.target.value) || 30)}
                        className="sm:col-span-3"
                        placeholder="30"
                        min="5"
                        max="300"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                      <div className="sm:text-right flex items-center justify-end gap-1">
                        <Label htmlFor="retries">
                          Retries
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Number of retry attempts if the probe check fails (0-10)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="retries"
                        type="number"
                        value={retries}
                        onChange={(e) => setRetries(parseInt(e.target.value) || 3)}
                        className="sm:col-span-3"
                        placeholder="3"
                        min="0"
                        max="10"
                      />
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          </React.Fragment>
          )}
          </div>
        )}
      </div>
    </Layout>
  );
}
