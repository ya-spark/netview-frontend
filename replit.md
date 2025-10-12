# NetView - Multi-Tenant SaaS Monitoring Platform

## Overview

NetView is a comprehensive multi-tenant SaaS platform designed for website, API, security, and browser monitoring. The platform enables organizations to monitor their digital infrastructure through customizable probes, receive real-time alerts, and access detailed analytics. Built with a modern tech stack, it features a React frontend, Node.js/Express backend with PostgreSQL database, and Python Flask gateway services for distributed monitoring.

The system supports multiple user roles (SuperAdmin, Owner, Admin, Editor, Helpdesk, Viewer) and implements credit-based billing through Stripe integration. The platform includes AI-powered probe generation using Anthropic's Claude model and supports both core and custom monitoring gateways for global coverage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: React 18 with TypeScript, Vite build system
- **UI Framework**: Radix UI components with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system and CSS variables
- **State Management**: TanStack Query for server state, React Context for authentication
- **Routing**: Wouter for client-side routing
- **Authentication**: Firebase Authentication with JWT tokens

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with type-safe schema definitions
- **API Design**: RESTful APIs with role-based access control
- **Authentication**: Firebase Admin SDK for token verification
- **Session Management**: Express sessions with PostgreSQL store
- **Middleware**: Custom API interceptors for logging, rate limiting, and analytics
- **Logging**: Rotating file logger with configurable storage limits (see LOGGING.md)

### Gateway Architecture
- **Technology**: Python Flask applications for probe execution
- **Design Pattern**: Distributed gateway network (Core and Custom gateways)
- **Probe Types**: Uptime, API, Security, Browser monitoring
- **Synchronization**: Periodic sync with backend for probe configurations and results
- **Storage**: Local SQLite for result caching before sync

### Database Design
- **Primary Database**: PostgreSQL with multi-tenant architecture
- **Schema Management**: Drizzle migrations with version control
- **Key Tables**: Users, Tenants, Probes, Gateways, NotificationGroups, ProbeResults
- **Relationships**: Proper foreign key constraints and indexes for performance
- **Multi-tenancy**: Tenant-based data isolation and access control

### Authentication & Authorization
- **Authentication**: Firebase Authentication with custom token verification
- **Authorization**: Role-based access control (RBAC) with hierarchical permissions
- **API Security**: API key management system for gateway authentication
- **Session Management**: Secure session handling with httpOnly cookies
- **Development Mode**: Mock authentication for local development without Firebase

#### Authentication Flow & Token Management
- **Google Sign-In Flow**: Uses Firebase `signInWithRedirect` for seamless OAuth integration
- **Token Injection**: Query client automatically includes Firebase ID tokens in all API request headers
- **Protected Routes**: All queries gated with `enabled: !!user` to prevent unauthenticated requests
- **Session Persistence**: Firebase handles token refresh and session management across page reloads
- **Backend Verification**: Express middleware validates Firebase tokens on protected endpoints

### Real-time Features
- **Monitoring**: Continuous probe execution through gateway network
- **Notifications**: Multi-channel notification system (email, SMS, webhooks)
- **Alerting**: Configurable alert thresholds with notification groups
- **Rate Limiting**: Built-in rate limiting to prevent abuse

## External Dependencies

### Cloud Services
- **Neon Database**: Managed PostgreSQL hosting with serverless capabilities
- **Firebase**: Authentication service with Google OAuth integration
- **Stripe**: Payment processing and subscription management
- **Anthropic Claude**: AI-powered probe generation and optimization suggestions

### Third-Party APIs
- **Stripe API**: Subscription billing, customer management, and payment processing
- **Firebase Admin SDK**: Server-side authentication token verification
- **Anthropic API**: AI model integration for intelligent probe creation

### External Libraries & Frameworks
- **Frontend**: React, Vite, TanStack Query, Radix UI, Tailwind CSS, Wouter
- **Backend**: Express.js, Drizzle ORM, Firebase Admin, Stripe Node.js SDK
- **Gateway**: Flask, Requests, DNSPython, Selenium (for browser monitoring)
- **Development**: TypeScript, ESLint, Prettier, PostCSS

### Optional Integrations
- **Browser Monitoring**: Selenium WebDriver with Chrome/Chromium
- **SMS Notifications**: Configurable SMS provider integration
- **Webhook Notifications**: Custom webhook endpoint support
- **SSL/TLS Monitoring**: Certificate validation and expiration tracking

### Environment Configuration
- **Database**: DATABASE_URL for PostgreSQL connection
- **Authentication**: Firebase service account credentials
- **Payments**: Stripe secret and public keys
- **AI Services**: Anthropic API key for Claude model access
- **Gateway**: API keys for secure gateway-backend communication
- **Contact**: Configurable contact email (contact@yaseenmd.com)
- **Logging**: LOG_MAX_TOTAL_SIZE_MB, LOG_MAX_FILE_SIZE_MB, LOG_DIRECTORY (see LOGGING.md)