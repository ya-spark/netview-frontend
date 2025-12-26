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
import { Plus, Search, Settings, Mail, User as UserIcon, Edit, Trash2, Crown, Shield, Eye, UserCog, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { UserApiService } from '@/services/userApi';
import { logger } from '@/lib/logger';
import type { User, UserInvitationCreate, UserUpdate } from '@/types/user';

// Schema for creating invitation (matches API request format with snake_case)
const invitationCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['SuperAdmin', 'Owner', 'Admin', 'Editor', 'Viewer']),
  is_active: z.boolean().optional().default(true),
});

// Schema for updating user
const userUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['SuperAdmin', 'Owner', 'Admin', 'Editor', 'Viewer']).optional(),
  is_active: z.boolean().optional(),
});

type InvitationCreateForm = z.infer<typeof invitationCreateSchema>;
type UserUpdateForm = z.infer<typeof userUpdateSchema>;

export default function Users() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Check if user can manage users (only Owner role per API requirements)
  const canManageUsers = user?.role === 'Owner';

  useEffect(() => {
    logger.debug('Users page initialized', {
      component: 'Users',
      userId: user?.id,
      canManage: canManageUsers,
    });
  }, [user?.id, canManageUsers]);

  // Query to fetch invitations
  const {
    data: invitationsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invitations', user?.email, user?.tenantId],
    queryFn: async () => {
      if (!user?.email || !user?.tenantId) {
        throw new Error('User email and tenant ID are required');
      }
      logger.debug('Fetching invitations', {
        component: 'Users',
        action: 'list_invitations',
        userId: user.id,
        tenantId: user.tenantId,
      });
      const result = await UserApiService.listInvitations(user.email, user.tenantId);
      logger.info('Invitations loaded', {
        component: 'Users',
        action: 'list_invitations',
        invitationCount: result?.data?.length || 0,
      });
      return result;
    },
    enabled: !!user?.tenantId && canManageUsers,
  });

  const invitations = invitationsResponse?.data || [];
  const filteredInvitations = invitations.filter((invitation) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (invitation.firstName?.toLowerCase().includes(searchLower) ?? false) ||
      (invitation.lastName?.toLowerCase().includes(searchLower) ?? false) ||
      invitation.email.toLowerCase().includes(searchLower)
    );
  });

  // Create invitation form
  const createForm = useForm<InvitationCreateForm>({
    resolver: zodResolver(invitationCreateSchema),
    defaultValues: {
      email: '',
      role: 'Viewer',
      is_active: true,
    },
  });

  // Update user form
  const updateForm = useForm<UserUpdateForm>({
    resolver: zodResolver(userUpdateSchema),
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (data: InvitationCreateForm) => {
      if (!user?.email || !user?.tenantId) {
        throw new Error('User email and tenant ID are required');
      }
      const createData: UserInvitationCreate = {
        email: data.email,
        role: data.role,
        is_active: data.is_active,
      };
      logger.info('Creating invitation', {
        component: 'Users',
        action: 'create_invitation',
        invitationEmail: data.email,
        role: data.role,
        userId: user.id,
      });
      return UserApiService.createInvitation(createData, user.email, user.tenantId);
    },
    onSuccess: (response) => {
      logger.info('Invitation created successfully', {
        component: 'Users',
        action: 'create_invitation',
        invitationId: response?.data?.id,
        userId: user?.id,
      });
      const toastResult = toast({ 
        title: 'Success', 
        description: 'User invited successfully'
      });
      // Auto-dismiss toast after 2 seconds
      setTimeout(() => {
        toastResult.dismiss();
      }, 2000);
      createForm.reset();
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to create invitation', err, {
        component: 'Users',
        action: 'create_invitation',
        userId: user?.id,
      });
      const errorMessage = error.message || 'Failed to invite user';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });

  // Update invitation mutation
  const updateInvitationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UserUpdateForm }) => {
      if (!user?.email || !user?.tenantId) {
        throw new Error('User email and tenant ID are required');
      }
      const updateData: UserUpdate = {};
      if (data.first_name !== undefined && data.first_name !== '') updateData.first_name = data.first_name;
      if (data.last_name !== undefined && data.last_name !== '') updateData.last_name = data.last_name;
      if (data.email !== undefined && data.email !== '') updateData.email = data.email;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      logger.info('Updating invitation', {
        component: 'Users',
        action: 'update_invitation',
        invitationId: id,
        userId: user.id,
      });
      return UserApiService.updateInvitation(id, updateData, user.email, user.tenantId);
    },
    onSuccess: () => {
      logger.info('Invitation updated successfully', {
        component: 'Users',
        action: 'update_invitation',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'User updated successfully' });
      setEditDialogOpen(false);
      setSelectedUser(null);
      updateForm.reset();
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to update invitation', err, {
        component: 'Users',
        action: 'update_invitation',
        userId: user?.id,
      });
      const errorMessage = error.message || 'Failed to update user';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.email || !user?.tenantId) {
        throw new Error('User email and tenant ID are required');
      }
      logger.info('Deleting invitation', {
        component: 'Users',
        action: 'delete_invitation',
        invitationId: id,
        userId: user.id,
      });
      return UserApiService.deleteInvitation(id, user.email, user.tenantId);
    },
    onSuccess: () => {
      logger.info('Invitation deleted successfully', {
        component: 'Users',
        action: 'delete_invitation',
        userId: user?.id,
      });
      toast({ title: 'Success', description: 'User removed successfully' });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (error: any) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to delete invitation', err, {
        component: 'Users',
        action: 'delete_invitation',
        userId: user?.id,
      });
      const errorMessage = error.message || 'Failed to remove user';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });

  // Handle edit button click
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    updateForm.reset({
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      email: user.email,
      role: user.role,
      is_active: user.isActive,
    });
    setEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (selectedUser) {
      deleteInvitationMutation.mutate(selectedUser.id);
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
        return <UserIcon className="w-4 h-4" />;
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
  if (user && !canManageUsers) {
    return (
      <Layout>
        <div className="p-3 sm:p-4 lg:p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                Only Owners can manage users for this tenant.
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
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">Users</h1>
          <p className="text-muted-foreground">Manage team members and their access levels</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                    data-testid="input-search-users"
                  />
                </div>
              </div>
              {canManageUsers && (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-invite-user">
                      <Plus className="w-4 h-4 mr-2" />
                      Invite User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Invite New User</DialogTitle>
                    </DialogHeader>
                    <Form {...createForm}>
                      <form onSubmit={createForm.handleSubmit((data) => createInvitationMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={createForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="user@company.com" {...field} data-testid="input-user-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-user-role">
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
                        <Button type="submit" disabled={createInvitationMutation.isPending} className="w-full" data-testid="button-send-invitation">
                          {createInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
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
            <CardTitle>Team Members ({filteredInvitations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Error loading users</h3>
                <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
                <Button onClick={() => refetch()} variant="outline">
                  Retry
                </Button>
              </div>
            ) : filteredInvitations.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'Invite team members to start collaborating'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border border-border rounded-lg" data-testid={`user-item-${invitation.id}`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        invitation.isActive ? 'bg-secondary/20' : 'bg-muted'
                      }`}>
                        <UserIcon className={`w-5 h-5 ${invitation.isActive ? 'text-secondary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {invitation.firstName || invitation.lastName 
                            ? `${invitation.firstName || ''} ${invitation.lastName || ''}`.trim()
                            : 'No name'}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center space-x-2">
                          <Mail className="w-3 h-3" />
                          <span>{invitation.email}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Created {new Date(invitation.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getRoleBadge(invitation.role)}
                      {invitation.status && (
                        <Badge 
                          variant={
                            invitation.status === 'accepted' 
                              ? 'default' 
                              : invitation.status === 'invited' 
                              ? 'secondary' 
                              : 'outline'
                          }
                        >
                          {invitation.status === 'accepted' 
                            ? 'Accepted' 
                            : invitation.status === 'invited' 
                            ? 'Invited' 
                            : invitation.status === 'rejected'
                            ? 'Rejected'
                            : 'Unknown'}
                        </Badge>
                      )}
                      <Badge variant={invitation.isActive ? "secondary" : "outline"}>
                        {invitation.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {canManageUsers && (
                        <div className="flex items-center space-x-1">
                          {invitation.status === 'invited' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                // Resend invitation - create a new one (this will generate a new token)
                                createInvitationMutation.mutate({
                                  email: invitation.email,
                                  role: invitation.role,
                                  is_active: true,
                                });
                                toast({
                                  title: 'Invitation resent',
                                  description: `A new invitation has been sent to ${invitation.email}`,
                                });
                              }}
                              data-testid={`button-resend-invitation-${invitation.id}`}
                              title="Resend Invitation"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditClick(invitation)}
                            data-testid={`button-edit-collaborator-${invitation.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteClick(invitation)}
                            data-testid={`button-remove-collaborator-${invitation.id}`}
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
                if (selectedUser) {
                  updateInvitationMutation.mutate({ id: selectedUser.id, data });
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
                  <Button type="submit" disabled={updateInvitationMutation.isPending}>
                    {updateInvitationMutation.isPending ? 'Saving...' : 'Save Changes'}
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
                Are you sure you want to delete {selectedUser?.firstName || selectedUser?.lastName 
                  ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                  : selectedUser?.email}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteInvitationMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteInvitationMutation.isPending ? 'Deleting...' : 'Delete'}
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
