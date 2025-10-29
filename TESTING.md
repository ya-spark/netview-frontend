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

The default testing configuration provides a SuperAdmin user:

```typescript
{
  enabled: true,
  user: {
    email: 'demo@netview.com',
    tenantId: '-919',
    role: 'SuperAdmin',
    firstName: 'Demo',
    lastName: 'User'
  }
}
```

### Available Configurations

- **superAdmin** - SuperAdmin with Core tenant access (-919)
- **owner** - Owner role with tenant ID 2
- **regularUser** - Editor role with tenant ID 2
- **viewer** - Viewer role with tenant ID 2

## Usage

### 1. Automatic Header Setting

The system automatically sets the required headers (`X-User-Email` and `X-Tenant-ID`) for all API calls when testing mode is enabled.

### 2. Switching Configurations

#### In Code
```typescript
import { switchTestingConfig } from '@/config/testing';

// Switch to different user roles
switchTestingConfig('superAdmin');
switchTestingConfig('owner');
switchTestingConfig('regularUser');
switchTestingConfig('viewer');
```

#### In Browser Console (Development)
```javascript
// Available in development mode
TestingUtils.useSuperAdmin();
TestingUtils.useOwner();
TestingUtils.useRegularUser();
TestingUtils.useViewer();
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
  "X-User-Email": "demo@netview.com",
  "X-Tenant-ID": "-919"
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
2. Switch to correct configuration: `TestingUtils.useSuperAdmin()`
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
TestingUtils.useSuperAdmin();    // SuperAdmin with Core tenant (-919)
TestingUtils.useOwner();         // Owner with tenant 2
TestingUtils.useRegularUser();  // Editor with tenant 2
TestingUtils.useViewer();        // Viewer with tenant 2
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
   TestingUtils.useSuperAdmin(); // Back to full access
   ```

7. **Disable Testing When Done**
   ```javascript
   TestingUtils.disable(); // Back to Firebase auth
   ```
