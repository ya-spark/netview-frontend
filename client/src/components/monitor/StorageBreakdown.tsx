import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { LogsBreakdown, DbBreakdown } from '@/types/gateway';

interface StorageBreakdownProps {
  type: 'logs' | 'db';
  breakdown: LogsBreakdown | DbBreakdown;
  isOpen: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function StorageBreakdown({
  type,
  breakdown,
  isOpen,
  onClose,
}: StorageBreakdownProps) {
  const title = type === 'logs' ? 'Logs Folder Breakdown' : 'Database Folder Breakdown';
  const description = type === 'logs' 
    ? 'Detailed breakdown of logs folder by log type'
    : 'Detailed breakdown of database folder by file';

  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const totalSize = Object.values(breakdown).reduce((sum, size) => sum + size, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="font-medium">Total Size</span>
            <Badge variant="outline" className="text-lg">
              {formatBytes(totalSize)}
            </Badge>
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {type === 'logs' ? 'logs' : 'database files'} found
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map(([name, size]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-muted-foreground">
                      {formatBytes(size)}
                    </span>
                    {totalSize > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {((size / totalSize) * 100).toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
