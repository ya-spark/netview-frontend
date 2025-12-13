import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface MonitorHeaderProps {
  title: string;
  description: string;
  onRefresh: () => void;
  isLoading: boolean;
}

export function MonitorHeader({ title, description, onRefresh, isLoading }: MonitorHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-page-title">
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        data-testid="button-refresh-monitor"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}
