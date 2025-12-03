# Backend Services Documentation

## Service Architecture

Services contain business logic and integrate with external systems. Located in `server/services/`.

## Authentication Service

**File**: `server/services/auth.ts`

### Firebase Admin SDK

**Initialization**:
```typescript
// Requires environment variables:
// - FIREBASE_PROJECT_ID
// - FIREBASE_CLIENT_EMAIL  
// - FIREBASE_PRIVATE_KEY

if (process.env.FIREBASE_PROJECT_ID) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  });
}
```

**Development mode**: Falls back to mock authentication if credentials missing

### Token Verification

```typescript
async function verifyToken(idToken: string): Promise<DecodedIdToken>
```
- Verifies Firebase ID tokens
- Returns decoded token with `uid` and `email`
- Falls back to mock in development

### Middleware

**authenticateUser**:
```typescript
app.use(authenticateUser);
// Adds req.user to request
// Returns 401 if token invalid/missing
```

**requireRole**:
```typescript
app.use(requireRole(['Owner', 'Admin']));
// Checks user role
// Returns 403 if insufficient permissions
```

### Default SuperAdmins

**Emails**:
- Yaseen.gem@gmail.com
- Asia.Yaseentech@gmail.com
- contact@yaseenmd.com

**Auto-created** on server start with SuperAdmin role

## Stripe Service

**File**: `server/services/stripe.ts`

### Configuration

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 1000,
    features: [...]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceId: 'price_xxx',
    credits: 10000,
    features: [...]
  },
  // ... more plans
];
```

### Customer Management

**createOrGetCustomer**:
```typescript
async function createOrGetCustomer(user: User): Promise<Stripe.Customer>
```
- Creates Stripe customer if none exists
- Updates user with `stripeCustomerId`
- Returns existing customer if already created

### Subscription Management

**createSubscription**:
```typescript
async function createSubscription(
  customerId: string, 
  priceId: string
): Promise<Stripe.Subscription>
```
- Creates new subscription
- Returns subscription object

**Webhook handling**:
- Listen for Stripe events
- Update subscription status
- Manage credit allocations

## Anthropic AI Service

**File**: `server/services/anthropic.ts`

### Configuration

```typescript
const DEFAULT_MODEL = "claude-sonnet-4-20250514"; // Latest model
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

### Probe Generation

**generateProbeFromCode**:
```typescript
async function generateProbeFromCode(request: {
  url?: string;
  code?: string;
  description?: string;
}): Promise<GeneratedProbe[]>
```

**Returns**: Array of probe configurations
```typescript
interface GeneratedProbe {
  name: string;
  description: string;
  type: 'Uptime' | 'API' | 'Security' | 'Browser';
  protocol?: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  expectedStatusCode?: number;
  expectedResponseTime?: number;
  checkInterval: number;
}
```

**Example usage**:
```typescript
const probes = await generateProbeFromCode({
  url: 'https://api.example.com',
  description: 'E-commerce API'
});
// Returns multiple probe suggestions
```

### Probe Improvement Suggestions

**suggestProbeImprovements**:
```typescript
async function suggestProbeImprovements(
  probe: Probe
): Promise<string[]>
```

**Returns**: Array of improvement suggestions
- Authentication headers
- SSL verification
- Response time optimization
- Error handling improvements

## API Key Manager

**File**: `server/services/api-key-manager.ts`

### Key Generation

**generateApiKey**:
```typescript
static generateApiKey(): {
  fullKey: string;      // "nv_<64-char-hex>"
  keyPrefix: string;    // First 8 chars for display
  keyHash: string;      // SHA-256 hash for storage
}
```

**Format**: `nv_` prefix + 32 random bytes (64 hex chars)

### Key Validation

**validateApiKey**:
```typescript
static async validateApiKey(
  providedKey: string
): Promise<ApiKeyValidationResult>

interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  user?: User;
  error?: string;
}
```

**Checks**:
1. Format validation (starts with `nv_`)
2. Hash lookup in database
3. Active status check
4. Expiration check
5. User association

### Key Management

**createApiKey**:
```typescript
static async createApiKey(
  userId: string,
  tenantId: string,
  request: CreateApiKeyRequest
): Promise<CreateApiKeyResponse>

interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  expiresAt?: Date;
}
```

**updateLastUsed**:
```typescript
static async updateLastUsed(apiKeyId: string): Promise<void>
```
- Updates `lastUsed` timestamp
- Increments `usageCount`

**revokeApiKey**:
```typescript
static async revokeApiKey(apiKeyId: string): Promise<void>
```
- Sets `isActive` to false

### Available Scopes

```typescript
static getAvailableScopes(): Array<{scope: string, description: string}>
```

**Scopes**:
- `probes:read` / `probes:write`
- `results:read` / `results:write`
- `notifications:read` / `notifications:write`
- `gateways:read` / `gateways:write`
- `admin:read` / `admin:write`

## Notification Manager

**File**: `server/services/notification-manager.ts`

### Notification Types

```typescript
interface NotificationPayload {
  id: string;
  type: 'email' | 'sms' | 'webhook';
  recipient: string;
  subject?: string;
  message: string;
  data?: any;
  metadata: {
    tenantId: string;
    probeId?: string;
    alertId?: string;
    groupId?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}
```

### Rate Limiting

**Default limits**:
- Email: 10 per minute
- SMS: 5 per minute  
- Webhook: 20 per minute

**Per tenant and per recipient**

### Notification Methods

**sendNotification**:
```typescript
async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationLog>
```
- Hairpin function (intercepts all notifications)
- Applies rate limiting
- Logs delivery status
- Handles retries

**sendToGroup**:
```typescript
async function sendToGroup(
  groupId: string,
  message: string,
  metadata: NotificationMetadata
): Promise<NotificationLog[]>
```
- Sends to all channels in notification group
- Emails, SMS, webhooks
- Respects alert threshold

### Notification Logs

**getNotificationLogs**:
```typescript
function getNotificationLogs(filters?: {
  tenantId?: string;
  probeId?: string;
  type?: string;
  status?: string;
  limit?: number;
}): NotificationLog[]
```

**getNotificationStats**:
```typescript
function getNotificationStats(tenantId?: string): {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}
```

## Integration Patterns

### Using Services in Routes

```typescript
import { verifyToken } from "./services/auth";
import { createOrGetCustomer } from "./services/stripe";
import { generateProbeFromCode } from "./services/anthropic";
import { ApiKeyManager } from "./services/api-key-manager";
import { sendToGroup } from "./services/notification-manager";

app.post("/api/endpoint", authenticateUser, async (req, res) => {
  // Use services
  const customer = await createOrGetCustomer(req.user);
  const probes = await generateProbeFromCode(req.body);
  
  res.json({ probes });
});
```

### Error Handling

```typescript
try {
  const result = await serviceMethod();
  res.json(result);
} catch (error) {
  logger.error(`Service error: ${error.message}`, 'service-name');
  res.status(500).json({ 
    message: 'Operation failed',
    error: error.message 
  });
}
```

### Service Dependencies

Services can depend on:
- `storage` - Database operations
- `logger` - Rotating logger
- Environment variables
- External SDKs (Stripe, Anthropic, Firebase)

**Avoid circular dependencies**:
- Services should not import from routes
- Use dependency injection if needed
