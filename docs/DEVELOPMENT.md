# Development Guidelines

## Repository Note

**This repository contains frontend code only.** The backend code (server/, shared/, gateway/) is located in a separate repository. This documentation describes the full system architecture for reference.

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI + shadcn/ui components
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query (server state) + React Context (auth)
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React (actions/UI), React Icons (logos)

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Firebase Admin SDK + Firebase Authentication
- **Payments**: Stripe
- **AI**: Anthropic Claude
- **Logging**: Custom rotating file logger

### Gateway
- **Language**: Python 3
- **Framework**: Flask
- **Storage**: SQLite (local caching)
- **Libraries**: Requests, DNSPython, Selenium

## Runtime Requirements

### Backend Runtime
- **Node.js**: Version 20
- **PostgreSQL**: Version 16
- **Default Port**: 5000 (configurable via `PORT` environment variable)

### External Service Integrations
The backend integrates with the following services:
- **Firebase**: Authentication and user management
- **Stripe**: Payment processing
- **PostgreSQL**: Database (via Neon or other PostgreSQL provider)
- **Anthropic Claude**: AI-powered probe generation

## Deployment Configuration

### Build and Run Commands
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Production**: `npm run start`

### Port Configuration
- Default application port: `5000`
- Can be configured via `PORT` environment variable

### Deployment Target
- Supports autoscale deployment
- Build process runs `npm run build`
- Production start command: `npm run start`

## Project Structure

```
.
├── client/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (AuthContext)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities (queryClient, firebase)
│   │   ├── pages/          # Page components
│   │   └── App.tsx         # Main app with routing
├── server/
│   ├── services/           # Business logic services
│   ├── middleware/         # Express middleware
│   ├── utils/              # Utility functions
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database interface
│   ├── db.ts               # Database connection
│   └── index.ts            # Server entry point
├── shared/
│   └── schema.ts           # Shared DB schema and types
├── gateway/                # Python gateway application
└── attached_assets/        # User-uploaded assets
```

## Development Workflow

### 1. Starting Development

**Run the application**:
```bash
npm run dev
```
This starts:
- Express backend on port 5000
- Vite frontend (proxied through Express)
- Single port (5000) serves both

**Workflows**: The "Start application" workflow is auto-configured

### 2. Database Changes

**Schema modifications**:
1. Update `shared/schema.ts` with new tables/columns
2. Update `server/storage.ts` with new methods
3. Push changes: `npm run db:push`
4. If data-loss warning: `npm run db:push --force`

**Never**:
- Write manual SQL migrations
- Change primary key types (serial ↔ uuid)
- Edit `drizzle.config.ts`

### 3. Adding New Features

**Order of operations**:
1. Define data model in `shared/schema.ts`
2. Create insert schema and types
3. Update `IStorage` interface in `server/storage.ts`
4. Implement storage methods
5. Add API routes in `server/routes.ts`
6. Create frontend components/pages
7. Add TanStack Query hooks

### 4. Package Management

**Install packages**:
```bash
# Use packager tool (preferred)
# DO NOT manually edit package.json
```

**Frontend env variables**:
- Must be prefixed with `VITE_`
- Access via `import.meta.env.VITE_VAR_NAME`

## Frontend Patterns

### Routing (Wouter)

**Adding a page**:
1. Create page in `client/src/pages/`
2. Register route in `client/src/App.tsx`
3. Use `<Link>` component or `useLocation()` hook

```tsx
// App.tsx
<Route path="/new-page">
  <ProtectedRoute>
    <NewPage />
  </ProtectedRoute>
</Route>

// Navigation
import { Link } from "wouter";
<Link href="/new-page">Go to New Page</Link>
```

### Forms (React Hook Form + Zod)

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";

const form = useForm({
  resolver: zodResolver(insertProbeSchema.extend({
    // Add custom validation
  })),
  defaultValues: {
    // Always provide defaults
  }
});
```

### Data Fetching (TanStack Query)

**Queries**:
```tsx
const { data, isLoading } = useQuery({
  queryKey: ['/api/probes'],
  enabled: !!user, // Prevent unauthenticated requests
});
```

**Mutations**:
```tsx
const mutation = useMutation({
  mutationFn: async (data) => 
    apiRequest('/api/probes', { method: 'POST', body: data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/probes'] });
  }
});
```

**Key patterns**:
- Use object form for TanStack Query v5
- Array query keys for hierarchical caching: `['/api/recipes', id]`
- Gate queries with `enabled: !!user`
- Always invalidate cache after mutations
- Show loading/skeleton states

### Authentication Context

```tsx
import { useAuth } from "@/contexts/AuthContext";

const { user, firebaseUser, loading, signOut } = useAuth();
```

**Auth flow**:
1. Firebase `signInWithRedirect` for Google OAuth
2. Query client auto-injects Firebase ID token in headers
3. Backend verifies token via Firebase Admin SDK
4. User created/fetched and stored in context

### Styling

**Tailwind classes**:
- Use existing shadcn components from `@/components/ui/`
- Custom colors in `index.css` using HSL format
- Dark mode: Use `dark:` variants for all visual properties

```tsx
className="bg-white dark:bg-black text-black dark:text-white"
```

**Assets**:
```tsx
import exampleImg from "@assets/example.png";
```

### Testing Attributes

Add `data-testid` to interactive and display elements:
```tsx
<button data-testid="button-submit">Submit</button>
<input data-testid="input-email" />
<div data-testid={`card-product-${productId}`} />
```

## Backend Patterns

### API Routes

**Structure**:
```typescript
app.post("/api/resource", 
  authenticateUser,                    // Auth middleware
  requireRole(['Owner', 'Admin']),     // Authorization
  async (req, res) => {
    const data = insertSchema.parse(req.body);  // Validate
    const result = await storage.create(data);  // Storage
    res.json(result);                           // Respond
  }
);
```

**Dual authentication** (User OR API Key):
```typescript
app.get("/api/resource",
  authenticateUserOrApiKey,
  requireScopes(['resource:read']),
  handler
);
```

### Services

**Location**: `server/services/`

**Available services**:
- `auth.ts` - Firebase token verification, role checking
- `stripe.ts` - Payment processing, subscriptions
- `anthropic.ts` - AI probe generation
- `api-key-manager.ts` - API key CRUD and validation
- `notification-manager.ts` - Multi-channel notifications

### Middleware

**API Interceptor** (`server/middleware/api-interceptor.ts`):
- Logs all API requests
- Tracks response times, status codes
- Rate limiting enforcement
- Analytics collection

**API Auth** (`server/middleware/api-auth.ts`):
- Dual authentication (session + API keys)
- Scope-based authorization
- Token validation

### Logging

**Rotating logger** (`server/utils/rotating-logger.ts`):
- Auto-rotates log files
- Configurable size limits
- Captures all console output
- See `LOGGING.md` for details

```typescript
import { logger } from './utils/rotating-logger';

logger.info('Message', 'source');
logger.error('Error message', 'source');
```

## Forbidden Changes

**Never modify**:
- `vite.config.ts` - Build configuration is optimized
- `server/vite.ts` - Dev server setup
- `package.json` - Use packager tool instead
- `drizzle.config.ts` - Database config

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection
- `FIREBASE_PROJECT_ID` - Firebase project
- `FIREBASE_CLIENT_EMAIL` - Firebase service account
- `FIREBASE_PRIVATE_KEY` - Firebase private key
- `ANTHROPIC_API_KEY` - Claude API access
- `STRIPE_SECRET_KEY` - Stripe payments
- `LOG_MAX_TOTAL_SIZE_MB` - Log storage limit
- `LOG_MAX_FILE_SIZE_MB` - Individual log file limit

### Frontend
- `VITE_FIREBASE_API_KEY` - Firebase config
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase config
- `VITE_FIREBASE_PROJECT_ID` - Firebase config
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe frontend

## Common Pitfalls

1. **Import errors**:
   - Use `@/` prefix for client imports
   - Use `@shared/` for shared schema
   - Don't explicitly import React

2. **Forms not submitting**:
   - Log `form.formState.errors`
   - Check Zod schema validation
   - Ensure all form fields have default values

3. **Query issues**:
   - Use object form: `useQuery({ queryKey: [...] })`
   - Enable only when authenticated: `enabled: !!user`
   - Invalidate after mutations

4. **SelectItem errors**:
   - Always provide `value` prop to `<SelectItem>`

5. **Toast hook**:
   - Import from `@/hooks/use-toast`, not `@/components/ui/use-toast`

6. **Array columns**:
   - Use `text().array()` not `array(text())`
