/**
 * Create API Key Dialog
 * 
 * Dialog for creating a new API key with scope selection
 */

import { useState, useEffect } from 'react';
import { format, addDays, addMonths, addYears } from 'date-fns';
import { Copy, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { ApiKeyCreateResponse } from '@/types/apiKey';

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    scopes: string[];
    expires_at: string;
    description?: string;
  }) => Promise<ApiKeyCreateResponse>;
  userScopes: string[];
  isPending?: boolean;
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreate,
  userScopes,
  isPending = false,
}: CreateApiKeyDialogProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expirationPreset, setExpirationPreset] = useState('30_days');
  const [customExpiration, setCustomExpiration] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [createdApiKey, setCreatedApiKey] = useState<ApiKeyCreateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setTimeout(() => {
        setStep('form');
        setName('');
        setDescription('');
        setExpirationPreset('30_days');
        setCustomExpiration('');
        setSelectedScopes([]);
        setCreatedApiKey(null);
        setCopied(false);
      }, 200);
    }
  }, [open]);

  const getExpirationDate = (): string => {
    const now = new Date();
    
    switch (expirationPreset) {
      case '7_days':
        return addDays(now, 7).toISOString();
      case '30_days':
        return addDays(now, 30).toISOString();
      case '90_days':
        return addDays(now, 90).toISOString();
      case '6_months':
        return addMonths(now, 6).toISOString();
      case '1_year':
        return addYears(now, 1).toISOString();
      case 'custom':
        return customExpiration ? new Date(customExpiration).toISOString() : addDays(now, 30).toISOString();
      default:
        return addDays(now, 30).toISOString();
    }
  };

  const handleCreate = async () => {
    try {
      const expiresAt = getExpirationDate();
      
      const result = await onCreate({
        name,
        scopes: selectedScopes.length > 0 ? selectedScopes : userScopes,
        expires_at: expiresAt,
        description: description || undefined,
      });

      setCreatedApiKey(result);
      setStep('success');
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleCopyKey = () => {
    if (createdApiKey?.key) {
      navigator.clipboard.writeText(createdApiKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isFormValid = name.trim().length > 0 && 
    (expirationPreset !== 'custom' || customExpiration.length > 0);

  if (step === 'success' && createdApiKey) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>API Key Created Successfully</DialogTitle>
            <DialogDescription>
              Save this API key now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Copy and save this API key now. For security reasons, 
                it will not be shown again.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={copied ? '••••••••••••••••••••••••••••••••••••••••' : createdApiKey.key}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant={copied ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleCopyKey}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <p className="text-sm text-muted-foreground">{createdApiKey.api_key.name}</p>
            </div>

            <div className="space-y-2">
              <Label>Expires</Label>
              <p className="text-sm text-muted-foreground">
                {format(new Date(createdApiKey.api_key.expires_at), 'PPP')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Scopes ({createdApiKey.api_key.scopes.length})</Label>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {createdApiKey.api_key.scopes.map((scope, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} disabled={!copied}>
              {copied ? 'Close' : 'I have saved the key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for programmatic access to your resources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., CI/CD Pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A descriptive name to identify this API key
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiration">
              Expiration <span className="text-red-500">*</span>
            </Label>
            <Select
              value={expirationPreset}
              onValueChange={setExpirationPreset}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7_days">7 days</SelectItem>
                <SelectItem value="30_days">30 days</SelectItem>
                <SelectItem value="90_days">90 days</SelectItem>
                <SelectItem value="6_months">6 months</SelectItem>
                <SelectItem value="1_year">1 year</SelectItem>
                <SelectItem value="custom">Custom date</SelectItem>
              </SelectContent>
            </Select>
            {expirationPreset === 'custom' && (
              <Input
                type="date"
                value={customExpiration}
                onChange={(e) => setCustomExpiration(e.target.value)}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              />
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Expires: {format(new Date(getExpirationDate()), 'PPP')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Scopes</Label>
            <Alert>
              <AlertDescription className="text-xs">
                <p className="mb-2">
                  <strong>Default:</strong> This API key will inherit all your current scopes ({userScopes.length}).
                </p>
                <p className="text-muted-foreground">
                  Custom scope selection coming soon. You can edit scopes after creation.
                </p>
              </AlertDescription>
            </Alert>
            <div className="max-h-32 overflow-y-auto border rounded-md p-2">
              <div className="flex flex-wrap gap-1">
                {userScopes.slice(0, 10).map((scope, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {scope}
                  </Badge>
                ))}
                {userScopes.length > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{userScopes.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isFormValid || isPending}
          >
            {isPending ? 'Creating...' : 'Create API Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

