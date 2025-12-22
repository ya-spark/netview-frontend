import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Trash2, Edit, FolderTree } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { ResourceGroupApiService } from '@/services/resourceGroupApi';
import type { ResourceGroup } from '@/types/resourceGroup';

const resourceGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export default function ResourceGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGroup, setEditingGroup] = useState<ResourceGroup | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const resourceGroupForm = useForm<z.infer<typeof resourceGroupSchema>>({
    resolver: zodResolver(resourceGroupSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const editResourceGroupForm = useForm<z.infer<typeof resourceGroupSchema>>({
    resolver: zodResolver(resourceGroupSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const { data: resourceGroups, isLoading: resourceGroupsLoading } = useQuery({
    queryKey: ['/api/resource-groups'],
    enabled: !!user,
    queryFn: async () => {
      return await ResourceGroupApiService.listResourceGroups();
    },
  });

  const filteredGroups = resourceGroups?.data?.filter((group: ResourceGroup) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const createResourceGroupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof resourceGroupSchema>) => {
      return await ResourceGroupApiService.createResourceGroup(data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Resource group created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/resource-groups'] });
      setCreateDialogOpen(false);
      resourceGroupForm.reset();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create resource group', variant: 'destructive' });
    },
  });

  const updateResourceGroupMutation = useMutation({
    mutationFn: async ({ groupId, data }: { groupId: string; data: z.infer<typeof resourceGroupSchema> }) => {
      return await ResourceGroupApiService.updateResourceGroup(groupId, data);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Resource group updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/resource-groups'] });
      setEditDialogOpen(false);
      setEditingGroup(null);
      editResourceGroupForm.reset();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update resource group', variant: 'destructive' });
    },
  });

  const deleteResourceGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return await ResourceGroupApiService.deleteResourceGroup(groupId);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Resource group deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/resource-groups'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete resource group', variant: 'destructive' });
    },
  });

  const handleEdit = (group: ResourceGroup) => {
    setEditingGroup(group);
    editResourceGroupForm.reset({
      name: group.name,
      description: group.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (group: ResourceGroup) => {
    if (confirm(`Are you sure you want to delete the resource group "${group.name}"?`)) {
      deleteResourceGroupMutation.mutate(group.id);
    }
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="w-5 h-5" />
                  Resource Groups
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage resource groups for cost segregation and billing
                </p>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Resource Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Resource Group</DialogTitle>
                  </DialogHeader>
                  <Form {...resourceGroupForm}>
                    <form onSubmit={resourceGroupForm.handleSubmit((data) => createResourceGroupMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={resourceGroupForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Production" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={resourceGroupForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Production environment resources" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createResourceGroupMutation.isPending} className="w-full">
                        {createResourceGroupMutation.isPending ? 'Creating...' : 'Create Resource Group'}
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
                  placeholder="Search resource groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {resourceGroupsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading resource groups...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8">
                <FolderTree className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No resource groups found</h3>
                <p className="text-muted-foreground">Create your first resource group to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map((group: ResourceGroup) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{group.name}</div>
                      {group.description && (
                        <div className="text-sm text-muted-foreground mt-1">{group.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(group)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(group)}
                        disabled={deleteResourceGroupMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Resource Group</DialogTitle>
            </DialogHeader>
            <Form {...editResourceGroupForm}>
              <form onSubmit={editResourceGroupForm.handleSubmit((data) => {
                if (editingGroup) {
                  updateResourceGroupMutation.mutate({ groupId: editingGroup.id, data });
                }
              })} className="space-y-4">
                <FormField
                  control={editResourceGroupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Production" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editResourceGroupForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Production environment resources" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={updateResourceGroupMutation.isPending} className="w-full">
                  {updateResourceGroupMutation.isPending ? 'Updating...' : 'Update Resource Group'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

