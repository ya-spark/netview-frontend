import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { LogOut, LogIn } from 'lucide-react';

export default function LoggedOut() {
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    setLocation('/login');
  };

  return (
    <Layout showSidebar={false}>
      <div className="min-h-screen flex items-center justify-center bg-muted/20 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold text-foreground">NetView</span>
            </div>
            <CardTitle className="text-2xl">You've Been Logged Out</CardTitle>
            <CardDescription>
              Your session has been successfully terminated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <LogOut className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Successfully Logged Out</h3>
                <p className="text-sm text-muted-foreground">
                  You have been successfully logged out of your account. All authentication and user-related information has been cleared.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">What happens next?</p>
              <p className="text-xs text-muted-foreground">
                To access your account again, please sign in with your credentials. Your data is safe and will be available when you log back in.
              </p>
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                className="w-full"
                onClick={handleLogin}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

