/**
 * API Keys Management Page
 * 
 * Allows users to create, view, and manage their API keys
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Key, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { ApiKeyList } from '@/components/apikeys/ApiKeyList';
import { CreateApiKeyDialog } from '@/components/apikeys/CreateApiKeyDialog';
import { ApiKeyDetailsDialog } from '@/components/apikeys/ApiKeyDetailsDialog';
import { ApiKeyService } from '@/services/apiKeyApi';
import { UserScopeService } from '@/services/userScopeApi';
import type { ApiKey } from '@/types/apiKey';
import { logger } from '@/lib/logger';

export default function ApiKeys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);

  // Fetch user's scopes
  const {
    data: userScopesData,
    isLoading: scopesLoading,
  } = useQuery({
    queryKey: ['user-scopes', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is required');
      return await UserScopeService.getUserScopes(user.id);
    },
  });

  // Fetch API keys
  const {
    data: apiKeysData,
    isLoading: keysLoading,
    error: keysError,
  } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => await ApiKeyService.listApiKeys(),
  });

  // Create API key mutation
  const createMutation = useMutation({
    mutationFn: ApiKeyService.createApiKey,
    onSuccess: () => {
      logger.info('API key created successfully', {
        component: 'ApiKeys',
        action: 'create_api_key',
      });
      toast({
        title: 'API Key Created',
        description: 'Your new API key has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setCreateDialogOpen(false);
    },
    onError: (error: any) => {
      logger.error('Failed to create API key', error, {
        component: 'ApiKeys',
        action: 'create_api_key',
      });
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create API key. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Revoke API key mutation
  const revokeMutation = useMutation({
    mutationFn: ApiKeyService.revokeApiKey,
    onSuccess: () => {
      logger.info('API key revoked successfully', {
        component: 'ApiKeys',
        action: 'revoke_api_key',
      });
      toast({
        title: 'API Key Revoked',
        description: 'The API key has been revoked and can no longer be used.',
      });
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setRevokeDialogOpen(false);
      setSelectedApiKey(null);
    },
    onError: (error: any) => {
      logger.error('Failed to revoke API key', error, {
        component: 'ApiKeys',
        action: 'revoke_api_key',
      });
      toast({
        title: 'Revocation Failed',
        description: error.message || 'Failed to revoke API key. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete API key mutation
  const deleteMutation = useMutation({
    mutationFn: ApiKeyService.deleteApiKey,
    onSuccess: () => {
      logger.info('API key deleted successfully', {
        component: 'ApiKeys',
        action: 'delete_api_key',
      });
      toast({
        title: 'API Key Deleted',
        description: 'The API key has been permanently deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setDeleteDialogOpen(false);
      setSelectedApiKey(null);
    },
    onError: (error: any) => {
      logger.error('Failed to delete API key', error, {
        component: 'ApiKeys',
        action: 'delete_api_key',
      });
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete API key. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleView = (apiKey: ApiKey) => {
    setSelectedApiKey(apiKey);
    setDetailsDialogOpen(true);
  };

  const handleRevoke = (apiKey: ApiKey) => {
    setSelectedApiKey(apiKey);
    setRevokeDialogOpen(true);
  };

  const handleDelete = (apiKey: ApiKey) => {
    setSelectedApiKey(apiKey);
    setDeleteDialogOpen(true);
  };

  const confirmRevoke = () => {
    if (selectedApiKey) {
      revokeMutation.mutate(selectedApiKey.id);
    }
  };

  const confirmDelete = () => {
    if (selectedApiKey) {
      deleteMutation.mutate(selectedApiKey.id);
    }
  };

  const isLoading = keysLoading || scopesLoading;
  const apiKeys = apiKeysData?.data || [];
  const userScopes = userScopesData?.scopes || [];

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Key className="h-8 w-8" />
              API Keys
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage API keys for programmatic access to your resources
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            disabled={isLoading || !userScopes.length}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>About API Keys</AlertTitle>
          <AlertDescription>
            API keys allow you to authenticate API requests without using your login credentials. 
            Each key inherits permissions from your user scopes. Keep your API keys secure and 
            rotate them regularly.
          </AlertDescription>
        </Alert>

        {/* Error State */}
        {keysError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading API Keys</AlertTitle>
            <AlertDescription>
              {keysError instanceof Error ? keysError.message : 'An unexpected error occurred'}
            </AlertDescription>
          </Alert>
        )}

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
            <CardDescription>
              {apiKeys.length} {apiKeys.length === 1 ? 'key' : 'keys'} • 
              Viewing keys for {user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Loading API keys...</p>
              </div>
            ) : (
              <ApiKeyList
                apiKeys={apiKeys}
                onView={handleView}
                onDelete={handleDelete}
                onRevoke={handleRevoke}
              />
            )}
          </CardContent>
        </Card>

        {/* Documentation Card */}
        <Card>
          <CardHeader>
            <CardTitle>Using API Keys</CardTitle>
            <CardDescription>How to authenticate with your API key</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Authentication</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Include your API key in the request header:
              </p>
              <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
                <code>X-API-Key: your_api_key_here</code>
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Example Request</h4>
              <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
                <code>{`curl -H "X-API-Key: your_api_key_here" \\
     -H "X-Tenant-ID: your_tenant_id" \\
     ${window.location.origin}/api/probes`}</code>
              </pre>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Security Best Practices:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Never commit API keys to version control</li>
                  <li>Store keys securely in environment variables or secrets managers</li>
                  <li>Use separate keys for different environments (dev, staging, prod)</li>
                  <li>Rotate keys regularly and revoke unused keys</li>
                  <li>Monitor API key usage for suspicious activity</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <CreateApiKeyDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreate={(data) => createMutation.mutateAsync(data)}
          userScopes={userScopes}
          isPending={createMutation.isPending}
        />

        {/* Details Dialog */}
        <ApiKeyDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          apiKey={selectedApiKey}
          onRevoke={handleRevoke}
          onDelete={handleDelete}
        />

        {/* Revoke Confirmation Dialog */}
        <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately revoke the API key "{selectedApiKey?.name}". 
                Any applications using this key will no longer be able to authenticate.
                <br /><br />
                You can delete the key permanently later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRevoke}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Revoke Key
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the API key "{selectedApiKey?.name}". 
                This action cannot be undone.
                <br /><br />
                Any applications using this key will immediately lose access.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}

