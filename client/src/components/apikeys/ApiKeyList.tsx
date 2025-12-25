/**
 * API Key List Component
 * 
 * Displays a list of user's API keys with actions
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Copy, Eye, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ApiKey } from '@/types/apiKey';
import { ApiKeyService } from '@/services/apiKeyApi';

interface ApiKeyListProps {
  apiKeys: ApiKey[];
  onView: (apiKey: ApiKey) => void;
  onDelete: (apiKey: ApiKey) => void;
  onRevoke: (apiKey: ApiKey) => void;
}

export function ApiKeyList({ apiKeys, onView, onDelete, onRevoke }: ApiKeyListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (apiKey: ApiKey) => {
    if (!apiKey.is_active) {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Revoked
        </Badge>
      );
    }

    const expirationStatus = ApiKeyService.getExpirationStatus(apiKey.expires_at);

    if (expirationStatus.status === 'expired') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Expired
        </Badge>
      );
    }

    if (expirationStatus.status === 'expiring_soon') {
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
          <Clock className="w-3 h-3" />
          {expirationStatus.message}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-700 dark:text-green-400">
        <CheckCircle className="w-3 h-3" />
        Active
      </Badge>
    );
  };

  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No API keys found</p>
        <p className="text-sm">Create your first API key to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scopes</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((apiKey) => (
            <TableRow key={apiKey.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {apiKey.name}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopyId(apiKey.id)}
                        >
                          {copiedId === apiKey.id ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copiedId === apiKey.id ? 'Copied!' : 'Copy ID'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(apiKey)}</TableCell>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary">
                        {apiKey.scopes.length} scope{apiKey.scopes.length !== 1 ? 's' : ''}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-semibold mb-1">Scopes:</p>
                        <ul className="text-xs space-y-1">
                          {apiKey.scopes.slice(0, 3).map((scope, idx) => (
                            <li key={idx} className="truncate">• {scope}</li>
                          ))}
                          {apiKey.scopes.length > 3 && (
                            <li>• ... and {apiKey.scopes.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {format(new Date(apiKey.expires_at), 'MMM d, yyyy')}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(apiKey.created_at), 'MMM d, yyyy')}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(apiKey)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Details</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {apiKey.is_active && !ApiKeyService.isExpired(apiKey.expires_at) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRevoke(apiKey)}
                            className="text-yellow-600 hover:text-yellow-700"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Revoke API Key</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(apiKey)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete API Key</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

