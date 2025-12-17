# Frontend Component Architecture

## Component Organization

### Pages (`client/src/pages/`)
Top-level route components representing full pages.

**Available Pages**:
- `Landing.tsx` - Public landing page
- `Login.tsx` - Authentication page
- `SignUp.tsx` - User registration page
- `EmailVerification.tsx` - Email verification page
- `Features.tsx` - Feature showcase
- `Pricing.tsx` - Pricing plans
- `Onboarding.tsx` - User onboarding flow
- `TenantSelection.tsx` - Tenant selection (protected)
- `Dashboard.tsx` - Main dashboard with stats and billing info (protected)
- `Manage.tsx` - Probe management (protected)
- `CreateProbe.tsx` - Create new probe (protected)
- `Monitor.tsx` - Live monitoring (protected)
- `ProbeStatus.tsx` - Individual probe status view (protected)
- `Reports.tsx` - Analytics and reports (protected)
- `Settings.tsx` - User settings (protected)
- `Billing.tsx` - Subscription management (protected)
- `Collaborators.tsx` - Team management (protected)
- `LoggedOut.tsx` - Logged out confirmation page
- `PublicEmailError.tsx` - Error page for public email addresses
- `docs/index.tsx` - Documentation
- `not-found.tsx` - 404 page

### Route Protection

**ProtectedRoute**: Requires authenticated user
```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  
  return <>{children}</>;
}
```

**PublicRoute**: Redirects authenticated users
```tsx
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (user) return <Redirect to="/dashboard" />;
  
  return <>{children}</>;
}
```

### Key Page Details

#### Dashboard (`Dashboard.tsx`)
Main dashboard page displaying overview of monitoring infrastructure.

**Features**:
- **Probes Summary**: Total, Up, Down, and Warning counts
- **Gateways Summary**: Total, Online, Offline, and Pending counts
- **Credits/Billing Summary**: 
  - Credits remaining, used, and limit
  - Visual progress bar with color coding (green/amber/red based on usage)
  - Monthly spending and billing tier information
- **Alarms List**: Recent alerts with status (Active/Resolved)
- **Auto-refresh**: Data refreshes every 30 seconds
- **Manual refresh**: Refresh button to manually update all data

**Data Sources**:
- `/api/probes` - Probe list and status
- `/api/gateways` - Gateway list and status
- `/api/alerts` - Alert list
- `/api/dashboard` - Dashboard statistics including billing information
- `/api/probes/:id/results` - Latest probe results for status calculation

**State Management**:
- Uses TanStack Query for all data fetching
- Calculates probe statuses from latest results
- Memoized calculations for performance

#### Collaborators (`Collaborators.tsx`)
Team management page for managing tenant collaborators.

**Features**:
- List all collaborators for the tenant
- Create new collaborators (send invites)
- Update collaborator roles
- Delete collaborators
- Accept/reject invites

**API Integration**:
- Uses `CollaboratorApiService` from `@/services/collaboratorApi`
- Requires `X-Tenant-ID` and `X-User-Email` headers
- Owner role required for most operations

#### Tenant Selection (`TenantSelection.tsx`)
Page for selecting or creating a tenant.

**Features**:
- Select from existing tenants (if user has access to multiple)
- Create new tenant
- Tenant ID validation and generation
- Auto-generation of tenant ID from tenant name

**API Integration**:
- Uses tenant API functions from `@/services/tenantApi`
- Validates tenant ID availability
- Creates new tenants via `/api/tenants`

### UI Components (`client/src/components/ui/`)
Reusable shadcn/ui components built on Radix UI.

**Core Components**:
- Form components: `form`, `input`, `select`, `textarea`, `checkbox`, `radio-group`
- Layout: `card`, `separator`, `scroll-area`, `tabs`, `accordion`
- Feedback: `toast`, `alert-dialog`, `dialog`, `tooltip`, `popover`
- Data display: `table`, `badge`, `avatar`, `progress`
- Navigation: `navigation-menu`, `menubar`, `dropdown-menu`
- Interactive: `button`, `switch`, `slider`, `toggle`

**Import pattern**:
```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
```

### Custom Hooks (`client/src/hooks/`)

**useToast** - Toast notifications
```tsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  title: "Success",
  description: "Operation completed",
  variant: "default", // "default" | "destructive"
});
```

## Context Providers

### AuthContext (`client/src/contexts/AuthContext.tsx`)

Manages authentication state and user data.

**Provided values**:
```typescript
interface AuthContextType {
  firebaseUser: FirebaseUser | null;  // Firebase user object
  user: User | null;                  // Backend user object
  loading: boolean;                   // Auth state loading
  signOut: () => Promise<void>;       // Sign out function
}
```

**Usage**:
```tsx
import { useAuth } from "@/contexts/AuthContext";

function Component() {
  const { user, firebaseUser, loading, signOut } = useAuth();
  
  if (loading) return <Loading />;
  if (!user) return <NotAuthenticated />;
  
  return <AuthenticatedContent user={user} />;
}
```

**Auth Flow**:
1. Firebase `onAuthStateChanged` listener
2. Get Firebase ID token
3. Check `/api/auth/me` endpoint
4. If new user, register via `/api/auth/register`
5. Store user in context

## State Management

### Server State (TanStack Query)

**Query Client Setup** (`client/src/lib/queryClient.ts`):
- Default fetcher with Firebase token injection
- Automatic error handling
- Retry configuration

**Query Pattern**:
```tsx
import { useQuery } from "@tanstack/react-query";

const { data: probes, isLoading, error } = useQuery({
  queryKey: ['/api/probes'],
  enabled: !!user, // Only fetch when authenticated
});

// Hierarchical keys for cache invalidation
const { data: probe } = useQuery({
  queryKey: ['/api/probes', probeId],
  enabled: !!probeId,
});
```

**Mutation Pattern**:
```tsx
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const createProbeMutation = useMutation({
  mutationFn: (data: InsertProbe) => 
    apiRequest('/api/probes', { method: 'POST', body: data }),
  onSuccess: () => {
    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['/api/probes'] });
    toast({ title: "Probe created" });
  },
  onError: (error) => {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  }
});

// Usage
createProbeMutation.mutate(probeData);
```

### Local State

Use React's `useState` and `useReducer` for component-local state.

**Form state**: Managed by React Hook Form
**UI state**: Component state (modals, tabs, etc.)
**Global UI state**: Context providers if needed

## Form Patterns

### React Hook Form + Zod

**Basic form**:
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

// Define your schema
const probeSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.enum(["Uptime", "API", "Security", "Browser"]),
  url: z.string().url("Must be a valid URL"),
  isActive: z.boolean().default(true),
});

function ProbeForm() {
  const form = useForm({
    resolver: zodResolver(probeSchema),
    defaultValues: {
      name: "",
      type: "Uptime",
      url: "",
      isActive: true,
      // ... all fields with defaults
    }
  });

  const onSubmit = (data) => {
    createProbeMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-probe-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" data-testid="button-submit">
          Create Probe
        </Button>
      </form>
    </Form>
  );
}
```

**Common issues**:
- Missing default values causes validation errors
- Check `form.formState.errors` for debugging
- Use `.extend()` to add custom validation to insert schemas

## Styling Guidelines

### Tailwind CSS

**Color system** (defined in `index.css`):
```css
:root {
  --background: hsl(0, 0%, 100%);
  --foreground: hsl(222.2, 84%, 4.9%);
  --primary: hsl(...);
  /* ... more colors */
}

.dark {
  --background: hsl(222.2, 84%, 4.9%);
  --foreground: hsl(210, 40%, 98%);
  /* ... dark variants */
}
```

**Usage**:
```tsx
<div className="bg-background text-foreground border-border">
  <h1 className="text-primary">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>
```

**Dark mode**:
```tsx
// Always specify both light and dark variants
<div className="bg-white dark:bg-slate-900">
  <p className="text-gray-900 dark:text-gray-100">Text</p>
</div>
```

### Icons

**Lucide React** (UI/actions):
```tsx
import { Check, X, Settings, User } from "lucide-react";

<Button>
  <Check className="mr-2 h-4 w-4" />
  Confirm
</Button>
```

**React Icons** (logos):
```tsx
import { SiGoogle, SiGithub } from "react-icons/si";

<SiGoogle className="h-5 w-5" />
```

## Data Display Patterns

### Loading States

**Skeleton**:
```tsx
if (isLoading) {
  return <Skeleton className="h-8 w-full" />;
}
```

**Spinner**:
```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
```

### Error States

```tsx
if (error) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
```

### Empty States

```tsx
if (!data || data.length === 0) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">No probes found</p>
      <Button onClick={openCreateDialog} className="mt-4">
        Create Your First Probe
      </Button>
    </div>
  );
}
```

## Testing Best Practices

### Data Test IDs

Add to all interactive and meaningful elements:
```tsx
// Interactive elements
<Button data-testid="button-create-probe">Create</Button>
<Input data-testid="input-email" />
<Link data-testid="link-dashboard" href="/dashboard">Dashboard</Link>

// Display elements
<div data-testid="text-username">{user.name}</div>
<span data-testid="status-probe">Up</span>

// Dynamic elements
{probes.map(probe => (
  <Card key={probe.id} data-testid={`card-probe-${probe.id}`}>
    <Button data-testid={`button-edit-${probe.id}`}>Edit</Button>
  </Card>
))}
```

**Naming convention**:
- `{action}-{target}` for interactive elements
- `{type}-{content}` for display elements
- Append unique ID for dynamic elements
