import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Trash2, Edit, FolderTree, Activity, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { ProbeGroupApiService } from '@/services/probeGroupApi';
import { ProbeApiService } from '@/services/probeApi';
import type { ProbeGroup } from '@/types/probeGroup';
import type { Probe } from '@/types/probe';

const probeGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export default function ProbeGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGroup, setEditingGroup] = useState<ProbeGroup | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [isGroupDetailRoute, groupParams] = useRoute('/manage/probe-groups/:groupId');

  const probeGroupForm = useForm<z.infer<typeof probeGroupSchema>>({
    resolver: zodResolver(probeGroupSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const editProbeGroupForm = useForm<z.infer<typeof probeGroupSchema>>({
    resolver: zodResolver(probeGroupSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const { data: probeGroups, isLoading: probeGroupsLoading } = useQuery({
    queryKey: ['/api/probe-groups'],
    queryFn: async () => {
      return await ProbeGroupApiService.listProbeGroups();
    },
  });

  const { data: probesInGroup, isLoading: probesLoading } = useQuery({
    queryKey: ['/api/probe-groups', selectedGroupId, 'probes'],
    enabled: !!selectedGroupId,
    queryFn: async () => {
      if (!selectedGroupId) return null;
      return await ProbeGroupApiService.getProbesByGroup(selectedGroupId);
    },
  });

  // Set selected group from route params
  useEffect(() => {
    if (isGroupDetailRoute && groupParams?.groupId) {
      setSelectedGroupId(groupParams.groupId);
    } else {
      setSelectedGroupId(null);
    }
  }, [isGroupDetailRoute, groupParams?.groupId]);

  const filteredGroups = probeGroups?.data?.filter((group: ProbeGroup) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const createProbeGroupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof probeGroupSchema>) => {
      return await ProbeGroupApiService.createProbeGroup(data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Probe group created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/probe-groups'] });
      setCreateDialogOpen(false);
      probeGroupForm.reset();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create probe group', variant: 'destructive' });
    },
  });

  const updateProbeGroupMutation = useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: z.infer<typeof probeGroupSchema> }) => {
      return await ProbeGroupApiService.updateProbeGroup(groupId, data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Probe group updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/probe-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/probes'] });
      setEditDialogOpen(false);
      setEditingGroup(null);
      editProbeGroupForm.reset();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update probe group', variant: 'destructive' });
    },
  });

  const deleteProbeGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return await ProbeGroupApiService.deleteProbeGroup(groupId);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Probe group deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/probe-groups'] });
      if (selectedGroupId === editingGroup?.id) {
        setSelectedGroupId(null);
        setLocation('/manage/probe-groups');
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete probe group', variant: 'destructive' });
    },
  });

  const handleEdit = (group: ProbeGroup) => {
    setEditingGroup(group);
    editProbeGroupForm.reset({
      name: group.name,
      description: group.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (group: ProbeGroup) => {
    if (confirm(`Are you sure you want to delete the probe group "${group.name}"?`)) {
      deleteProbeGroupMutation.mutate(group.id);
    }
  };

  const handleGroupClick = (group: ProbeGroup) => {
    setSelectedGroupId(group.id);
    setLocation(`/manage/probe-groups/${group.id}`);
  };

  const selectedGroup = selectedGroupId 
    ? probeGroups?.data?.find((g: ProbeGroup) => g.id === selectedGroupId)
    : null;

  if (selectedGroup && selectedGroupId) {
    // Show group detail view with probes
    return (
      <Layout>
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedGroupId(null);
                setLocation('/manage/probe-groups');
              }}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Probe Groups
            </Button>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FolderTree className="w-5 h-5" />
                      {selectedGroup.name}
                    </CardTitle>
                    {selectedGroup.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedGroup.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleEdit(selectedGroup)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDelete(selectedGroup)}
                      disabled={deleteProbeGroupMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-4">Probes in this Group</h3>
                  {probesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading probes...</p>
                    </div>
                  ) : !probesInGroup?.data || probesInGroup.data.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No probes in this group</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {probesInGroup.data.map((probe: Probe) => (
                        <div
                          key={probe.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => setLocation(`/manage/probes/${probe.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-foreground">{probe.name}</div>
                              <div className="text-sm text-muted-foreground">{probe.type}</div>
                            </div>
                          </div>
                          <Badge variant="outline">{probe.category}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Probe Group</DialogTitle>
              </DialogHeader>
              <Form {...editProbeGroupForm}>
                <form onSubmit={editProbeGroupForm.handleSubmit((data) => {
                  if (selectedGroup) {
                    updateProbeGroupMutation.mutate({ groupId: selectedGroup.id, data });
                  }
                })} className="space-y-4">
                  <FormField
                    control={editProbeGroupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Production Probes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editProbeGroupForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Production environment probes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={updateProbeGroupMutation.isPending} className="w-full">
                    {updateProbeGroupMutation.isPending ? 'Updating...' : 'Update Probe Group'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    );
  }

  // Show list view
  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="w-5 h-5" />
                  Probe Groups
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Organize probes into groups for better management
                </p>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Probe Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Probe Group</DialogTitle>
                  </DialogHeader>
                  <Form {...probeGroupForm}>
                    <form onSubmit={probeGroupForm.handleSubmit((data) => createProbeGroupMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={probeGroupForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Production Probes" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={probeGroupForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Production environment probes" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createProbeGroupMutation.isPending} className="w-full">
                        {createProbeGroupMutation.isPending ? 'Creating...' : 'Create Probe Group'}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search probe groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {probeGroupsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading probe groups...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8">
                <FolderTree className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No probe groups found</h3>
                <p className="text-muted-foreground">Create your first probe group to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map((group: ProbeGroup) => {
                  // Count probes in this group (would need to fetch or calculate)
                  const probeCount = 0; // TODO: Calculate from probes list
                  return (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleGroupClick(group)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{group.name}</div>
                        {group.description && (
                          <div className="text-sm text-muted-foreground mt-1">{group.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{probeCount} probe{probeCount !== 1 ? 's' : ''}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(group);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(group);
                          }}
                          disabled={deleteProbeGroupMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Probe Group</DialogTitle>
            </DialogHeader>
            <Form {...editProbeGroupForm}>
              <form onSubmit={editProbeGroupForm.handleSubmit((data) => {
                if (editingGroup) {
                  updateProbeGroupMutation.mutate({ groupId: editingGroup.id, data });
                }
              })} className="space-y-4">
                <FormField
                  control={editProbeGroupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Production Probes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editProbeGroupForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Production environment probes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={updateProbeGroupMutation.isPending} className="w-full">
                  {updateProbeGroupMutation.isPending ? 'Updating...' : 'Update Probe Group'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

