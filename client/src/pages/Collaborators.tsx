import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Settings, Mail, User, Edit, Trash2, Crown, Shield, Eye, UserCog, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { CollaboratorApiService } from '@/services/collaboratorApi';
import { logger } from '@/lib/logger';
import type { Collaborator, CollaboratorCreate, CollaboratorUpdate } from '@/types/collaborator';

// Schema for creating collaborator (matches API request format with snake_case)
const collaboratorCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.enum(['SuperAdmin', 'Owner', 'Admin', 'Editor', 'Viewer']),
  is_active: z.boolean().optional().default(true),
});

// Schema for updating collaborator
const collaboratorUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['SuperAdmin', 'Owner', 'Admin', 'Editor', 'Viewer']).optional(),
  is_active: z.boolean().optional(),
});

type CollaboratorCreateForm = z.infer<typeof collaboratorCreateSchema>;
type CollaboratorUpdateForm = z.infer<typeof collaboratorUpdateSchema>;

export default function Collaborators() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  // Check if user can manage collaborators (only Owner role per API requirements)
  const canManageCollaborators = user?.role === 'Owner';

  useEffect(() => {
    logger.debug('Collaborators page initialized', {
      component: 'Collaborators',
      userId: user?.id,
      canManage: canManageCollaborators,
    });
  }, [user?.id, canManageCollaborators]);

  // Query to fetch collaborators
  const {
    data: collaboratorsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['collaborators', user?.email, user?.tenantId],
    queryFn: async () => {
      if (!user?.email || !user?.tenantId) {
        throw new Error('User email and tenant ID are required');
      }
      logger.debug('Fetching collaborators', {
        component: 'Collaborators',
        action: 'list_collaborators',
        userId: user.id,
        tenantId: user.tenantId,
      });
      const result = await CollaboratorApiService.listCollaborators(user.email, user.tenantId);
      logger.info('Collaborators loaded', {
        component: 'Collaborators',
        action: 'list_collaborators',
        collaboratorCount: result?.data?.length || 0,
      });
      return result;
    },
    enabled: !!user?.email && !!user?.tenantId && canManageCollaborators,
  });

  const collaborators = collaboratorsResponse?.data || [];
  const filteredCollaborators = collaborators.filter((collaborator) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (collaborator.firstName?.toLowerCase().includes(searchLower) ?? false) ||
      (collaborator.lastName?.toLowerCase().includes(searchLower) ?? false) ||
      collaborator.email.toLowerCase().includes(searchLower)
    );
  });

  // Create collaborator form
  const createForm = useForm<CollaboratorCreateForm>({
    resolver: zodResolver(collaboratorCreateSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      role: 'Viewer',
      is_active: true,
    },
  });

  // Update collaborator form
  const updateForm = useForm<CollaboratorUpdateForm>({
    resolver: zodResolver(collaboratorUpdateSchema),
  });

  // Create collaborator mutation
  const createCollaboratorMutation = useMutation({
    mutationFn: async (data: CollaboratorCreateForm) => {
      if (!user?.email || !user?.tenantId) {
        throw new Error('User email and tenant ID are required');
      }
      const createData: CollaboratorCreate = {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        is_active: data.is_active,
      };
      logger.info('Creating collaborator', {
        component: 'Collaborators',
        action: 'create_collaborator',
        collaboratorEmail: data.email,
        role: data.role,
        userId: user.id,
      });
      return CollaboratorApiService.createCollaborator(createData, user.email, user.tenantId);
    },
    onSuccess: (response) => {
      logger.info('Collaborator created successfully', {
        component: 'Collaborators',
        action: 'create_collaborator',
        collaboratorId: response?.data?.id,
        userId: user?.id,
      });
      const toastResult = toast({ 
        title: 'Success', 
        description: 'Collaborator invited successfully'
      });
      // Auto-dismiss toast after 2 seconds
      setTimeout(() => {
        toastResult.dismiss();
      }, 2000);
      createForm.reset();
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create collaborator', err, {
        component: 'Collaborators',
        action: 'create_collaborator',
        userId: user?.id,
      });
      const errorMessage = error.message || 'Failed to invite collaborator';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });

  // Update collaborator mutation
  const updateCollaboratorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CollaboratorUpdateForm }) => {
      if (!user?.email || !user?.tenantId) {
        throw new Error('User email and tenant ID are required');
      }
      const updateData: CollaboratorUpdate = {};
      if (data.first_name !== undefined && data.first_name !== '') updateData.first_name = data.first_name;
      if (data.last_name !== undefined && data.last_name !== '') updateData.last_name = data.last_name;
      if (data.email !== undefined && data.email !== '') updateData.email = data.email;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      logger.info('Updating collaborator', {
        component: 'Collaborators',
        action: 'update_collaborator',
        collaboratorId: id,
        userId: user.id,
      });
      return CollaboratorApiService.updateCollaborator(id, updateData, user.email, user.tenantId);
    },
    onSuccess: () => {
      logger.info('Collaborator updated successfully', {
        component: 'Collaborators',
        action: 'update_collaborator',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Collaborator updated successfully' });
      setEditDialogOpen(false);
      setSelectedCollaborator(null);
      updateForm.reset();
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to update collaborator', err, {
        component: 'Collaborators',
        action: 'update_collaborator',
        userId: user?.id,
      });
      const errorMessage = error.message || 'Failed to update collaborator';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });

  // Delete collaborator mutation
  const deleteCollaboratorMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.email || !user?.tenantId) {
        throw new Error('User email and tenant ID are required');
      }
      logger.info('Deleting collaborator', {
        component: 'Collaborators',
        action: 'delete_collaborator',
        collaboratorId: id,
        userId: user.id,
      });
      return CollaboratorApiService.deleteCollaborator(id, user.email, user.tenantId);
    },
    onSuccess: () => {
      logger.info('Collaborator deleted successfully', {
        component: 'Collaborators',
        action: 'delete_collaborator',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'Collaborator deleted successfully' });
      setDeleteDialogOpen(false);
      setSelectedCollaborator(null);
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to delete collaborator', err, {
        component: 'Collaborators',
        action: 'delete_collaborator',
        userId: user?.id,
      });
      const errorMessage = error.message || 'Failed to delete collaborator';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });

  // Handle edit button click
  const handleEditClick = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    updateForm.reset({
      first_name: collaborator.firstName || '',
      last_name: collaborator.lastName || '',
      email: collaborator.email,
      role: collaborator.role,
      is_active: collaborator.isActive,
    });
    setEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (selectedCollaborator) {
      deleteCollaboratorMutation.mutate(selectedCollaborator.id);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SuperAdmin':
        return <Crown className="w-4 h-4" />;
      case 'Owner':
        return <Crown className="w-4 h-4" />;
      case 'Admin':
        return <Shield className="w-4 h-4" />;
      case 'Editor':
        return <UserCog className="w-4 h-4" />;
      case 'Viewer':
        return <Eye className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      'SuperAdmin': 'bg-red-100 text-red-700 border-red-300',
      'Owner': 'bg-purple-100 text-purple-700 border-purple-300',
      'Admin': 'bg-blue-100 text-blue-700 border-blue-300',
      'Editor': 'bg-green-100 text-green-700 border-green-300',
      'Viewer': 'bg-gray-100 text-gray-700 border-gray-300',
    };
    
    return (
      <Badge className={colors[role as keyof typeof colors] || 'bg-muted text-muted-foreground'} variant="outline">
        <span className="flex items-center space-x-1">
          {getRoleIcon(role)}
          <span>{role}</span>
        </span>
      </Badge>
    );
  };

  // Show message if user is not Owner
  if (user && !canManageCollaborators) {
    return (
      <Layout>
        <div className="p-3 sm:p-4 lg:p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                Only Owners can manage collaborators for this tenant.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Collaborators</h1>
          <p className="text-muted-foreground">Manage team members and their access levels</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search collaborators..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                    data-testid="input-search-collaborators"
                  />
                </div>
              </div>
              {canManageCollaborators && (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-invite-collaborator">
                      <Plus className="w-4 h-4 mr-2" />
                      Invite Collaborator
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Invite New Collaborator</DialogTitle>
                    </DialogHeader>
                    <Form {...createForm}>
                      <form onSubmit={createForm.handleSubmit((data) => createCollaboratorMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={createForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="user@company.com" {...field} data-testid="input-collaborator-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={createForm.control}
                            name="first_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} data-testid="input-first-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={createForm.control}
                            name="last_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={createForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-collaborator-role">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {user?.tenantId === '-919' && user?.role === 'SuperAdmin' && <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>}
                                  {(user?.role === 'SuperAdmin' || user?.role === 'Owner') && <SelectItem value="Owner">Owner</SelectItem>}
                                  <SelectItem value="Admin">Admin</SelectItem>
                                  <SelectItem value="Editor">Editor</SelectItem>
                                  <SelectItem value="Viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={createCollaboratorMutation.isPending} className="w-full" data-testid="button-send-invitation">
                          {createCollaboratorMutation.isPending ? 'Sending...' : 'Send Invitation'}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Team Members ({filteredCollaborators.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading collaborators...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Error loading collaborators</h3>
                <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
                <Button onClick={() => refetch()} variant="outline">
                  Retry
                </Button>
              </div>
            ) : filteredCollaborators.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No collaborators found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'Invite team members to start collaborating'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCollaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`collaborator-item-${collaborator.id}`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        collaborator.isActive ? 'bg-secondary/20' : 'bg-muted'
                      }`}>
                        <User className={`w-5 h-5 ${collaborator.isActive ? 'text-secondary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {collaborator.firstName || collaborator.lastName 
                            ? `${collaborator.firstName || ''} ${collaborator.lastName || ''}`.trim()
                            : 'No name'}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center space-x-2">
                          <Mail className="w-3 h-3" />
                          <span>{collaborator.email}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Created {new Date(collaborator.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getRoleBadge(collaborator.role)}
                      <Badge variant={collaborator.isActive ? "secondary" : "outline"}>
                        {collaborator.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {canManageCollaborators && (
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditClick(collaborator)}
                            data-testid={`button-edit-collaborator-${collaborator.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteClick(collaborator)}
                            data-testid={`button-remove-collaborator-${collaborator.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Collaborator Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Collaborator</DialogTitle>
            </DialogHeader>
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit((data) => {
                if (selectedCollaborator) {
                  updateCollaboratorMutation.mutate({ id: selectedCollaborator.id, data });
                }
              })} className="space-y-4">
                <FormField
                  control={updateForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="user@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={updateForm.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={updateForm.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={updateForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {user?.tenantId === '-919' && user?.role === 'SuperAdmin' && <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>}
                          {(user?.role === 'SuperAdmin' || user?.role === 'Owner') && <SelectItem value="Owner">Owner</SelectItem>}
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Editor">Editor</SelectItem>
                          <SelectItem value="Viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateCollaboratorMutation.isPending}>
                    {updateCollaboratorMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Collaborator</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedCollaborator?.firstName || selectedCollaborator?.lastName 
                  ? `${selectedCollaborator.firstName || ''} ${selectedCollaborator.lastName || ''}`.trim()
                  : selectedCollaborator?.email}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteCollaboratorMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteCollaboratorMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Role Permissions Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {getRoleIcon('SuperAdmin')}
                  <span className="font-medium">SuperAdmin</span>
                </div>
                <p className="text-sm text-muted-foreground">Full system access and user management</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {getRoleIcon('Owner')}
                  <span className="font-medium">Owner</span>
                </div>
                <p className="text-sm text-muted-foreground">Full tenant access and billing management</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {getRoleIcon('Admin')}
                  <span className="font-medium">Admin</span>
                </div>
                <p className="text-sm text-muted-foreground">Manage probes, gateways, and notifications</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {getRoleIcon('Editor')}
                  <span className="font-medium">Editor</span>
                </div>
                <p className="text-sm text-muted-foreground">Create and modify probes</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {getRoleIcon('Viewer')}
                  <span className="font-medium">Viewer</span>
                </div>
                <p className="text-sm text-muted-foreground">Read-only access to monitoring data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
