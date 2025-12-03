# NetView Documentation Index

This index helps AI assistants quickly locate the right documentation when making changes to the NetView application.

## Quick Reference Guide

### When Working With...

#### Database & Schema Changes
→ **Read**: `DATABASE.md`
- Database tables and relationships
- Schema patterns and conventions
- Storage interface methods
- Insert schemas and types

#### API Endpoints
→ **Read**: `API.md`
- All REST API endpoints
- Authentication requirements
- Request/response formats
- Role and scope requirements

#### Development Setup & Workflows
→ **Read**: `DEVELOPMENT.md`
- Tech stack overview
- Project structure
- Development workflow
- Package management
- Common pitfalls

#### Frontend Components & UI
→ **Read**: `COMPONENTS.md`
- Page components
- Route protection
- Form patterns
- State management with TanStack Query
- Styling guidelines

#### Backend Services & Business Logic
→ **Read**: `SERVICES.md`
- Authentication service (Firebase)
- Stripe payment service
- Anthropic AI service
- API Key management
- Notification system

#### Gateway System & Probe Execution
→ **Read**: `GATEWAY.md`
- Gateway architecture
- Probe execution types
- Synchronization patterns
- Deployment guidelines

#### Authentication & Authorization
→ **Read**: `AUTH.md`
- Firebase authentication flow
- API key authentication
- Role-based access control
- Scope-based permissions
- Multi-tenancy patterns

#### Logging System
→ **Read**: `LOGGING.md`
- Rotating logger configuration
- Log management
- Environment variables
- API endpoints for logs

#### Project Overview & Architecture
→ **Read**: `DEVELOPMENT.md` and `SERVICES.md`
- Platform overview
- Architecture summary
- User preferences
- External dependencies

## Documentation Files

### Core Documentation

| File | Purpose | When to Use |
|------|---------|-------------|
| `DATABASE.md` | Database schema, tables, relations, storage interface | Adding tables, modifying schema, understanding data model |
| `API.md` | REST API endpoints, authentication, request/response formats | Adding endpoints, understanding API contracts |
| `DEVELOPMENT.md` | Development setup, workflows, conventions, best practices | Setting up project, following patterns, avoiding pitfalls |
| `COMPONENTS.md` | Frontend architecture, React patterns, UI components | Building UI, adding pages, managing state |
| `SERVICES.md` | Backend services, business logic, external integrations | Adding business logic, integrating services |
| `GATEWAY.md` | Distributed gateway system, probe execution | Working with monitoring probes, gateway deployment |
| `AUTH.md` | Authentication & authorization flows | Implementing auth, managing permissions |
| `LOGGING.md` | Logging system configuration | Configuring logs, accessing log data |

### Quick Decision Tree

```
Need to make a change? Ask yourself:

┌─ Is it about data/database?
│  └─→ DATABASE.md
│
┌─ Is it about API routes/endpoints?
│  └─→ API.md
│
┌─ Is it about frontend UI/components?
│  └─→ COMPONENTS.md
│
┌─ Is it about backend logic/services?
│  └─→ SERVICES.md
│
┌─ Is it about authentication/permissions?
│  └─→ AUTH.md
│
┌─ Is it about monitoring/gateways?
│  └─→ GATEWAY.md
│
└─ Is it about development setup?
   └─→ DEVELOPMENT.md
```

## Common Tasks & Documentation

### Adding a New Feature

1. **Define data model** → `DATABASE.md`
2. **Create API endpoints** → `API.md`
3. **Implement backend logic** → `SERVICES.md`
4. **Build frontend UI** → `COMPONENTS.md`
5. **Add authentication** → `AUTH.md`
6. **Follow conventions** → `DEVELOPMENT.md`

### Debugging Issues

- **Database errors** → `DATABASE.md` (schema, relations)
- **API errors** → `API.md` (endpoints, auth)
- **Frontend errors** → `COMPONENTS.md` (React patterns, state)
- **Auth errors** → `AUTH.md` (token flow, permissions)
- **Service errors** → `SERVICES.md` (business logic)
- **Logs** → `LOGGING.md` (log access)

### Understanding Architecture

- **High-level overview** → `DEVELOPMENT.md` and `SERVICES.md`
- **Frontend architecture** → `COMPONENTS.md`
- **Backend architecture** → `SERVICES.md` + `API.md`
- **Data architecture** → `DATABASE.md`
- **Auth architecture** → `AUTH.md`
- **Monitoring architecture** → `GATEWAY.md`

## Documentation Maintenance

### When to Update Documentation

- **Schema changes** → Update `DATABASE.md`
- **New API endpoints** → Update `API.md`
- **New services** → Update `SERVICES.md`
- **New components** → Update `COMPONENTS.md`
- **Auth changes** → Update `AUTH.md`
- **Gateway changes** → Update `GATEWAY.md`

### Documentation Standards

All documentation should include:
- ✅ Clear section headers
- ✅ Code examples with syntax highlighting
- ✅ File paths and locations
- ✅ Common patterns and anti-patterns
- ✅ Error handling examples
- ✅ Best practices

## Tips for AI Assistants

1. **Read before writing**: Always check relevant docs before making changes
2. **Follow patterns**: Use established patterns from documentation
3. **Stay consistent**: Match existing code style and conventions
4. **Update docs**: Keep documentation in sync with code changes
5. **Cross-reference**: Related changes may affect multiple systems

## Key Patterns to Remember

### Database
- Use Drizzle ORM with type-safe schemas
- Storage interface for all DB operations
- Run `npm run db:push` for migrations

### Frontend
- TanStack Query for server state
- React Hook Form + Zod for forms
- Wouter for routing
- shadcn/ui for components

### Backend
- Express.js with TypeScript
- Firebase for auth
- Service layer for business logic
- Middleware for cross-cutting concerns

### Authentication
- Firebase JWT for users
- API keys for programmatic access
- Role-based + scope-based authorization
- Tenant isolation

### Gateway
- Python Flask for probe execution
- SQLite for local caching
- Distributed monitoring network
- Multiple probe types (Uptime, API, Security, Browser)
