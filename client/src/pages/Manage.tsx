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
import { Plus, Search, Filter, Settings, Globe, Bot, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

const probeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(['Uptime', 'API', 'Security', 'Browser']),
  type: z.enum(['ICMP/Ping', 'HTTP/HTTPS', 'DNS Resolution', 'SSL/TLS', 'Authentication']),
  checkInterval: z.number().default(300),
  // Configuration fields will be validated dynamically based on type
  configuration: z.record(z.any()),
});

const notificationGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  emails: z.string().min(1, 'At least one email is required'),
  alertThreshold: z.number().default(1),
});

const gatewaySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
  ipAddress: z.string().optional(),
});

export default function Manage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiCode, setAiCode] = useState('');
  const [currentHash, setCurrentHash] = useState(() => {
    // Get initial hash from URL
    return window.location.hash ? window.location.hash.substring(1) : 'probes';
  });
  
  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash ? window.location.hash.substring(1) : 'probes';
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
    enabled: !!user,
  });

  const { data: notificationGroups, refetch: refetchNotificationGroups } = useQuery({
    queryKey: ['/api/notification-groups'],
    enabled: !!user,
  });

  const { data: gateways, refetch: refetchGateways } = useQuery({
    queryKey: ['/api/gateways'],
    enabled: !!user,
  });

  const probeForm = useForm<z.infer<typeof probeSchema>>({
    resolver: zodResolver(probeSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'Uptime',
      type: 'ICMP/Ping',
      checkInterval: 300,
      configuration: {},
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
      location: '',
      ipAddress: '',
    },
  });

  const createProbeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof probeSchema>) => {
      const response = await apiRequest('POST', '/api/probes', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Probe created successfully' });
      refetchProbes();
      probeForm.reset();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const generateProbesMutation = useMutation({
    mutationFn: async (data: { url?: string; code?: string; description?: string }) => {
      const response = await apiRequest('POST', '/api/probes/generate', data);
      return response.json();
    },
    onSuccess: (generatedProbes) => {
      toast({ title: 'Success', description: `Generated ${generatedProbes.length} probe configurations` });
      // Auto-fill form with first generated probe
      if (generatedProbes.length > 0) {
        const firstProbe = generatedProbes[0];
        probeForm.reset(firstProbe);
      }
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
      const response = await apiRequest('POST', '/api/gateways', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Gateway created successfully' });
      refetchGateways();
      gatewayForm.reset();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleGenerateProbes = () => {
    const data: any = {};
    if (aiPrompt) data.url = aiPrompt;
    if (aiCode) data.code = aiCode;
    generateProbesMutation.mutate(data);
  };

  const filteredProbes = Array.isArray(probes) ? probes.filter((probe: any) =>
    probe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    probe.url?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getTypeBadge = (type: string) => {
    const colors = {
      'Uptime': 'bg-primary/10 text-primary',
      'API': 'bg-secondary/10 text-secondary',
      'Security': 'bg-purple-100 text-purple-700',
      'Browser': 'bg-green-100 text-green-700',
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-muted text-muted-foreground'}>
        {type}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Manage</h1>
          <p className="text-muted-foreground">Configure probes, notification groups, and gateways</p>
        </div>

        {/* Show content based on URL hash */}
        {hash === 'probes' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search probes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-64"
                        data-testid="input-search-probes"
                      />
                    </div>
                    <Button variant="outline" size="icon" data-testid="button-filter-probes" className="w-10 h-10 sm:h-auto">
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" disabled data-testid="button-ai-generate" className="w-full sm:w-auto">
                          <Bot className="w-4 h-4 mr-2" />
                          AI Generate (Coming Soon)
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>AI-Powered Probe Generation</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="ai-url">URL to Monitor</Label>
                            <Input
                              id="ai-url"
                              placeholder="https://example.com/api"
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              data-testid="input-ai-url"
                            />
                          </div>
                          <div>
                            <Label htmlFor="ai-code">Or paste code to analyze</Label>
                            <Textarea
                              id="ai-code"
                              placeholder="Paste your API code here..."
                              value={aiCode}
                              onChange={(e) => setAiCode(e.target.value)}
                              rows={6}
                              data-testid="textarea-ai-code"
                            />
                          </div>
                          <Button 
                            onClick={handleGenerateProbes}
                            disabled={generateProbesMutation.isPending || (!aiPrompt && !aiCode)}
                            className="w-full"
                            data-testid="button-generate-probes"
                          >
                            {generateProbesMutation.isPending ? 'Generating...' : 'Generate Probes'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button data-testid="button-create-probe" className="w-full sm:w-auto">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Probe
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Create New Probe</DialogTitle>
                        </DialogHeader>
                        <Form {...probeForm}>
                          <form onSubmit={probeForm.handleSubmit((data) => createProbeMutation.mutate(data))} className="space-y-4">
                            <FormField
                              control={probeForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Probe Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="My API Probe" {...field} data-testid="input-probe-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField
                                control={probeForm.control}
                                name="category"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-probe-category">
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="Uptime">Uptime</SelectItem>
                                        <SelectItem value="API">API</SelectItem>
                                        <SelectItem value="Security">Security</SelectItem>
                                        <SelectItem value="Browser">Browser</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={probeForm.control}
                                name="type"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Probe Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-probe-type">
                                          <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="ICMP/Ping">ICMP/Ping</SelectItem>
                                        <SelectItem value="HTTP/HTTPS">HTTP/HTTPS</SelectItem>
                                        <SelectItem value="DNS Resolution">DNS Resolution</SelectItem>
                                        <SelectItem value="SSL/TLS">SSL/TLS</SelectItem>
                                        <SelectItem value="Authentication">Authentication</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={probeForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description (Optional)</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Description of what this probe monitors" {...field} data-testid="textarea-probe-description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={probeForm.control}
                              name="checkInterval"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Check Interval (seconds)</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-interval" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="p-4 bg-muted rounded-md">
                              <p className="text-sm text-muted-foreground">Note: Probe-specific configuration fields will be added after selecting the probe type in future updates.</p>
                            </div>
                            <Button type="submit" disabled={createProbeMutation.isPending} className="w-full" data-testid="button-save-probe">
                              {createProbeMutation.isPending ? 'Creating...' : 'Create Probe'}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
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
                    {filteredProbes.map((probe: any) => (
                      <div key={probe.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg gap-4" data-testid={`probe-item-${probe.id}`}>
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${probe.isActive ? 'bg-secondary' : 'bg-muted'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-foreground truncate">{probe.name}</div>
                            <div className="text-sm text-muted-foreground truncate">{probe.url}</div>
                            <div className="text-xs text-muted-foreground mt-1">{probe.description}</div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="capitalize">{probe.category}</Badge>
                            {getTypeBadge(probe.type)}
                            <Badge variant="outline">{probe.checkInterval}s</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" data-testid={`button-edit-probe-${probe.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-delete-probe-${probe.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
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
                <DialogContent>
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
              <CardContent className="p-6">
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
                        <div className="flex items-center gap-2">
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
                  <DialogContent>
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
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <Input placeholder="New York, USA" {...field} data-testid="input-gateway-location" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={gatewayForm.control}
                          name="ipAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IP Address (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="192.168.1.100" {...field} data-testid="input-gateway-ip" />
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
              <CardContent className="p-6">
                {!Array.isArray(gateways) || gateways.length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No gateways available</h3>
                    <p className="text-muted-foreground">Gateways execute your monitoring probes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gateways.map((gateway: any) => (
                      <div key={gateway.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg gap-4" data-testid={`gateway-item-${gateway.id}`}>
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${gateway.status === 'active' ? 'bg-secondary' : 'bg-destructive'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-foreground truncate">{gateway.name}</div>
                            <div className="text-sm text-muted-foreground truncate">{gateway.location}</div>
                            {gateway.ipAddress && (
                              <div className="text-xs text-muted-foreground">{gateway.ipAddress}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline">
                              {gateway.probeCount} probes
                            </Badge>
                            <Badge variant={gateway.status === 'active' ? "secondary" : "destructive"}>
                              {gateway.status === 'active' ? 'Online' : 'Offline'}
                            </Badge>
                          </div>
                          {gateway.lastHeartbeat && (
                            <span className="text-xs text-muted-foreground">
                              Last seen: {new Date(gateway.lastHeartbeat).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
