/**
 * API Key Details Dialog
 * 
 * Shows detailed information about an API key
 */

import { format } from 'date-fns';
import { Key, Calendar, Shield, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ApiKey } from '@/types/apiKey';
import { ApiKeyService } from '@/services/apiKeyApi';
import { UserScopeService } from '@/services/userScopeApi';

interface ApiKeyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: ApiKey | null;
  onRevoke?: (apiKey: ApiKey) => void;
  onDelete?: (apiKey: ApiKey) => void;
}

export function ApiKeyDetailsDialog({
  open,
  onOpenChange,
  apiKey,
  onRevoke,
  onDelete,
}: ApiKeyDetailsDialogProps) {
  if (!apiKey) {
    return null;
  }

  const expirationStatus = ApiKeyService.getExpirationStatus(apiKey.expires_at);
  const isExpired = ApiKeyService.isExpired(apiKey.expires_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {apiKey.name}
          </DialogTitle>
          <DialogDescription>
            API key details and scope information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {!apiKey.is_active ? (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Revoked
                </Badge>
              ) : isExpired ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Expired
                </Badge>
              ) : expirationStatus.status === 'expiring_soon' ? (
                <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
                  <Clock className="w-3 h-3" />
                  {expirationStatus.message}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-green-500 text-green-700 dark:text-green-400">
                  <Clock className="w-3 h-3" />
                  Active
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" />
                API Key ID
              </p>
              <p className="text-sm font-mono break-all">{apiKey.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created
              </p>
              <p className="text-sm">{format(new Date(apiKey.created_at), 'PPP')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expires
              </p>
              <p className="text-sm">{format(new Date(apiKey.expires_at), 'PPP')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last Updated
              </p>
              <p className="text-sm">{format(new Date(apiKey.updated_at), 'PPP')}</p>
            </div>
          </div>

          <Separator />

          {/* Scopes Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissions & Scopes ({apiKey.scopes.length})
            </h3>
            
            {apiKey.scopes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scopes assigned</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {apiKey.scopes.map((scope, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-3 space-y-1 bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <code className="text-xs font-mono break-all flex-1">
                        {scope}
                      </code>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {UserScopeService.getScopeLevelName(scope)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {UserScopeService.formatScopeForDisplay(scope)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage Section - Future Enhancement */}
          {/* <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Usage Statistics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Total Requests</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">Last Used</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Failed Requests</p>
              </div>
            </div>
          </div> */}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 flex gap-2">
            {apiKey.is_active && !isExpired && onRevoke && (
              <Button
                variant="outline"
                onClick={() => {
                  onRevoke(apiKey);
                  onOpenChange(false);
                }}
                className="text-yellow-600 hover:text-yellow-700"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Revoke
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                onClick={() => {
                  onDelete(apiKey);
                  onOpenChange(false);
                }}
                className="text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
            )}
          </div>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

