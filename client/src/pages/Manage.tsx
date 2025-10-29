import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Filter, Settings, Globe, Trash2, Edit, Key, Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { GatewayApiService, GatewayUtils } from '@/services/gatewayApi';
import { ProbeApiService, ProbeUtils } from '@/services/probeApi';
import type { GatewayResponse } from '@/types/gateway';
import type { Probe, ProbeCreate, ProbeCategory, ProbeType } from '@/types/probe';

const probeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(['Uptime', 'API', 'Security', 'Browser']),
  type: z.enum(['ICMP/Ping', 'HTTP/HTTPS', 'DNS Resolution', 'SSL/TLS', 'Authentication']),
  gateway_type: z.enum(['Core', 'TenantSpecific']).default('Core'),
  gateway_id: z.string().optional().nullable(),
  check_interval: z.number().min(60).max(86400).default(300),
  timeout: z.number().min(5).max(300).default(30).optional(),
  retries: z.number().min(0).max(10).default(3).optional(),
  configuration: z.record(z.any()).optional(),
  is_active: z.boolean().default(true).optional(),
});

const notificationGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  emails: z.string().min(1, 'At least one email is required'),
  alertThreshold: z.number().default(1),
});

const gatewaySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['Core', 'TenantSpecific']).default('TenantSpecific'),
  location: z.string().optional(),
});

export default function Manage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentHash, setCurrentHash] = useState(() => {
    // Get initial hash from URL
    return window.location.hash ? window.location.hash.substring(1) : 'gateways';
  });

  // Create Probe Dialog State
  const [createProbeDialogOpen, setCreateProbeDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  
  // Configuration Dialog State
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [probeName, setProbeName] = useState<string>('');
  const [probeDescription, setProbeDescription] = useState<string>('');
  const [probeConfig, setProbeConfig] = useState<Record<string, any>>({});
  const [checkInterval, setCheckInterval] = useState<number>(300);
  const [gatewayType, setGatewayType] = useState<'Core' | 'TenantSpecific'>('Core');
  const [gatewayId, setGatewayId] = useState<string | null>(null);
  const [httpMethod, setHttpMethod] = useState<string>('GET');
  const [probeTimeout, setProbeTimeout] = useState<number>(30);
  const [retries, setRetries] = useState<number>(3);
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // Gateway Registration Key State
  const [registrationKeyDialogOpen, setRegistrationKeyDialogOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<GatewayResponse | null>(null);
  const [registrationKey, setRegistrationKey] = useState<string>('');
  const [keyCopied, setKeyCopied] = useState(false);
  
  // Edit Gateway Dialog State
  const [editGatewayDialogOpen, setEditGatewayDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<GatewayResponse | null>(null);
  
  // Edit Probe Dialog State
  const [editProbeDialogOpen, setEditProbeDialogOpen] = useState(false);
  const [editingProbe, setEditingProbe] = useState<Probe | null>(null);
  
  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash ? window.location.hash.substring(1) : 'gateways';
      setCurrentHash(newHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Also listen for initial load in case hash is set
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
  
  const [location] = useLocation();
  const hash = currentHash;

  const { data: probes, refetch: refetchProbes } = useQuery({
    queryKey: ['/api/probes'],
    enabled: !!user && hash === 'probes',
    queryFn: async () => {
      return await ProbeApiService.listProbes();
    },
  });

  const { data: notificationGroups, refetch: refetchNotificationGroups } = useQuery({
    queryKey: ['/api/notification-groups'],
    enabled: !!user && hash === 'notifications',
  });

  const { data: gateways, refetch: refetchGateways, error: gatewaysError, isLoading: gatewaysLoading } = useQuery({
    queryKey: ['/api/gateways'],
    enabled: !!user && (hash === 'gateways' || hash === 'probes'), // Load gateways when viewing probes too
    queryFn: async () => {
      return await GatewayApiService.listGateways();
    },
  });

  const { data: probeTypes, error: typesError, isLoading: typesLoading } = useQuery({
    queryKey: ['/api/probes/types'],
    enabled: !!user && hash === 'probes',
    queryFn: async () => {
      return await ProbeApiService.getProbeTypes();
    },
  });

  // Extract categories from the probe types response (keys of the mapping)
  // Handle both object mapping and array responses
  const probeCategories = probeTypes?.data 
    ? Array.isArray(probeTypes.data) 
      ? [] // If array, no categories to show (category filter already applied)
      : Object.keys(probeTypes.data)
    : [];

  // Filter probe types based on selected category
  const filteredProbeTypes = selectedCategory && probeTypes?.data 
    ? Array.isArray(probeTypes.data)
      ? probeTypes.data // If array, use it directly
      : probeTypes.data[selectedCategory] || []
    : [];

  // Reset selected type when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedType(''); // Reset type selection
  };

  const probeForm = useForm<z.infer<typeof probeSchema>>({
    resolver: zodResolver(probeSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'Uptime',
      type: 'ICMP/Ping',
      gateway_type: 'Core',
      gateway_id: null,
      check_interval: 300,
      timeout: 30,
      retries: 3,
      configuration: {},
      is_active: true,
    },
  });

  const notificationForm = useForm<z.infer<typeof notificationGroupSchema>>({
    resolver: zodResolver(notificationGroupSchema),
    defaultValues: {
      name: '',
      emails: '',
      alertThreshold: 1,
    },
  });

  const gatewayForm = useForm<z.infer<typeof gatewaySchema>>({
    resolver: zodResolver(gatewaySchema),
    defaultValues: {
      name: '',
      type: 'TenantSpecific',
      location: '',
    },
  });

  const createProbeMutation = useMutation({
    mutationFn: async (data: ProbeCreate) => {
      return await ProbeApiService.createProbe(data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Probe created successfully' });
      refetchProbes();
      probeForm.reset();
      setCreateProbeDialogOpen(false);
      setConfigDialogOpen(false);
      setSelectedCategory('');
      setSelectedType('');
      setProbeName('');
      setProbeDescription('');
      setProbeConfig({});
      setCheckInterval(300);
      setGatewayType('Core');
      setGatewayId(null);
      setHttpMethod('GET');
      setProbeTimeout(30);
      setRetries(3);
      setIsActive(true);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateProbeMutation = useMutation({
    mutationFn: async ({ probeId, data }: { probeId: string; data: Partial<ProbeCreate> }) => {
      return await ProbeApiService.updateProbe(probeId, data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Probe updated successfully' });
      refetchProbes();
      setEditProbeDialogOpen(false);
      setEditingProbe(null);
      probeForm.reset();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProbeMutation = useMutation({
    mutationFn: async (probeId: string) => {
      return await ProbeApiService.deleteProbe(probeId);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Probe deleted successfully' });
      refetchProbes();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });


  const createNotificationGroupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationGroupSchema>) => {
      const emailArray = data.emails.split(',').map(email => email.trim());
      
      const response = await apiRequest('POST', '/api/notification-groups', {
        ...data,
        emails: emailArray,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Notification group created successfully' });
      refetchNotificationGroups();
      notificationForm.reset();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const createGatewayMutation = useMutation({
    mutationFn: async (data: z.infer<typeof gatewaySchema>) => {
      return await GatewayApiService.createGateway(data);
    },
    onSuccess: (response) => {
      toast({ title: 'Success', description: 'Gateway created successfully' });
      refetchGateways();
      gatewayForm.reset();
      
      // Show registration key dialog if gateway was created
      if (response.data) {
        setSelectedGateway(response.data);
        setKeyCopied(false);
        setRegistrationKeyDialogOpen(true);
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: async (gatewayId: string) => {
      return await GatewayApiService.regenerateRegistrationKey(gatewayId);
    },
    onSuccess: (response) => {
      toast({ title: 'Success', description: 'Registration key regenerated successfully' });
      // The response now contains the registration key string directly
      setRegistrationKey(response.data.registration_key);
      setKeyCopied(false);
      setRegistrationKeyDialogOpen(true);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const downloadKeyMutation = useMutation({
    mutationFn: async (gatewayId: string) => {
      return await GatewayApiService.downloadRegistrationKey(gatewayId);
    },
    onSuccess: (keyContent) => {
      // Create and download the file
      const blob = new Blob([keyContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gateway_${selectedGateway?.id}_key.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: 'Success', description: 'Registration key downloaded' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateGatewayMutation = useMutation({
    mutationFn: async ({ gatewayId, data }: { gatewayId: string; data: z.infer<typeof gatewaySchema> }) => {
      return await GatewayApiService.updateGateway(gatewayId, data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Gateway updated successfully' });
      refetchGateways();
      setEditGatewayDialogOpen(false);
      setEditingGateway(null);
      gatewayForm.reset();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteGatewayMutation = useMutation({
    mutationFn: async (gatewayId: string) => {
      return await GatewayApiService.deleteGateway(gatewayId);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Gateway deleted successfully' });
      refetchGateways();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });


  const filteredProbes = probes?.data 
    ? probes.data.filter((probe: Probe) =>
        probe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ProbeUtils.getConfigDisplay(probe).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant="outline" className="capitalize">
        {type}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Manage</h1>
          <p className="text-muted-foreground">Configure probes, notification groups, and gateways</p>
        </div>

        {/* Show content based on URL hash */}
        {hash === 'probes' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search probes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                        data-testid="input-search-probes"
                      />
                    </div>
                    <Button variant="outline" size="icon" data-testid="button-filter-probes" className="w-10 h-10 flex-shrink-0">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
                    <Button 
                      data-testid="button-create-probe" 
                      className="w-full sm:w-auto"
                      onClick={() => setCreateProbeDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Probe
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Probes ({filteredProbes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredProbes.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No probes found</h3>
                    <p className="text-muted-foreground">Create your first probe to start monitoring</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProbes.map((probe: Probe) => {
                      const configDisplay = ProbeUtils.getConfigDisplay(probe);
                      return (
                      <div key={probe.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg gap-4" data-testid={`probe-item-${probe.id}`}>
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${probe.is_active ? 'bg-secondary' : 'bg-muted'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-foreground truncate">{probe.name}</div>
                            <div className="text-sm text-muted-foreground truncate">{configDisplay}</div>
                            {probe.description && (
                              <div className="text-xs text-muted-foreground mt-1">{probe.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                          <div className="flex flex-wrap gap-1 min-w-0">
                            <Badge variant="outline" className="capitalize">{probe.category}</Badge>
                            {getTypeBadge(probe.type)}
                            <Badge variant="outline">{probe.check_interval}s</Badge>
                            <Badge variant={probe.gateway_type === 'Core' ? 'secondary' : 'outline'}>
                              {probe.gateway_type === 'Core' ? 'Core' : 'Custom'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              data-testid={`button-edit-probe-${probe.id}`}
                              onClick={() => {
                                setEditingProbe(probe);
                                probeForm.reset({
                                  name: probe.name,
                                  description: probe.description || '',
                                  category: probe.category,
                                  type: probe.type,
                                  gateway_type: probe.gateway_type,
                                  gateway_id: probe.gateway_id || null,
                                  check_interval: probe.check_interval,
                                  timeout: probe.timeout,
                                  retries: probe.retries,
                                  configuration: probe.configuration || {},
                                  is_active: probe.is_active,
                                });
                                setEditProbeDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              data-testid={`button-delete-probe-${probe.id}`}
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete the probe "${probe.name}"? This action cannot be undone.`)) {
                                  deleteProbeMutation.mutate(probe.id);
                                }
                              }}
                              disabled={deleteProbeMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {hash === 'notifications' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-medium">Notification Groups</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-notification" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Notification Group</DialogTitle>
                  </DialogHeader>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit((data) => createNotificationGroupMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Group Name</FormLabel>
                            <FormControl>
                              <Input placeholder="DevOps Team" {...field} data-testid="input-group-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationForm.control}
                        name="emails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Addresses</FormLabel>
                            <FormControl>
                              <Textarea placeholder="admin@example.com, devops@example.com" {...field} data-testid="textarea-emails" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationForm.control}
                        name="alertThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alert Threshold</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-threshold" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createNotificationGroupMutation.isPending} className="w-full" data-testid="button-save-notification">
                        {createNotificationGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-4 sm:p-5 lg:p-6">
                {!Array.isArray(notificationGroups) || notificationGroups.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No notification groups</h3>
                    <p className="text-muted-foreground">Create groups to manage alert recipients</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notificationGroups.map((group: any) => (
                      <div key={group.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg gap-4" data-testid={`notification-item-${group.id}`}>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground">{group.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {group.emails?.length || 0} members
                          </div>
                          <div className="text-xs text-muted-foreground">Threshold: {group.alertThreshold} failures</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={group.isActive ? "secondary" : "outline"}>
                            {group.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button variant="ghost" size="sm" data-testid={`button-edit-notification-${group.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {hash === 'gateways' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-medium">Gateways</h3>
              {(user?.role === 'SuperAdmin' || user?.role === 'Owner' || user?.role === 'Admin') && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-gateway" className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Gateway
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Custom Gateway</DialogTitle>
                    </DialogHeader>
                    <Form {...gatewayForm}>
                      <form onSubmit={gatewayForm.handleSubmit((data) => createGatewayMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={gatewayForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gateway Name</FormLabel>
                              <FormControl>
                                <Input placeholder="US East Gateway" {...field} data-testid="input-gateway-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={gatewayForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gateway Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gateway type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="TenantSpecific">Tenant Specific</SelectItem>
                                  <SelectItem value="Core">Core</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={gatewayForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="New York, USA" {...field} data-testid="input-gateway-location" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={createGatewayMutation.isPending} className="w-full" data-testid="button-save-gateway">
                          {createGatewayMutation.isPending ? 'Creating...' : 'Add Gateway'}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <Card>
              <CardContent className="p-4 sm:p-5 lg:p-6">
                {!Array.isArray(gateways?.data) || gateways?.data.length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No gateways available</h3>
                    <p className="text-muted-foreground">Gateways execute your monitoring probes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gateways.data.map((gateway: GatewayResponse) => {
                      const statusInfo = GatewayUtils.formatGatewayStatus(gateway.status);
                      const typeInfo = GatewayUtils.formatGatewayType(gateway.type);
                      const isOnline = GatewayUtils.isGatewayOnline(gateway.last_heartbeat);
                      const lastSeen = GatewayUtils.formatLastHeartbeat(gateway.last_heartbeat);
                      
                      return (
                        <div key={gateway.id} className="flex flex-col sm:flex-row sm:items-center p-4 border border-border rounded-lg gap-4" data-testid={`gateway-item-${gateway.id}`}>
                          {/* Container 1: Name and Details (33%) */}
                          <div className="flex items-center space-x-4 w-full sm:w-1/3 min-w-0">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              isOnline ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground text-lg">{gateway.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {gateway.location || 'No location specified'}
                              </div>
                              {gateway.ip_address && (
                                <div className="text-xs text-muted-foreground">{gateway.ip_address}</div>
                              )}
                            </div>
                          </div>
                          
                          {/* Container 2: Status Chips (33%) */}
                          <div className="flex flex-wrap gap-1 w-full sm:w-1/3 items-start sm:items-center">
                            <Badge variant="outline" title={typeInfo.description}>
                              {typeInfo.label}
                            </Badge>
                            <Badge variant={isOnline ? "secondary" : "destructive"}>
                              {isOnline ? 'Online' : 'Offline'}
                            </Badge>
                            <Badge variant="outline" className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          
                          {/* Container 3: CRUD Actions and Last Seen (33%) */}
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-1/3 justify-start sm:justify-end">
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setSelectedGateway(gateway);
                                  regenerateKeyMutation.mutate(gateway.id);
                                }}
                                disabled={regenerateKeyMutation.isPending}
                                title="Regenerate registration key"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setEditingGateway(gateway);
                                  gatewayForm.reset({
                                    name: gateway.name,
                                    type: gateway.type,
                                    location: gateway.location || '',
                                  });
                                  setEditGatewayDialogOpen(true);
                                }}
                                title="Edit gateway"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete the gateway "${gateway.name}"? This action cannot be undone.`)) {
                                    deleteGatewayMutation.mutate(gateway.id);
                                  }
                                }}
                                disabled={deleteGatewayMutation.isPending}
                                title="Delete gateway"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Last seen: {lastSeen}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Registration Key Dialog */}
      <Dialog open={registrationKeyDialogOpen} onOpenChange={setRegistrationKeyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gateway Registration Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedGateway && (
              <div className="space-y-2">
                <Label>Gateway: {selectedGateway.name}</Label>
                <Label className="text-sm text-muted-foreground">
                  {GatewayUtils.formatGatewayType(selectedGateway.type).description}
                </Label>
              </div>
            )}
            <div className="space-y-2">
              <Label>Registration Key</Label>
              <div className="relative">
                <Input
                  value={keyCopied ? '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••' : registrationKey}
                  readOnly
                  className="pr-20 font-mono text-sm"
                  placeholder="Registration key will appear here..."
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-1 top-1 h-8"
                  onClick={() => {
                    navigator.clipboard.writeText(registrationKey);
                    setKeyCopied(true);
                    toast({ title: 'Success', description: 'Registration key copied to clipboard' });
                  }}
                  disabled={!registrationKey || keyCopied}
                >
                  {keyCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {keyCopied 
                  ? 'Key copied to clipboard. Keep it secure and don\'t share it.'
                  : 'Use this key to register your gateway with the NetView controller. Keep it secure and don\'t share it.'
                }
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRegistrationKeyDialogOpen(false);
                  setSelectedGateway(null);
                  setRegistrationKey('');
                  setKeyCopied(false);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  if (selectedGateway) {
                    downloadKeyMutation.mutate(selectedGateway.id);
                  }
                }}
                disabled={downloadKeyMutation.isPending || !registrationKey}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Gateway Dialog */}
      <Dialog open={editGatewayDialogOpen} onOpenChange={setEditGatewayDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Gateway</DialogTitle>
          </DialogHeader>
          <Form {...gatewayForm}>
            <form onSubmit={gatewayForm.handleSubmit((data) => {
              if (editingGateway) {
                updateGatewayMutation.mutate({ gatewayId: editingGateway.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={gatewayForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gateway Name</FormLabel>
                    <FormControl>
                      <Input placeholder="US East Gateway" {...field} data-testid="input-edit-gateway-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={gatewayForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gateway Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gateway type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TenantSpecific">Tenant Specific</SelectItem>
                        <SelectItem value="Core">Core</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={gatewayForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="New York, USA" {...field} data-testid="input-edit-gateway-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditGatewayDialogOpen(false);
                    setEditingGateway(null);
                    gatewayForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateGatewayMutation.isPending}>
                  {updateGatewayMutation.isPending ? 'Updating...' : 'Update Gateway'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Probe Dialog */}
      <Dialog open={editProbeDialogOpen} onOpenChange={setEditProbeDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Probe</DialogTitle>
          </DialogHeader>
          <Form {...probeForm}>
            <form onSubmit={probeForm.handleSubmit((data) => {
              if (editingProbe) {
                updateProbeMutation.mutate({ probeId: editingProbe.id, data });
              }
            })} className="space-y-4">
              {/* Read-only fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="text-sm text-muted-foreground py-2">
                    {editingProbe?.category}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="text-sm text-muted-foreground py-2">
                    {editingProbe?.type}
                  </div>
                </div>
              </div>

              <FormField
                control={probeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Probe name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={probeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={probeForm.control}
                name="gateway_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gateway Type</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      if (value === 'Core') {
                        probeForm.setValue('gateway_id', null);
                      }
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Core">Core</SelectItem>
                        <SelectItem value="TenantSpecific">Tenant Specific</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {probeForm.watch('gateway_type') === 'TenantSpecific' && (
                <FormField
                  control={probeForm.control}
                  name="gateway_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gateway</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gateway" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {gateways?.data?.filter((g: GatewayResponse) => g.type === 'TenantSpecific').map((gateway: GatewayResponse) => (
                            <SelectItem key={gateway.id} value={gateway.id}>
                              {gateway.name} {gateway.location ? `(${gateway.location})` : ''}
                            </SelectItem>
                          )) || []}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={probeForm.control}
                name="check_interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Interval (seconds)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={60} 
                        max={86400}
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 300)} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={probeForm.control}
                name="timeout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeout (seconds)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={5} 
                        max={300}
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 30)} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={probeForm.control}
                name="retries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retries</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        max={10}
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 3)} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={probeForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable or disable this probe
                      </div>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditProbeDialogOpen(false);
                    setEditingProbe(null);
                    probeForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProbeMutation.isPending}>
                  {updateProbeMutation.isPending ? 'Updating...' : 'Update Probe'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Probe Dialog - Category and Type Selection */}
      <Dialog 
        open={createProbeDialogOpen} 
        onOpenChange={(open) => {
          setCreateProbeDialogOpen(open);
          if (!open) {
            // Reset state when dialog closes
            setSelectedCategory('');
            setSelectedType('');
            setProbeName('');
            setProbeDescription('');
            setProbeConfig({});
            setCheckInterval(300);
            setGatewayType('Core');
            setGatewayId(null);
            setHttpMethod('GET');
            setProbeTimeout(30);
            setRetries(3);
            setIsActive(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Probe Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="probe-category" className="text-right">
                Category
              </label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {typesLoading ? (
                    <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                  ) : typesError ? (
                    <SelectItem value="error" disabled>Error loading categories</SelectItem>
                  ) : probeCategories.length === 0 ? (
                    <SelectItem value="none" disabled>No categories available</SelectItem>
                  ) : probeCategories.map((category: string) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="probe-type" className="text-right">
                Type
              </label>
              <Select 
                value={selectedType} 
                onValueChange={setSelectedType}
                disabled={!selectedCategory}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typesLoading ? (
                    <SelectItem value="loading" disabled>Loading types...</SelectItem>
                  ) : typesError ? (
                    <SelectItem value="error" disabled>Error loading types</SelectItem>
                  ) : !selectedCategory ? (
                    <SelectItem value="select-category" disabled>Select a category first</SelectItem>
                  ) : filteredProbeTypes.length === 0 ? (
                    <SelectItem value="none" disabled>No types available</SelectItem>
                  ) : filteredProbeTypes.map((type: string) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateProbeDialogOpen(false);
                setSelectedCategory('');
                setSelectedType('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setCreateProbeDialogOpen(false);
                setConfigDialogOpen(true);
              }}
              disabled={!selectedCategory || !selectedType}
            >
              Next
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configuration Dialog - Specific fields based on probe type */}
      <Dialog 
        open={configDialogOpen} 
        onOpenChange={(open) => {
          setConfigDialogOpen(open);
          if (!open && !createProbeDialogOpen) {
            // Reset state when dialog closes (unless create dialog is opening)
            setProbeName('');
            setProbeDescription('');
            setProbeConfig({});
            setCheckInterval(300);
            setGatewayType('Core');
            setGatewayId(null);
            setHttpMethod('GET');
            setProbeTimeout(30);
            setRetries(3);
            setIsActive(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Configure {selectedType} Probe</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Common fields for all probe types */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="probe-name" className="text-right">
                Name *
              </label>
              <Input
                id="probe-name"
                value={probeName}
                onChange={(e) => setProbeName(e.target.value)}
                className="col-span-3"
                placeholder="Enter probe name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="probe-description" className="text-right">
                Description
              </label>
              <Input
                id="probe-description"
                value={probeDescription}
                onChange={(e) => setProbeDescription(e.target.value)}
                className="col-span-3"
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="gateway-type-select" className="text-right">
                Gateway Type *
              </label>
              <Select value={gatewayType} onValueChange={(value: 'Core' | 'TenantSpecific') => {
                setGatewayType(value);
                if (value === 'Core') {
                  setGatewayId(null); // Clear gateway_id for Core type
                }
              }}>
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
                <label htmlFor="gateway-id-select" className="text-right">
                  Gateway
                </label>
                <Select 
                  value={gatewayId || ''} 
                  onValueChange={(value) => setGatewayId(value || null)}
                >
                  <SelectTrigger className="col-span-3" id="gateway-id-select">
                    <SelectValue placeholder="Select gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    {gateways?.data?.filter((g: GatewayResponse) => g.type === 'TenantSpecific').map((gateway: GatewayResponse) => (
                      <SelectItem key={gateway.id} value={gateway.id}>
                        {gateway.name} {gateway.location ? `(${gateway.location})` : ''}
                      </SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ICMP/Ping specific fields */}
            {selectedType === 'ICMP/Ping' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="host" className="text-right">
                    Host
                  </label>
                  <Input
                    id="host"
                    className="col-span-3"
                    placeholder="IP address or hostname"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="timeout" className="text-right">
                    Timeout (ms)
                  </label>
                  <Input
                    id="timeout"
                    type="number"
                    className="col-span-3"
                    placeholder="5000"
                    defaultValue="5000"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="packet-count" className="text-right">
                    Packet Count
                  </label>
                  <Input
                    id="packet-count"
                    type="number"
                    className="col-span-3"
                    placeholder="4"
                    defaultValue="4"
                  />
                </div>
              </>
            )}

            {/* HTTP/HTTPS specific fields */}
            {selectedType === 'HTTP/HTTPS' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="url" className="text-right">
                    URL
                  </label>
                  <Input
                    id="url"
                    className="col-span-3"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="method" className="text-right">
                    Method
                  </label>
                  <Select defaultValue="GET" onValueChange={setHttpMethod}>
                    <SelectTrigger className="col-span-3" id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="expected-status" className="text-right">
                    Expected Status
                  </label>
                  <Input
                    id="expected-status"
                    type="number"
                    className="col-span-3"
                    placeholder="200"
                    defaultValue="200"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="timeout" className="text-right">
                    Timeout (ms)
                  </label>
                  <Input
                    id="timeout"
                    type="number"
                    className="col-span-3"
                    placeholder="5000"
                    defaultValue="5000"
                  />
                </div>
              </>
            )}

            {/* SSL/TLS specific fields */}
            {selectedType === 'SSL/TLS' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="host" className="text-right">
                    Host
                  </label>
                  <Input
                    id="host"
                    className="col-span-3"
                    placeholder="example.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="port" className="text-right">
                    Port
                  </label>
                  <Input
                    id="port"
                    type="number"
                    className="col-span-3"
                    placeholder="443"
                    defaultValue="443"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="alert-days" className="text-right">
                    Alert Before Expiry (days)
                  </label>
                  <Input
                    id="alert-days"
                    type="number"
                    className="col-span-3"
                    placeholder="30"
                    defaultValue="30"
                  />
                </div>
              </>
            )}

            {/* Authentication specific fields */}
            {selectedType === 'Authentication' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="url" className="text-right">
                    Login URL
                  </label>
                  <Input
                    id="url"
                    className="col-span-3"
                    placeholder="https://example.com/login"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="username" className="text-right">
                    Username
                  </label>
                  <Input
                    id="username"
                    className="col-span-3"
                    placeholder="test@example.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="password" className="text-right">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    className="col-span-3"
                    placeholder="Enter password"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="expected-response" className="text-right">
                    Expected Response
                  </label>
                  <Input
                    id="expected-response"
                    className="col-span-3"
                    placeholder="success"
                    defaultValue="success"
                  />
                </div>
              </>
            )}

            {/* DNS Resolution specific fields */}
            {selectedType === 'DNS Resolution' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="domain" className="text-right">
                    Domain
                  </label>
                  <Input
                    id="domain"
                    className="col-span-3"
                    placeholder="example.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="dns-server" className="text-right">
                    DNS Server (Optional)
                  </label>
                  <Input
                    id="dns-server"
                    className="col-span-3"
                    placeholder="8.8.8.8"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="record-type" className="text-right">
                    Record Type
                  </label>
                  <Select defaultValue="A">
                    <SelectTrigger className="col-span-3" id="record-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="AAAA">AAAA</SelectItem>
                      <SelectItem value="CNAME">CNAME</SelectItem>
                      <SelectItem value="MX">MX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Load Time specific fields */}
            {selectedType === 'Load Time' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="url" className="text-right">
                    URL
                  </label>
                  <Input
                    id="url"
                    className="col-span-3"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="max-load-time" className="text-right">
                    Max Load Time (ms)
                  </label>
                  <Input
                    id="max-load-time"
                    type="number"
                    className="col-span-3"
                    placeholder="3000"
                    defaultValue="3000"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="browser" className="text-right">
                    Browser
                  </label>
                  <Select defaultValue="chrome">
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chrome">Chrome</SelectItem>
                      <SelectItem value="firefox">Firefox</SelectItem>
                      <SelectItem value="safari">Safari</SelectItem>
                      <SelectItem value="edge">Edge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Common fields for all probe types */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="check-interval" className="text-right">
                Check Interval (seconds) *
              </label>
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
              <label htmlFor="timeout" className="text-right">
                Timeout (seconds)
              </label>
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
              <label htmlFor="retries" className="text-right">
                Retries
              </label>
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
              <label htmlFor="is-active" className="text-right">
                Active
              </label>
              <div className="col-span-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="is-active" className="text-sm text-muted-foreground">
                  Enable this probe
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setConfigDialogOpen(false);
                setCreateProbeDialogOpen(true);
              }}
            >
              Back
            </Button>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
              onClick={() => {
                setConfigDialogOpen(false);
                setProbeName('');
                setProbeDescription('');
                setProbeConfig({});
                setCheckInterval(300);
                setGatewayType('Core');
                setGatewayId(null);
                setHttpMethod('GET');
                setProbeTimeout(30);
                setRetries(3);
                setIsActive(true);
                setSelectedCategory('');
                setSelectedType('');
              }}
              >
                Cancel
              </Button>
            <Button 
              onClick={() => {
                if (!probeName || !selectedCategory || !selectedType) {
                  toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
                  return;
                }

                // Build configuration object based on probe type
                const config: Record<string, any> = {};
                
                // Get form values from DOM (since we're not using react-hook-form for this complex form)
                if (selectedType === 'ICMP/Ping') {
                  const hostInput = document.getElementById('host') as HTMLInputElement;
                  const timeoutInput = document.getElementById('timeout') as HTMLInputElement;
                  const packetCountInput = document.getElementById('packet-count') as HTMLInputElement;
                  if (hostInput?.value) config.host = hostInput.value;
                  if (timeoutInput?.value) config.timeout = parseInt(timeoutInput.value);
                  if (packetCountInput?.value) config.packet_count = parseInt(packetCountInput.value);
                } else if (selectedType === 'HTTP/HTTPS') {
                  const urlInput = document.getElementById('url') as HTMLInputElement;
                  const expectedStatusInput = document.getElementById('expected-status') as HTMLInputElement;
                  const timeoutInput = document.getElementById('timeout') as HTMLInputElement;
                  if (urlInput?.value) config.url = urlInput.value;
                  config.method = httpMethod || 'GET';
                  if (expectedStatusInput?.value) config.expected_status = parseInt(expectedStatusInput.value);
                  if (timeoutInput?.value) config.timeout = parseInt(timeoutInput.value);
                } else if (selectedType === 'SSL/TLS') {
                  const hostInput = document.getElementById('host') as HTMLInputElement;
                  const portInput = document.getElementById('port') as HTMLInputElement;
                  const alertDaysInput = document.getElementById('alert-days') as HTMLInputElement;
                  if (hostInput?.value) config.host = hostInput.value;
                  if (portInput?.value) config.port = parseInt(portInput.value);
                  if (alertDaysInput?.value) config.alert_days = parseInt(alertDaysInput.value);
                } else if (selectedType === 'Authentication') {
                  const urlInput = document.getElementById('url') as HTMLInputElement;
                  const usernameInput = document.getElementById('username') as HTMLInputElement;
                  const passwordInput = document.getElementById('password') as HTMLInputElement;
                  const expectedResponseInput = document.getElementById('expected-response') as HTMLInputElement;
                  if (urlInput?.value) config.url = urlInput.value;
                  if (usernameInput?.value) config.username = usernameInput.value;
                  if (passwordInput?.value) config.password = passwordInput.value;
                  if (expectedResponseInput?.value) config.expected_response = expectedResponseInput.value;
                } else if (selectedType === 'DNS Resolution') {
                  const domainInput = document.getElementById('domain') as HTMLInputElement;
                  const dnsServerInput = document.getElementById('dns-server') as HTMLInputElement;
                  const recordTypeSelect = document.getElementById('record-type')?.parentElement?.querySelector('[role="combobox"]')?.textContent || 'A';
                  if (domainInput?.value) config.domain = domainInput.value;
                  if (dnsServerInput?.value) config.dns_server = dnsServerInput.value;
                  config.record_type = recordTypeSelect || 'A';
                }

                const probeData: ProbeCreate = {
                  name: probeName,
                  description: probeDescription || undefined,
                  category: selectedCategory as ProbeCategory,
                  type: selectedType as ProbeType,
                  gateway_type: gatewayType,
                  gateway_id: gatewayId || undefined,
                  check_interval: checkInterval,
                  timeout: probeTimeout,
                  retries: retries,
                  configuration: config,
                  is_active: isActive,
                };

                createProbeMutation.mutate(probeData);
              }}
              disabled={!probeName || createProbeMutation.isPending}
            >
              {createProbeMutation.isPending ? 'Creating...' : 'Create Probe'}
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
