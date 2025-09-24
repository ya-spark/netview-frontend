import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Settings, Mail, User, Edit, Trash2, Crown, Shield, Eye, UserCog, Headphones } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

const collaboratorSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['SuperAdmin', 'Owner', 'Admin', 'Editor', 'Helpdesk', 'Viewer']),
});

// Dummy collaborators data
const dummyCollaborators = [
  {
    id: '1',
    email: 'admin@company.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'Admin',
    isActive: true,
    company: 'Monitoring Corp',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    email: 'editor@company.com',
    firstName: 'Jane',
    lastName: 'Editor',
    role: 'Editor',
    isActive: true,
    company: 'Monitoring Corp',
    createdAt: '2024-02-20T14:15:00Z',
  },
  {
    id: '3',
    email: 'viewer@company.com',
    firstName: 'John',
    lastName: 'Viewer',
    role: 'Viewer',
    isActive: false,
    company: 'Monitoring Corp',
    createdAt: '2024-03-05T09:45:00Z',
  },
  {
    id: '4',
    email: 'helpdesk@company.com',
    firstName: 'Sarah',
    lastName: 'Support',
    role: 'Helpdesk',
    isActive: true,
    company: 'Monitoring Corp',
    createdAt: '2024-03-10T16:20:00Z',
  },
];

export default function Collaborators() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const collaboratorForm = useForm<z.infer<typeof collaboratorSchema>>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: 'Viewer',
    },
  });

  const createCollaboratorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof collaboratorSchema>) => {
      const response = await apiRequest('POST', '/api/collaborators', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Collaborator invited successfully' });
      collaboratorForm.reset();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const filteredCollaborators = dummyCollaborators.filter((collaborator) =>
    collaborator.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collaborator.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collaborator.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      case 'Helpdesk':
        return <Headphones className="w-4 h-4" />;
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
      'Helpdesk': 'bg-yellow-100 text-yellow-700 border-yellow-300',
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

  const canManageCollaborators = user?.role === 'SuperAdmin' || user?.role === 'Owner' || user?.role === 'Admin';

  return (
    <Layout>
      <div className="p-6 overflow-y-auto">
        <div className="mb-8">
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
                <Dialog>
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
                    <Form {...collaboratorForm}>
                      <form onSubmit={collaboratorForm.handleSubmit((data) => createCollaboratorMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={collaboratorForm.control}
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
                            control={collaboratorForm.control}
                            name="firstName"
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
                            control={collaboratorForm.control}
                            name="lastName"
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
                          control={collaboratorForm.control}
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
                                  {user?.role === 'SuperAdmin' && <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>}
                                  {(user?.role === 'SuperAdmin' || user?.role === 'Owner') && <SelectItem value="Owner">Owner</SelectItem>}
                                  <SelectItem value="Admin">Admin</SelectItem>
                                  <SelectItem value="Editor">Editor</SelectItem>
                                  <SelectItem value="Helpdesk">Helpdesk</SelectItem>
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
            {filteredCollaborators.length === 0 ? (
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
                        <div className="font-medium text-foreground">{collaborator.firstName} {collaborator.lastName}</div>
                        <div className="text-sm text-muted-foreground flex items-center space-x-2">
                          <Mail className="w-3 h-3" />
                          <span>{collaborator.email}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Joined {new Date(collaborator.createdAt).toLocaleDateString()}
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
                          <Button variant="ghost" size="sm" data-testid={`button-edit-collaborator-${collaborator.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-remove-collaborator-${collaborator.id}`}>
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
                  {getRoleIcon('Helpdesk')}
                  <span className="font-medium">Helpdesk</span>
                </div>
                <p className="text-sm text-muted-foreground">View alerts and manage notifications</p>
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