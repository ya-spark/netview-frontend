# Best Practices & Benchmarking Guide

## Repository Note

**This is a frontend-only repository.** This document provides benchmarks and best practices for the NetView frontend application. Backend benchmarks are documented separately.

## Overview

This document establishes performance benchmarks, code quality standards, and best practices for the NetView frontend application. Use these metrics to guide development decisions and ensure consistent quality across the codebase.

## Performance Benchmarks

### Bundle Size Targets

**Production Build Targets**:
- **Initial Bundle (main.js)**: < 200 KB (gzipped)
- **Total Bundle Size**: < 500 KB (gzipped)
- **Vendor Chunks**: < 300 KB (gzipped)
- **CSS Bundle**: < 50 KB (gzipped)

**Measurement**:
```bash
npm run build
# Check dist/public/assets/ for bundle sizes
```

**Optimization Strategies**:
- Code splitting for routes (lazy loading)
- Tree shaking unused dependencies
- Dynamic imports for heavy components
- Optimize images and assets
- Use Vite's built-in chunking strategy

### Load Time Benchmarks

**Core Web Vitals Targets**:
- **First Contentful Paint (FCP)**: < 1.8 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **Time to Interactive (TTI)**: < 3.8 seconds
- **Total Blocking Time (TBT)**: < 200 milliseconds
- **Cumulative Layout Shift (CLS)**: < 0.1

**Measurement Tools**:
- Chrome DevTools Lighthouse
- WebPageTest
- Google PageSpeed Insights
- Real User Monitoring (RUM) in production

### Runtime Performance

**Component Render Targets**:
- **Initial Render**: < 100ms for simple components
- **Re-render Time**: < 50ms for updates
- **List Rendering**: < 16ms per item (60 FPS)

**Memory Usage**:
- **Initial Load**: < 50 MB
- **Peak Memory**: < 150 MB
- **Memory Leaks**: Zero tolerance

**Measurement**:
```javascript
// Use React DevTools Profiler
// Use Chrome Performance tab
// Monitor memory in production
```

## Code Quality Benchmarks

### TypeScript Standards

**Type Coverage**:
- **Target**: 100% type coverage
- **Strict Mode**: Enabled
- **No `any` types**: Use `unknown` or proper types
- **No implicit any**: All parameters and returns typed

**Type Safety Checklist**:
- ✅ All function parameters typed
- ✅ All return types explicit
- ✅ No `@ts-ignore` or `@ts-expect-error` without justification
- ✅ Proper generic constraints
- ✅ Discriminated unions for state management

### Code Complexity

**Cyclomatic Complexity**:
- **Functions**: < 10
- **Components**: < 15
- **Complex logic**: Extract to utilities or hooks

**File Size**:
- **Components**: < 500 lines
- **Utilities**: < 300 lines
- **Services**: < 400 lines
- **Split large files**: Use composition and modules

### Code Organization

**Import Organization**:
```typescript
// 1. External dependencies
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal modules
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

// 3. Types
import type { Probe } from '@/types/probe';

// 4. Utilities
import { logger } from '@/lib/logger';
```

**Component Structure**:
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Component
// 4. Exports
```

## API Performance Benchmarks

### Response Time Targets

**API Endpoint Targets**:
- **GET Requests**: < 200ms (p95)
- **POST/PUT Requests**: < 500ms (p95)
- **DELETE Requests**: < 300ms (p95)
- **Bulk Operations**: < 2s (p95)

**Frontend Handling**:
- **Request Timeout**: 30 seconds
- **Retry Logic**: 3 attempts with exponential backoff
- **Cache Strategy**: 
  - Static data: 5 minutes
  - Dynamic data: 30 seconds
  - User-specific: 1 minute

### TanStack Query Configuration

**Query Settings**:
```typescript
{
  staleTime: 30000, // 30 seconds
  cacheTime: 300000, // 5 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
}
```

**Query Key Patterns**:
- Use hierarchical keys: `['/api/probes', id]`
- Invalidate parent keys to clear related cache
- Use specific keys for targeted updates

## Accessibility Benchmarks

### WCAG 2.1 Compliance

**Target Level**: AA (minimum)

**Key Metrics**:
- **Keyboard Navigation**: 100% of interactive elements accessible
- **Screen Reader Support**: All content readable
- **Color Contrast**: Minimum 4.5:1 for text, 3:1 for UI components
- **Focus Indicators**: Visible on all focusable elements
- **ARIA Labels**: All interactive elements labeled

**Testing Tools**:
- axe DevTools
- WAVE browser extension
- Lighthouse accessibility audit
- Keyboard-only navigation testing
- Screen reader testing (NVDA, JAWS, VoiceOver)

### Accessibility Checklist

- ✅ All images have alt text
- ✅ Form inputs have labels
- ✅ Buttons have descriptive text or aria-label
- ✅ Color is not the only indicator
- ✅ Focus order is logical
- ✅ Skip links for navigation
- ✅ ARIA landmarks used appropriately
- ✅ Error messages are accessible

## Security Benchmarks

### Frontend Security Standards

**Security Checklist**:
- ✅ No sensitive data in client-side code
- ✅ Environment variables prefixed with `VITE_` only
- ✅ Input validation on all forms
- ✅ XSS prevention (React auto-escapes)
- ✅ CSRF protection via Firebase tokens
- ✅ Secure token storage (Firebase handles)
- ✅ HTTPS only in production
- ✅ Content Security Policy (CSP) headers
- ✅ No eval() or dangerous code execution

### Dependency Security

**Audit Frequency**: Weekly
- Run `npm audit` regularly
- Update dependencies with security patches immediately
- Use `npm audit fix` for automatic fixes
- Review and test before updating major versions

**Vulnerability Targets**:
- **Critical**: Fix within 24 hours
- **High**: Fix within 1 week
- **Medium**: Fix within 1 month
- **Low**: Fix in next release cycle

## Testing Benchmarks

### Test Coverage Targets

**Coverage Goals**:
- **Unit Tests**: > 80% coverage
- **Component Tests**: > 70% coverage
- **Integration Tests**: Critical paths 100%
- **E2E Tests**: Core user flows 100%

**Test Quality**:
- Tests should be fast (< 100ms per test)
- Tests should be independent
- Tests should be maintainable
- Tests should test behavior, not implementation

### Testing Tools

**Recommended Stack**:
- **Unit/Component**: Vitest + React Testing Library
- **E2E**: Playwright or Cypress
- **Visual Regression**: Percy or Chromatic
- **Accessibility**: jest-axe

## SEO Benchmarks

### Meta Tags & SEO

**Required Meta Tags**:
- `<title>`: Unique, descriptive, < 60 characters
- `<meta name="description">`: 150-160 characters
- `<meta name="viewport">`: Properly configured
- Open Graph tags for social sharing
- Twitter Card tags

**Performance Impact**:
- SEO should not negatively impact performance
- Server-side rendering (SSR) considered for public pages
- Proper semantic HTML structure

## React Best Practices

### Component Patterns

**Functional Components**:
- Prefer functional components over class components
- Use hooks for state and side effects
- Keep components small and focused

**Performance Optimization**:
```typescript
// Use React.memo for expensive renders
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Use useCallback for stable function references
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

**State Management**:
- Server state: TanStack Query
- Global UI state: React Context (sparingly)
- Local state: useState/useReducer
- Form state: React Hook Form

### Hooks Best Practices

**Custom Hooks**:
- Extract reusable logic to custom hooks
- Prefix with `use` (e.g., `useProbeData`)
- Return consistent interface
- Document hook dependencies

**Hook Rules**:
- ✅ Only call hooks at top level
- ✅ Only call hooks from React functions
- ✅ Use exhaustive-deps in useEffect
- ✅ Clean up side effects in useEffect

## Styling Benchmarks

### Tailwind CSS Standards

**Class Organization**:
```tsx
// Order: layout, spacing, sizing, typography, colors, effects
<div className="flex items-center gap-4 p-6 w-full text-lg bg-white dark:bg-slate-900 rounded-lg shadow-md">
```

**Performance**:
- Use Tailwind's JIT mode (default in v3+)
- Purge unused styles in production
- Avoid inline styles when Tailwind classes exist
- Use CSS variables for theme values

**Dark Mode**:
- Always specify both light and dark variants
- Test in both modes
- Use semantic color tokens

## Error Handling Benchmarks

### Error Boundaries

**Implementation**:
- Error boundaries for route-level components
- Fallback UI for error states
- Error logging to monitoring service
- User-friendly error messages

**Error Handling Pattern**:
```typescript
try {
  await apiRequest('/api/probes', data);
} catch (error) {
  logger.exception('Operation failed', error as Error, {
    component: 'ComponentName',
    action: 'operationName',
  });
  toast({
    title: 'Error',
    description: 'User-friendly message',
    variant: 'destructive',
  });
}
```

## Logging Benchmarks

### Logging Standards

**Log Levels**:
- **DEBUG**: Development only, detailed information
- **INFO**: Important user actions, state changes
- **WARN**: Non-critical issues, deprecations
- **ERROR**: Errors, exceptions, failures

**Logging Best Practices**:
- ✅ Use structured logging with context
- ✅ Never log sensitive data (passwords, tokens, PII)
- ✅ Include component and action in logs
- ✅ Use appropriate log levels
- ✅ Log errors with full context

**Performance Impact**:
- Logging should not block main thread
- Use async logging in production
- Consider log sampling for high-volume operations

## Build & Deployment Benchmarks

### Build Performance

**Build Time Targets**:
- **Development Server Start**: < 3 seconds
- **Production Build**: < 2 minutes
- **Incremental Builds**: < 30 seconds

**Optimization**:
- Use Vite's fast HMR
- Optimize imports
- Use build caching
- Parallel processing where possible

### Deployment

**Deployment Checklist**:
- ✅ All tests passing
- ✅ Build succeeds without warnings
- ✅ Bundle size within targets
- ✅ Environment variables configured
- ✅ Security audit passed
- ✅ Performance benchmarks met
- ✅ Accessibility audit passed

## Monitoring & Measurement

### Performance Monitoring

**Key Metrics to Track**:
- Page load times
- API response times
- Error rates
- User interactions
- Bundle sizes over time

**Tools**:
- Browser DevTools
- Lighthouse CI
- Real User Monitoring (RUM)
- Error tracking (Sentry, etc.)
- Analytics (Google Analytics, etc.)

### Regular Audits

**Weekly**:
- Dependency security audit
- Bundle size check
- Performance regression testing

**Monthly**:
- Full accessibility audit
- Code quality review
- Performance optimization review
- Documentation updates

**Per Release**:
- Full test suite
- Security audit
- Performance benchmarks
- User acceptance testing

## Benchmarking Tools

### Recommended Tools

**Performance**:
- Lighthouse (Chrome DevTools)
- WebPageTest
- Chrome Performance Profiler
- React DevTools Profiler
- Bundle Analyzer (vite-bundle-visualizer)

**Code Quality**:
- ESLint
- TypeScript compiler
- Prettier
- SonarQube (optional)

**Accessibility**:
- axe DevTools
- WAVE
- Lighthouse accessibility audit
- Keyboard navigation testing

**Security**:
- npm audit
- Snyk
- OWASP ZAP (for security testing)

## Continuous Improvement

### Benchmark Review Process

1. **Measure**: Use tools to gather metrics
2. **Compare**: Compare against targets
3. **Identify**: Find areas for improvement
4. **Prioritize**: Focus on high-impact changes
5. **Implement**: Make optimizations
6. **Verify**: Re-measure to confirm improvements
7. **Document**: Update benchmarks if needed

### Updating Benchmarks

Benchmarks should be reviewed and updated:
- When technology stack changes
- When user requirements change
- When industry standards evolve
- Quarterly as part of regular maintenance

## Quick Reference Checklist

### Before Committing Code

- [ ] TypeScript compiles without errors
- [ ] No console.log statements (use logger)
- [ ] All tests passing
- [ ] Code follows project patterns
- [ ] No security vulnerabilities
- [ ] Performance impact considered
- [ ] Accessibility requirements met
- [ ] Documentation updated if needed

### Before Deployment

- [ ] All benchmarks met
- [ ] Security audit passed
- [ ] Performance tests passed
- [ ] Accessibility audit passed
- [ ] Bundle size within targets
- [ ] Error handling tested
- [ ] Logging configured correctly
- [ ] Environment variables set

## Resources

- [Web.dev Performance](https://web.dev/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)

---

**Last Updated**: 2024
**Maintained By**: NetView Frontend Team
