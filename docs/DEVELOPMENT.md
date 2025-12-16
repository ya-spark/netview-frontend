# Development Guidelines

## Repository Note

**This repository contains frontend code only.** The backend API server runs separately and communicates with this frontend via HTTP API calls. The backend code is located in a separate repository.

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
- **Authentication**: Firebase Authentication (Google OAuth)

## Runtime Requirements

### Frontend Development
- **Node.js**: Version 18+ recommended
- **Package Manager**: npm
- **Default Port**: Configured via `PORT` environment variable (defaults to 5173 for Vite)

### External Service Dependencies
The frontend communicates with:
- **Backend API**: Port configured via `CONTROLLER_PORT` in controller's `.env` file (typically `http://localhost:11001`)
- **Firebase**: Authentication and user management
  - Requires `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`

## Project Structure

```
.
├── client/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── Header.tsx  # Main header component
│   │   │   ├── Layout.tsx  # Layout wrapper
│   │   │   ├── Sidebar.tsx # Navigation sidebar
│   │   │   └── probes/     # Probe-specific components
│   │   ├── contexts/       # React contexts (AuthContext)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities (queryClient, firebase)
│   │   ├── pages/          # Page components
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Manage.tsx
│   │   │   ├── Monitor.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Billing.tsx
│   │   │   ├── Collaborators.tsx
│   │   │   └── ...
│   │   ├── services/       # API service functions
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx         # Main app with routing
│   │   └── main.tsx        # Entry point
│   └── index.html          # HTML template
├── attached_assets/        # Static assets
├── docs/                   # Documentation
├── scripts/                # Build and utility scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Development Workflow

### 1. Starting Development

**Prerequisites**:
1. Ensure backend API server is running on `http://localhost:11001`
2. Set up environment variables in `.env` file:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_NETVIEW_API_URL=http://localhost:11001  # Must match controller's CONTROLLER_PORT
   PORT=5173
   ```
   
   **Required Environment Variables:**
   - `VITE_NETVIEW_API_URL`: Backend API URL (must match controller's host and `CONTROLLER_PORT`, typically `http://localhost:11001`)
   - `PORT`: Development server port (default: 5173)
   - `VITE_FIREBASE_*`: Firebase authentication credentials

**Run the frontend**:
```bash
npm run dev
```

This starts:
- Vite dev server on the configured port (default: 5173)
- Hot module replacement (HMR) for instant updates
- API proxy to backend at `http://localhost:11001`

### 2. Adding New Features

**Order of operations**:
1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Create API service functions in `client/src/services/` (if needed)
4. Add TanStack Query hooks for data fetching
5. Create UI components in `client/src/components/` (if reusable)
6. Add TypeScript types in `client/src/types/` (if needed)

### 3. Package Management

**Install packages**:
```bash
npm install <package-name>
```

**Frontend env variables**:
- Must be prefixed with `VITE_`
- Access via `import.meta.env.VITE_VAR_NAME`
- Example: `import.meta.env.VITE_FIREBASE_API_KEY`

## Frontend Patterns

### Routing (Wouter)

**Adding a page**:
1. Create page component in `client/src/pages/`
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
  resolver: zodResolver(schema.extend({
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
import { useQuery } from "@tanstack/react-query";

const { data, isLoading } = useQuery({
  queryKey: ['/api/probes'],
  enabled: !!user, // Prevent unauthenticated requests
});
```

**Mutations**:
```tsx
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const mutation = useMutation({
  mutationFn: async (data) => 
    apiRequest('POST', '/api/probes', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/probes'] });
  }
});
```

**Key patterns**:
- Use object form for TanStack Query v5
- Array query keys for hierarchical caching: `['/api/probes', id]`
- Gate queries with `enabled: !!user`
- Always invalidate cache after mutations
- Show loading/skeleton states

### Authentication Context

```tsx
import { useAuth } from "@/contexts/AuthContext";

const { user, firebaseUser, loading, signOut } = useAuth();
```

**Auth flow**:
1. Firebase `signInWithPopup` for Google OAuth
2. Query client auto-injects Firebase ID token in headers
3. Backend verifies token via Firebase Admin SDK
4. User created/fetched and stored in context

### API Requests

**Using apiRequest helper**:
```tsx
import { apiRequest } from "@/lib/queryClient";

// GET request
const response = await apiRequest('GET', '/api/probes');
const data = await response.json();

// POST request
const response = await apiRequest('POST', '/api/probes', {
  name: 'My Probe',
  type: 'Uptime'
});
const result = await response.json();
```

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

## Logging

### Using the Logger

Always use the configured logger from `@/lib/logger` instead of `console.*`:

```tsx
import { logger } from '@/lib/logger';

// Basic logging
logger.info('User action completed');
logger.debug('Debug information');
logger.warn('Warning message');
logger.error('Error occurred');

// Error logging with exception
try {
  // operation
} catch (error) {
  logger.exception('Operation failed', error as Error, {
    component: 'MyComponent',
    action: 'submitForm',
  });
}

// Logging with context
logger.info('User logged in', {
  component: 'Login',
  userId: user.id,
  tenantId: user.tenantId,
});

// Using logger with default context (component-level)
import { createLogger } from '@/lib/logger';

const componentLogger = createLogger({ component: 'MyComponent' });
componentLogger.info('Action completed', { action: 'submit' });
```

### Log Levels

- **DEBUG**: Detailed information for debugging (only in DEBUG mode)
- **INFO**: General informational messages
- **WARN**: Warning messages
- **ERROR**: Error messages with optional error objects

### Logging Best Practices

The logger includes several best practices:

1. **Structured Logging**: Supports JSON format for production (set `VITE_LOG_FORMAT=json`)
2. **Context Support**: Add contextual information (user ID, tenant ID, component, action, etc.)
3. **Exception Logging**: Use `logger.exception()` for full stack traces
4. **Security**: Sensitive data (passwords, tokens, API keys) is automatically sanitized
5. **Performance Logging**: Use `logger.performance()` or `logger.performanceAsync()` for timing:
   ```tsx
   logger.performance('Data fetch', () => {
     // synchronous operation
   });
   
   await logger.performanceAsync('API call', async () => {
     // async operation
   });
   ```
6. **Format Options**:
   - Text format (default): Human-readable for development
   - JSON format: Structured for production and log aggregation tools

### Logging Configuration

Logging can be configured via environment variables:

- `VITE_LOG_LEVEL`: Log level (DEBUG, INFO, WARN, ERROR) - default: INFO
- `VITE_LOG_FORMAT`: Format type ("text" or "json") - default: text

**Example `.env` file**:
```env
VITE_LOG_LEVEL=DEBUG
VITE_LOG_FORMAT=text
```

### When to Use Each Log Level

- **DEBUG**: Detailed debugging information, verbose logs (only enabled in development)
- **INFO**: Important user actions, state changes, successful operations
- **WARN**: Non-critical issues, deprecated features, fallback behavior
- **ERROR**: Errors, exceptions, failed operations (always logged)

### Context Logging

Always include relevant context in logs:

```tsx
logger.info('Probe created', {
  component: 'Manage',
  action: 'createProbe',
  userId: user.id,
  tenantId: user.tenantId,
  probeId: newProbe.id,
});
```

### Error Logging

Always log errors with full context:

```tsx
try {
  await apiRequest('POST', '/api/probes', data);
} catch (error) {
  logger.exception('Failed to create probe', error as Error, {
    component: 'Manage',
    action: 'createProbe',
    userId: user.id,
  });
  // Show user-friendly error message
}
```

### Migration from console.*

Replace all `console.log`, `console.error`, etc. with the logger:

```tsx
// ❌ Don't use
console.log('User logged in');
console.error('Error:', error);

// ✅ Use instead
logger.info('User logged in', { component: 'Login' });
logger.exception('Operation failed', error as Error, { component: 'MyComponent' });
```

## Environment Variables

### Frontend
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_LOG_LEVEL` - Log level (DEBUG, INFO, WARN, ERROR) - default: INFO
- `VITE_LOG_FORMAT` - Log format (text, json) - default: text
- `PORT` - Development server port (default: 5173)

**Note**: All frontend environment variables must be prefixed with `VITE_` to be accessible in the browser.

## Build and Deployment

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

This creates optimized production files in `dist/public/`.

### Preview Production Build
```bash
npm run preview
```

## Common Pitfalls

1. **Import errors**:
   - Use `@/` prefix for client imports (e.g., `@/components/ui/button`)
   - Don't explicitly import React (not needed in React 17+)

2. **Forms not submitting**:
   - Log `form.formState.errors` for debugging
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

6. **API proxy errors**:
   - Ensure backend API server is running on the port specified by `CONTROLLER_PORT` in controller's `.env` file
   - Check `vite.config.ts` proxy configuration

7. **Firebase auth errors**:
   - Verify all `VITE_FIREBASE_*` environment variables are set
   - Check Firebase project configuration
   - Ensure Firebase Authentication is enabled in Firebase Console
