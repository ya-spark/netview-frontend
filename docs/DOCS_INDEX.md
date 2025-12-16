# NetView Frontend Documentation Index

**Repository Note**: This is a frontend-only repository. Backend code is in a separate repository (netview-controller). This module communicates with the backend via HTTP REST API only.

This index helps developers quickly locate the right documentation when working on the NetView frontend application.

## Quick Reference Guide

### When Working With...

#### Frontend Development Setup & Workflows
→ **Read**: `DEVELOPMENT.md`
- Tech stack overview (React, Vite, TypeScript)
- Project structure
- Development workflow
- Package management
- Environment variables
- Common pitfalls
- Build and deployment

#### Frontend Components & UI
→ **Read**: `COMPONENTS.md`
- Page components
- Route protection
- Form patterns (React Hook Form + Zod)
- State management with TanStack Query
- Styling guidelines (Tailwind CSS)
- Context providers
- Custom hooks

#### API Integration
→ **Read**: `API.md`
- REST API endpoints (backend reference)
- Authentication requirements
- Request/response formats
- Role and scope requirements
- How frontend communicates with backend

#### Authentication & Authorization (Frontend)
→ **Read**: `AUTH.md`
- Firebase authentication flow (frontend implementation)
- AuthContext usage
- Protected routes
- User session management
- Role-based UI rendering

#### Best Practices & Benchmarking
→ **Read**: `BENCHMARKING.md`
- Performance benchmarks and targets
- Code quality standards
- Accessibility requirements
- Security best practices
- Testing coverage goals
- Monitoring and measurement


## Documentation Files

### Core Frontend Documentation

| File | Purpose | When to Use |
|------|---------|-------------|
| `DEVELOPMENT.md` | Frontend development setup, workflows, conventions | Setting up project, following patterns, avoiding pitfalls |
| `COMPONENTS.md` | Frontend architecture, React patterns, UI components | Building UI, adding pages, managing state |
| `API.md` | REST API endpoints reference | Understanding API contracts, integrating with backend |
| `AUTH.md` | Frontend authentication implementation | Implementing auth flows, using AuthContext |
| `BENCHMARKING.md` | Performance benchmarks, code quality standards, best practices | Ensuring quality, optimizing performance, meeting standards |


### Quick Decision Tree

```
Need to make a change? Ask yourself:

┌─ Is it about frontend UI/components?
│  └─→ COMPONENTS.md
│
┌─ Is it about development setup/workflow?
│  └─→ DEVELOPMENT.md
│
┌─ Is it about API integration?
│  └─→ API.md
│
┌─ Is it about authentication (frontend)?
│  └─→ AUTH.md
│
┌─ Is it about performance or code quality?
│  └─→ BENCHMARKING.md
```

## Common Tasks & Documentation

### Adding a New Frontend Feature

1. **Understand API endpoints** → `API.md`
2. **Build frontend UI** → `COMPONENTS.md`
3. **Add authentication if needed** → `AUTH.md`
4. **Follow conventions** → `DEVELOPMENT.md`

### Debugging Issues

- **Frontend errors** → `COMPONENTS.md` (React patterns, state)
- **API errors** → `API.md` (endpoints, auth, request/response)
- **Auth errors** → `AUTH.md` (Firebase flow, token handling)
- **Build errors** → `DEVELOPMENT.md` (setup, dependencies)

### Understanding Architecture

- **Frontend architecture** → `COMPONENTS.md` + `DEVELOPMENT.md`
- **API integration** → `API.md`
- **Authentication flow** → `AUTH.md`

## Documentation Maintenance

### When to Update Documentation

- **New frontend components/pages** → Update `COMPONENTS.md`
- **New API endpoints used** → Update `API.md` (if documenting frontend usage)
- **Auth flow changes** → Update `AUTH.md`
- **Development workflow changes** → Update `DEVELOPMENT.md`
- **Performance benchmarks change** → Update `BENCHMARKING.md`
- **New quality standards** → Update `BENCHMARKING.md`

### Documentation Standards

All documentation should include:
- ✅ Clear section headers
- ✅ Code examples with syntax highlighting
- ✅ File paths and locations
- ✅ Common patterns and anti-patterns
- ✅ Error handling examples
- ✅ Best practices
- ✅ Repository note if backend-related

## Tips for Developers

1. **Read before writing**: Always check relevant docs before making changes
2. **Follow patterns**: Use established patterns from documentation
3. **Stay consistent**: Match existing code style and conventions
4. **Update docs**: Keep documentation in sync with code changes
5. **Remember**: This is frontend-only - backend code is in separate repository

## Key Patterns to Remember

### Frontend
- **State Management**: TanStack Query for server state, React Context for auth
- **Forms**: React Hook Form + Zod for validation
- **Routing**: Wouter for client-side routing
- **UI Components**: shadcn/ui built on Radix UI
- **Styling**: Tailwind CSS with dark mode support
- **Authentication**: Firebase Authentication with Google OAuth

### API Integration
- **API Requests**: Use `apiRequest()` helper from `@/lib/queryClient`
- **Query Keys**: Use array format: `['/api/probes', id]`
- **Token Injection**: Automatic via queryClient
- **Error Handling**: Check response status, handle errors gracefully

### Development
- **Environment Variables**: Must be prefixed with `VITE_` (except `PORT` which is used by Vite config)
- **Required Environment Variables**:
  - `PORT`: Development server port
  - `VITE_NETVIEW_API_URL`: Backend API URL (must match controller's host and `CONTROLLER_PORT`, e.g., `http://localhost:11001`)
- **Build Tool**: Vite for development and production builds
- **TypeScript**: Strict type checking enabled
- **Proxy**: API requests (`/api`, `/gateways`, `/health`) proxied to `VITE_NETVIEW_API_URL` in development
- **Build Output**: `dist/public/` directory
