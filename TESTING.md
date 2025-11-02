# Testing Configuration System

This document explains how to use the testing configuration system for development and testing without authentication.

## Overview

The testing configuration system allows you to:
- Bypass Firebase authentication during development
- Set mock user data (email, tenant ID, role) for API calls
- Switch between different user roles and tenants for testing
- Use the same configuration across frontend and backend

## Files

- `src/config/testing.ts` - Main testing configuration
- `src/utils/testing.ts` - Testing utilities and helpers
- `src/lib/queryClient.ts` - Updated to use testing headers

## Configuration

### Default Configuration

The default testing configuration provides an Owner user with Demo tenant (tenant 1) access:

```typescript
{
  enabled: true,
  user: {
    email: 'owner@demo.com',
    tenantId: '1',
    role: 'Owner',
    firstName: 'Owner',
    lastName: 'Demo'
  }
}
```

### Available Configurations

These configurations match the users defined in the backend:

**Core Tenant (-919) - System users:**
- **coreSuperAdmin** - SuperAdmin with Core tenant access (`superadmin@core.com`) - *Note: SuperAdmin role is only available for Core tenant*
- **coreAdmin** - Admin with Core tenant access (`admin@core.com`)

**Demo Tenant (1) - All roles (except SuperAdmin):**
- **owner1** - Owner with Demo tenant access (`owner@demo.com`)
- **admin1** - Admin with Demo tenant access (`admin@demo.com`)
- **editor1** - Editor with Demo tenant access (`editor@demo.com`)
- **viewer1** - Viewer with Demo tenant access (`viewer@demo.com`)

**Enterprise Tenant (2) - All roles (except SuperAdmin):**
- **owner2** - Owner with Enterprise tenant access (`owner@enterprise.com`)
- **admin2** - Admin with Enterprise tenant access (`admin@enterprise.com`)
- **editor2** - Editor with Enterprise tenant access (`editor@enterprise.com`)
- **viewer2** - Viewer with Enterprise tenant access (`viewer@enterprise.com`)

## Usage

### 1. Automatic Header Setting

The system automatically sets the required headers (`X-User-Email` and `X-Tenant-ID`) for all API calls when testing mode is enabled.

### 2. Switching Configurations

#### In Code
```typescript
import { switchTestingConfig } from '@/config/testing';

// Core Tenant (-919)
switchTestingConfig('coreSuperAdmin');  // SuperAdmin Core tenant (SuperAdmin only available for Core tenant)
switchTestingConfig('coreAdmin');       // Admin Core tenant

// Demo Tenant (1)
switchTestingConfig('owner1');          // Owner Demo tenant
switchTestingConfig('admin1');          // Admin Demo tenant
switchTestingConfig('editor1');         // Editor Demo tenant
switchTestingConfig('viewer1');         // Viewer Demo tenant

// Enterprise Tenant (2)
switchTestingConfig('owner2');          // Owner Enterprise tenant
switchTestingConfig('admin2');          // Admin Enterprise tenant
switchTestingConfig('editor2');         // Editor Enterprise tenant
switchTestingConfig('viewer2');         // Viewer Enterprise tenant
```

#### In Browser Console (Development)
```javascript
// Available in development mode
TestingUtils.useSuperAdmin();    // SuperAdmin Core tenant (-919) - SuperAdmin only available for Core tenant
TestingUtils.useOwner();         // Owner Enterprise tenant (2)
TestingUtils.useRegularUser();  // Editor Enterprise tenant (2)
TestingUtils.useViewer();        // Viewer Enterprise tenant (2)
TestingUtils.logUserInfo();
```

### 3. Checking Current Configuration

```typescript
import { getTestingConfig, isTestingModeEnabled } from '@/config/testing';

if (isTestingModeEnabled()) {
  const config = getTestingConfig();
  console.log('Current user:', config.user.email);
  console.log('Current tenant:', config.user.tenantId);
  console.log('Current role:', config.user.role);
}
```

## Backend Integration

The backend expects these headers:
- `X-User-Email` - User's email address
- `X-Tenant-ID` - Tenant ID (string)

The backend's `no_auth_decorator` bypasses authentication but still expects these headers to populate the request object with user information.

## Enabling/Disabling Testing Mode

### Method 1: Browser Console (Recommended for Development)
```javascript
// Toggle testing mode on/off
TestingUtils.toggle();

// Enable testing mode
TestingUtils.enable();

// Disable testing mode
TestingUtils.disable();

// Check current status
TestingUtils.isEnabled();
```

### Method 2: Code Configuration
```typescript
// In src/config/testing.ts
export const testingConfig: TestingConfig = {
  enabled: true, // Set to true/false
  // ... rest of config
};
```

### Method 3: Programmatic Toggle
```typescript
import { toggleTestingMode, enableTestingMode, disableTestingMode } from '@/config/testing';

// Toggle current state
toggleTestingMode();

// Set specific state
toggleTestingMode(true);  // Enable
toggleTestingMode(false); // Disable

// Direct enable/disable
enableTestingMode();
disableTestingMode();
```

When disabled, the system will fall back to Firebase authentication.

## Custom Configurations

### Adding New Configurations

Add new configurations to `testingConfigs` in `src/config/testing.ts`:

```typescript
export const testingConfigs = {
  // ... existing configs
  
  customUser: {
    enabled: true,
    user: {
      email: 'custom@example.com',
      tenantId: '999',
      role: 'Admin',
      firstName: 'Custom',
      lastName: 'User'
    },
    api: {
      baseUrl: '/api',
      includeCredentials: true
    }
  }
};
```

### Using Custom Configurations

```typescript
switchTestingConfig('customUser');
```

## Debugging

### Check Headers in Network Tab

1. Open browser DevTools
2. Go to Network tab
3. Make an API request
4. Check the request headers for `X-User-Email` and `X-Tenant-ID`

### Console Logging

The system logs testing headers when they're used:

```
Using testing headers: {
  "X-User-Email": "owner@demo.com",
  "X-Tenant-ID": "1"
}
```

### User Info Logging

```javascript
// In browser console
TestingUtils.logUserInfo();
```

## Troubleshooting

### Headers Not Set

1. Check that `testingConfig.enabled` is `true`
2. Verify the import in `queryClient.ts` is correct
3. Check browser console for any errors

### Backend Not Receiving Headers

1. Verify the headers appear in Network tab
2. Check backend logs for authentication attempts
3. Ensure `no_auth_decorator` is properly configured

### Wrong User Data

1. Check current configuration: `TestingUtils.getCurrentConfig()`
2. Switch to correct configuration: `TestingUtils.useSuperAdmin()` (for Core tenant) or `TestingUtils.useOwner()` (for other tenants)
3. Verify the configuration matches your needs

## Quick Reference

### Toggle Testing Mode
```javascript
TestingUtils.toggle();    // Toggle on/off
TestingUtils.enable();     // Enable testing
TestingUtils.disable();    // Disable testing
TestingUtils.isEnabled();  // Check status
```

### Switch User Roles
```javascript
TestingUtils.useSuperAdmin();    // SuperAdmin with Core tenant (superadmin@core.com) - SuperAdmin only available for Core tenant
TestingUtils.useOwner();         // Owner with Enterprise tenant (owner@enterprise.com)
TestingUtils.useRegularUser();  // Editor with Enterprise tenant (editor@enterprise.com)
TestingUtils.useViewer();        // Viewer with Enterprise tenant (viewer@enterprise.com)

// Additional configurations available via switchTestingConfig():
// Core Tenant (-919):
//   - coreSuperAdmin: SuperAdmin Core tenant (superadmin@core.com) - SuperAdmin only available for Core tenant
//   - coreAdmin: Admin Core tenant (admin@core.com)
// Demo Tenant (1):
//   - owner1: Owner Demo tenant (owner@demo.com)
//   - admin1: Admin Demo tenant (admin@demo.com)
//   - editor1: Editor Demo tenant (editor@demo.com)
//   - viewer1: Viewer Demo tenant (viewer@demo.com)
// Enterprise Tenant (2):
//   - owner2: Owner Enterprise tenant (owner@enterprise.com)
//   - admin2: Admin Enterprise tenant (admin@enterprise.com)
//   - editor2: Editor Enterprise tenant (editor@enterprise.com)
//   - viewer2: Viewer Enterprise tenant (viewer@enterprise.com)
```

### Debug & Info
```javascript
TestingUtils.logUserInfo();      // Show current user
TestingUtils.getCurrentConfig(); // Show full config
TestingUtils.listConfigs();      // List available configs
```

## Example Workflow

1. **Start Development**
   ```bash
   npm run dev
   ```

2. **Enable Testing Mode**
   ```javascript
   TestingUtils.enable();
   ```

3. **Check Current User**
   ```javascript
   TestingUtils.logUserInfo();
   ```

4. **Switch to Different Role**
   ```javascript
   TestingUtils.useViewer(); // Test read-only access
   ```

5. **Make API Calls**
   - Headers are automatically set
   - Check Network tab to verify

6. **Switch Back**
   ```javascript
   TestingUtils.useSuperAdmin(); // Back to full access (Core tenant SuperAdmin)
   // or
   TestingUtils.useOwner(); // For Owner role in other tenants
   ```

7. **Disable Testing When Done**
   ```javascript
   TestingUtils.disable(); // Back to Firebase auth
   ```
