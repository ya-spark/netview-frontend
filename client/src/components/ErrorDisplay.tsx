import { AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { logger } from '@/lib/logger';

interface ErrorDisplayProps {
  error: Error | string;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const { signOut } = useAuth();
  const [, setLocation] = useLocation();

  const errorMessage = typeof error === 'string' ? error : error.message || 'An unexpected error occurred';

  const handleLogout = async () => {
    try {
      await signOut();
      setLocation('/signup');
    } catch (logoutError) {
      const err = logoutError instanceof Error ? logoutError : new Error(String(logoutError));
      logger.error('Error during logout', err, {
        component: 'ErrorDisplay',
        action: 'logout',
      });
      // Force redirect even if logout fails
      setLocation('/signup');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Error</CardTitle>
          <CardDescription>
            An error occurred while processing your request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive font-medium break-words">
              {errorMessage}
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleLogout}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
            
            {onDismiss && (
              <Button 
                onClick={onDismiss}
                variant="outline"
                className="w-full"
              >
                Dismiss
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

