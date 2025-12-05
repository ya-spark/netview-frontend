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
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Filter, Settings, Globe, Trash2, Edit, Key, Download, RefreshCw, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { GatewayApiService, GatewayUtils } from '@/services/gatewayApi';
import { ProbeApiService, ProbeUtils } from '@/services/probeApi';
import { NotificationGroupApiService } from '@/services/notificationApi';
import { ProbeTypeSelectionDialog } from '@/components/probes/ProbeTypeSelectionDialog';
import { ProbeConfigurationDialog } from '@/components/probes/ProbeConfigurationDialog';
import { ProbeEditDialog } from '@/components/probes/ProbeEditDialog';
import type { GatewayResponse } from '@/types/gateway';
import type { Probe, ProbeCreate, ProbeCategory, ProbeType } from '@/types/probe';
import type { NotificationGroup, NotificationGroupCreate } from '@/types/notification';

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
  emails: z.string().min(1, 'At least one email is required').refine(
    (val) => {
      const emailArray = val.split(',').map(e => e.trim()).filter(e => e.length > 0);
      return emailArray.length > 0 && emailArray.every(email => z.string().email().safeParse(email).success);
    },
    { message: 'Must provide at least one valid email address' }
  ),
  alert_threshold: z.number().min(1).default(1),
  is_active: z.boolean().default(true),
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
    const hash = window.location.hash ? window.location.hash.substring(1) : 'gateways';
      logger.debug('Manage page initialized', {
      component: 'Manage',
      initialHash: hash,
      userId: user?.id,
    });
    return hash;
  });

  // Create Probe Dialog State
  const [createProbeDialogOpen, setCreateProbeDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
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
  
  // Edit Notification Group Dialog State
  const [editNotificationDialogOpen, setEditNotificationDialogOpen] = useState(false);
  const [editingNotificationGroup, setEditingNotificationGroup] = useState<NotificationGroup | null>(null);
  
  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash ? window.location.hash.substring(1) : 'gateways';
      logger.debug('Hash changed in Manage page', {
        component: 'Manage',
        previousHash: currentHash,
        newHash,
        userId: user?.id,
      });
      setCurrentHash(newHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Also listen for initial load in case hash is set
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [currentHash, user?.id]);
  
  const [location] = useLocation();
  const hash = currentHash;

  const { data: probes, refetch: refetchProbes } = useQuery({
    queryKey: ['/api/probes'],
    enabled: !!user && hash === 'probes',
    queryFn: async () => {
      logger.debug('Fetching probes', {
        component: 'Manage',
        hash,
        userId: user?.id,
      });
      const result = await ProbeApiService.listProbes();
      logger.info('Probes loaded', {
        component: 'Manage',
        probeCount: result?.data?.length || 0,
        userId: user?.id,
      });
      return result;
    },
  });

  const { data: notificationGroupsResponse, refetch: refetchNotificationGroups } = useQuery({
    queryKey: ['/api/notifications/groups'],
    enabled: !!user && (hash === 'notifications' || hash === 'probes'),
    queryFn: async () => {
      logger.debug('Fetching notification groups', {
        component: 'Manage',
        hash,
        userId: user?.id,
      });
      const result = await NotificationGroupApiService.listGroups();
      logger.info('Notification groups loaded', {
        component: 'Manage',
        groupCount: result?.data?.length || 0,
        userId: user?.id,
      });
      return result;
    },
  });
  
  const notificationGroups = notificationGroupsResponse?.data || [];

  // Query for all gateways (includes both tenant-specific and shared gateways)
  const gatewaysQueryEnabled = !!user && (hash === 'gateways' || hash === 'probes');
  const { data: gateways, refetch: refetchGateways, error: gatewaysError, isLoading: gatewaysLoading } = useQuery({
    queryKey: ['/api/gateways'],
    enabled: gatewaysQueryEnabled, // Load gateways when viewing probes too
    queryFn: async () => {
      logger.debug('Fetching gateways', {
        component: 'Manage',
        hash,
        userId: user?.id,
        enabled: gatewaysQueryEnabled,
      });
      const result = await GatewayApiService.listGateways();
      logger.info('Gateways loaded', {
        component: 'Manage',
        gatewayCount: result?.data?.length || 0,
        userId: user?.id,
      }, result);
      return result;
    },
  });

  // Log when gateways query is enabled/disabled
  useEffect(() => {
    logger.debug('Gateways query state', {
      component: 'Manage',
      enabled: gatewaysQueryEnabled,
      hasUser: !!user,
      hash,
      userId: user?.id,
    });
  }, [gatewaysQueryEnabled, user, hash]);

  // Log gateway errors
  useEffect(() => {
    if (gatewaysError) {
      const error = gatewaysError instanceof Error ? gatewaysError : new Error(String(gatewaysError));
      logger.error('Error loading gateways', error, {
        component: 'Manage',
        userId: user?.id,
      });
    }
  }, [gatewaysError, user?.id]);

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
      alert_threshold: 1,
      is_active: true,
    },
  });
  
  const editNotificationForm = useForm<z.infer<typeof notificationGroupSchema>>({
    resolver: zodResolver(notificationGroupSchema),
    defaultValues: {
      name: '',
      emails: '',
      alert_threshold: 1,
      is_active: true,
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
      logger.info('Creating probe', {
        component: 'Manage',
        action: 'create_probe',
        probeName: data.name,
        probeType: data.type,
        userId: user?.id,
      });
      return await ProbeApiService.createProbe(data);
    },
    onSuccess: (response) => {
      logger.info('Probe created successfully', {
        component: 'Manage',
        action: 'create_probe',
        probeId: response?.data?.id,
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Probe created successfully' });
      refetchProbes();
      probeForm.reset();
      setCreateProbeDialogOpen(false);
      setConfigDialogOpen(false);
      setSelectedCategory('');
      setSelectedType('');
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create probe', err, {
        component: 'Manage',
        action: 'create_probe',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateProbeMutation = useMutation({
    mutationFn: async ({ probeId, data }: { probeId: string; data: Partial<ProbeCreate> }) => {
      logger.info('Updating probe', {
        component: 'Manage',
        action: 'update_probe',
        probeId,
        userId: user?.id,
      });
      return await ProbeApiService.updateProbe(probeId, data);
    },
    onSuccess: () => {
      logger.info('Probe updated successfully', {
        component: 'Manage',
        action: 'update_probe',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Probe updated successfully' });
      refetchProbes();
      setEditProbeDialogOpen(false);
      setEditingProbe(null);
      probeForm.reset();
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to update probe', err, {
        component: 'Manage',
        action: 'update_probe',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProbeMutation = useMutation({
    mutationFn: async (probeId: string) => {
      logger.info('Deleting probe', {
        component: 'Manage',
        action: 'delete_probe',
        probeId,
        userId: user?.id,
      });
      return await ProbeApiService.deleteProbe(probeId);
    },
    onSuccess: () => {
      logger.info('Probe deleted successfully', {
        component: 'Manage',
        action: 'delete_probe',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Probe deleted successfully' });
      refetchProbes();
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to delete probe', err, {
        component: 'Manage',
        action: 'delete_probe',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });


  const createNotificationGroupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationGroupSchema>) => {
      const emailArray = data.emails.split(',').map(email => email.trim()).filter(e => e.length > 0);
      const createData: NotificationGroupCreate = {
        name: data.name,
        emails: emailArray,
        alert_threshold: data.alert_threshold,
        is_active: data.is_active,
      };
      logger.info('Creating notification group', {
        component: 'Manage',
        action: 'create_notification_group',
        groupName: data.name,
        emailCount: emailArray.length,
        userId: user?.id,
      });
      return await NotificationGroupApiService.createGroup(createData);
    },
    onSuccess: (response) => {
      logger.info('Notification group created successfully', {
        component: 'Manage',
        action: 'create_notification_group',
        groupId: response?.data?.id,
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Notification group created successfully' });
      refetchNotificationGroups();
      notificationForm.reset();
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create notification group', err, {
        component: 'Manage',
        action: 'create_notification_group',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateNotificationGroupMutation = useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: Partial<z.infer<typeof notificationGroupSchema>> }) => {
      const updateData: { name?: string; emails?: string[]; alert_threshold?: number; is_active?: boolean } = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.emails !== undefined) {
        updateData.emails = data.emails.split(',').map(email => email.trim()).filter(e => e.length > 0);
      }
      if (data.alert_threshold !== undefined) updateData.alert_threshold = data.alert_threshold;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      logger.info('Updating notification group', {
        component: 'Manage',
        action: 'update_notification_group',
        groupId,
        userId: user?.id,
      });
      return await NotificationGroupApiService.updateGroup(groupId, updateData);
    },
    onSuccess: () => {
      logger.info('Notification group updated successfully', {
        component: 'Manage',
        action: 'update_notification_group',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Notification group updated successfully' });
      refetchNotificationGroups();
      setEditNotificationDialogOpen(false);
      setEditingNotificationGroup(null);
      editNotificationForm.reset();
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to update notification group', err, {
        component: 'Manage',
        action: 'update_notification_group',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteNotificationGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      logger.info('Deleting notification group', {
        component: 'Manage',
        action: 'delete_notification_group',
        groupId,
        userId: user?.id,
      });
      return await NotificationGroupApiService.deleteGroup(groupId);
    },
    onSuccess: () => {
      logger.info('Notification group deleted successfully', {
        component: 'Manage',
        action: 'delete_notification_group',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Notification group deleted successfully' });
      refetchNotificationGroups();
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to delete notification group', err, {
        component: 'Manage',
        action: 'delete_notification_group',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEditNotificationGroup = (group: NotificationGroup) => {
    setEditingNotificationGroup(group);
    editNotificationForm.reset({
      name: group.name,
      emails: group.emails.join(', '),
      alert_threshold: group.alert_threshold,
      is_active: group.is_active,
    });
    setEditNotificationDialogOpen(true);
  };

  const handleDeleteNotificationGroup = (groupId: string) => {
    if (confirm('Are you sure you want to delete this notification group?')) {
      deleteNotificationGroupMutation.mutate(groupId);
    }
  };

  const createGatewayMutation = useMutation({
    mutationFn: async (data: z.infer<typeof gatewaySchema>) => {
      logger.info('Creating gateway', {
        component: 'Manage',
        action: 'create_gateway',
        gatewayName: data.name,
        gatewayType: data.type,
        userId: user?.id,
      });
      return await GatewayApiService.createGateway(data);
    },
    onSuccess: (response) => {
      logger.info('Gateway created successfully', {
        component: 'Manage',
        action: 'create_gateway',
        gatewayId: response?.data?.id,
        userId: user?.id,
      });
      toast({ 
        title: 'Success', 
        description: response.message || 'Gateway created successfully',
        duration: 2000
      });
      refetchGateways();
      gatewayForm.reset();
      
      // Show registration key dialog if gateway was created
      if (response.data) {
        setSelectedGateway(response.data);
        // Set registration key from response if available
        if (response.registration_key) {
          setRegistrationKey(response.registration_key);
        }
        setKeyCopied(false);
        setRegistrationKeyDialogOpen(true);
      }
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create gateway', err, {
        component: 'Manage',
        action: 'create_gateway',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: async (gatewayId: string) => {
      logger.info('Regenerating gateway registration key', {
        component: 'Manage',
        action: 'regenerate_gateway_key',
        gatewayId,
        userId: user?.id,
      });
      return await GatewayApiService.regenerateRegistrationKey(gatewayId);
    },
    onSuccess: (response) => {
      logger.info('Gateway registration key regenerated successfully', {
        component: 'Manage',
        action: 'regenerate_gateway_key',
        gatewayId: selectedGateway?.id,
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Registration key regenerated successfully' });
      // The response now contains the registration key string directly
      setRegistrationKey(response.data.registration_key);
      setKeyCopied(false);
      setRegistrationKeyDialogOpen(true);
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to regenerate gateway registration key', err, {
        component: 'Manage',
        action: 'regenerate_gateway_key',
        gatewayId: selectedGateway?.id,
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const downloadKeyMutation = useMutation({
    mutationFn: async (gatewayId: string) => {
      logger.info('Downloading gateway registration key', {
        component: 'Manage',
        action: 'download_gateway_key',
        gatewayId,
        userId: user?.id,
      });
      return await GatewayApiService.downloadRegistrationKey(gatewayId);
    },
    onSuccess: (keyContent) => {
      logger.info('Gateway registration key downloaded successfully', {
        component: 'Manage',
        action: 'download_gateway_key',
        gatewayId: selectedGateway?.id,
        userId: user?.id,
      });
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
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to download gateway registration key', err, {
        component: 'Manage',
        action: 'download_gateway_key',
        gatewayId: selectedGateway?.id,
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateGatewayMutation = useMutation({
    mutationFn: async ({ gatewayId, data }: { gatewayId: string; data: z.infer<typeof gatewaySchema> }) => {
      logger.info('Updating gateway', {
        component: 'Manage',
        action: 'update_gateway',
        gatewayId,
        gatewayName: data.name,
        userId: user?.id,
      });
      return await GatewayApiService.updateGateway(gatewayId, data);
    },
    onSuccess: () => {
      logger.info('Gateway updated successfully', {
        component: 'Manage',
        action: 'update_gateway',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Gateway updated successfully' });
      refetchGateways();
      setEditGatewayDialogOpen(false);
      setEditingGateway(null);
      gatewayForm.reset();
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to update gateway', err, {
        component: 'Manage',
        action: 'update_gateway',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteGatewayMutation = useMutation({
    mutationFn: async (gatewayId: string) => {
      logger.info('Deleting gateway', {
        component: 'Manage',
        action: 'delete_gateway',
        gatewayId,
        userId: user?.id,
      });
      return await GatewayApiService.deleteGateway(gatewayId);
    },
    onSuccess: () => {
      logger.info('Gateway deleted successfully', {
        component: 'Manage',
        action: 'delete_gateway',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Gateway deleted successfully' });
      refetchGateways();
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to delete gateway', err, {
        component: 'Manage',
        action: 'delete_gateway',
        userId: user?.id,
      });
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });


  const filteredProbes = probes?.data 
    ? probes.data.filter((probe: Probe) =>
        probe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ProbeUtils.getConfigDisplay(probe).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const filteredGateways = gateways?.data 
    ? gateways.data.filter((gateway: GatewayResponse) =>
        gateway.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (gateway.location && gateway.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (gateway.ip_address && gateway.ip_address.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Manage</h1>
          <p className="text-muted-foreground">Configure probes, notification groups, and gateways</p>
        </div>

        {/* Show content based on URL hash */}
        {hash === 'probes' && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Probes ({filteredProbes.length})</CardTitle>
                <Button 
                  data-testid="button-create-probe" 
                  className="w-full sm:w-auto"
                  onClick={() => setCreateProbeDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Probe
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 sm:pt-1 lg:px-6 lg:pb-6 lg:pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
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
              </div>
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
        )}
        
        {hash === 'notifications' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-medium">Notification Groups</h3>
              {(user?.role === 'SuperAdmin' || user?.role === 'Owner' || user?.role === 'Admin') && (
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
                        name="alert_threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alert Threshold</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} value={field.value || 1} onChange={e => field.onChange(parseInt(e.target.value) || 1)} data-testid="input-threshold" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationForm.control}
                        name="is_active"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Active</FormLabel>
                              <p className="text-sm text-muted-foreground">Enable this notification group</p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-is-active" />
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
              )}
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
                    {notificationGroups.map((group: NotificationGroup) => (
                      <div key={group.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg gap-4" data-testid={`notification-item-${group.id}`}>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground">{group.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            <span>{group.emails?.length || 0} {group.emails?.length === 1 ? 'email' : 'emails'}</span>
                          </div>
                          {group.emails && group.emails.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {group.emails.slice(0, 3).join(', ')}
                              {group.emails.length > 3 && ` +${group.emails.length - 3} more`}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">Threshold: {group.alert_threshold} {group.alert_threshold === 1 ? 'failure' : 'failures'}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={group.is_active ? "secondary" : "outline"}>
                            {group.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {(user?.role === 'SuperAdmin' || user?.role === 'Owner' || user?.role === 'Admin') && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                data-testid={`button-edit-notification-${group.id}`}
                                onClick={() => handleEditNotificationGroup(group)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                data-testid={`button-delete-notification-${group.id}`}
                                onClick={() => handleDeleteNotificationGroup(group.id)}
                                disabled={deleteNotificationGroupMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Notification Group Dialog */}
            <Dialog open={editNotificationDialogOpen} onOpenChange={setEditNotificationDialogOpen}>
              <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Notification Group</DialogTitle>
                </DialogHeader>
                <Form {...editNotificationForm}>
                  <form onSubmit={editNotificationForm.handleSubmit((data) => {
                    if (editingNotificationGroup) {
                      updateNotificationGroupMutation.mutate({ groupId: editingNotificationGroup.id, data });
                    }
                  })} className="space-y-4">
                    <FormField
                      control={editNotificationForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group Name</FormLabel>
                          <FormControl>
                            <Input placeholder="DevOps Team" {...field} data-testid="input-edit-group-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editNotificationForm.control}
                      name="emails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Addresses</FormLabel>
                          <FormControl>
                            <Textarea placeholder="admin@example.com, devops@example.com" {...field} data-testid="textarea-edit-emails" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editNotificationForm.control}
                      name="alert_threshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alert Threshold</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} value={field.value || 1} onChange={e => field.onChange(parseInt(e.target.value) || 1)} data-testid="input-edit-threshold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editNotificationForm.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Active</FormLabel>
                            <p className="text-sm text-muted-foreground">Enable this notification group</p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-edit-is-active" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setEditNotificationDialogOpen(false);
                          setEditingNotificationGroup(null);
                          editNotificationForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateNotificationGroupMutation.isPending} 
                        className="flex-1" 
                        data-testid="button-update-notification"
                      >
                        {updateNotificationGroupMutation.isPending ? 'Updating...' : 'Update Group'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        {hash === 'gateways' && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Gateways ({filteredGateways.length})</CardTitle>
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
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 sm:pt-1 lg:px-6 lg:pb-6 lg:pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search gateways..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full"
                      data-testid="input-search-gateways"
                    />
                  </div>
                  <Button variant="outline" size="icon" data-testid="button-filter-gateways" className="w-10 h-10 flex-shrink-0">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {filteredGateways.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No gateways available</h3>
                  <p className="text-muted-foreground">Gateways execute your monitoring probes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGateways.map((gateway: GatewayResponse) => {
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
      <ProbeEditDialog
        open={editProbeDialogOpen}
        onOpenChange={setEditProbeDialogOpen}
        probe={editingProbe}
        gateways={gateways}
        notificationGroups={notificationGroups}
        onSubmit={(data) => {
          if (editingProbe) {
            updateProbeMutation.mutate({ probeId: editingProbe.id, data });
          }
        }}
        isPending={updateProbeMutation.isPending}
      />

      {/* Create Probe Dialog - Category and Type Selection */}
      <ProbeTypeSelectionDialog
        open={createProbeDialogOpen}
        onOpenChange={(open) => {
          setCreateProbeDialogOpen(open);
          if (!open) {
            setSelectedCategory('');
            setSelectedType('');
          }
        }}
        selectedCategory={selectedCategory}
        selectedType={selectedType}
        probeCategories={probeCategories}
        filteredProbeTypes={filteredProbeTypes}
        typesLoading={typesLoading}
        typesError={typesError}
        onCategoryChange={handleCategoryChange}
        onTypeChange={setSelectedType}
        onNext={() => {
          setCreateProbeDialogOpen(false);
          setConfigDialogOpen(true);
        }}
      />

      {/* Configuration Dialog */}
      <ProbeConfigurationDialog
        open={configDialogOpen}
        onOpenChange={(open) => {
          setConfigDialogOpen(open);
          if (!open && !createProbeDialogOpen) {
            setSelectedCategory('');
            setSelectedType('');
          }
        }}
        selectedCategory={selectedCategory as ProbeCategory}
        selectedType={selectedType as ProbeType}
        gateways={gateways}
        notificationGroups={notificationGroups}
        onSubmit={(data) => {
          createProbeMutation.mutate(data);
        }}
        isPending={createProbeMutation.isPending}
        onBack={() => {
          setConfigDialogOpen(false);
          setCreateProbeDialogOpen(true);
        }}
      />
    </Layout>
  );
}
