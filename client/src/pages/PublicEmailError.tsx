import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { Mail, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PublicEmailErrorProps {
  email: string;
}

export default function PublicEmailError({ email }: PublicEmailErrorProps) {
  const [, setLocation] = useLocation();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setLocation('/signup');
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
            <CardTitle className="text-2xl">Business Email Required</CardTitle>
            <CardDescription>
              Public email addresses are not allowed for account creation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Public Email Not Allowed</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  The email address <span className="font-medium">{email}</span> is from a public email provider.
                </p>
                <p className="text-sm text-muted-foreground">
                  NetView requires a business email address to create an account. Public email providers (Gmail, Yahoo, Outlook, etc.) are not permitted.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">What is a business email?</p>
              <p className="text-xs text-muted-foreground">
                A business email is an email address that uses your company's domain (e.g., <span className="font-mono">yourname@yourcompany.com</span>). 
                It should not be from public email providers like Gmail, Yahoo, Outlook, or similar services.
              </p>
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                className="w-full"
                onClick={handleSignOut}
                data-testid="button-sign-out-and-retry"
              >
                Sign Out & Create New Account
              </Button>

            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

