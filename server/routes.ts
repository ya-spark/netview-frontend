import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateUser, requireRole, createDefaultSuperAdmins } from "./services/auth";
import { stripe, createOrGetCustomer, createSubscription, PRICING_PLANS } from "./services/stripe";
import { generateProbeFromCode, suggestProbeImprovements } from "./services/anthropic";
import { insertUserSchema, insertTenantSchema, insertProbeSchema, insertGatewaySchema, insertNotificationGroupSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import { getApiStats } from "./middleware/api-interceptor";
import { sendNotification, sendToGroup, getNotificationStats, getNotificationLogs } from "./services/notification-manager";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default SuperAdmins
  await createDefaultSuperAdmins();

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { firebaseUid, email, firstName, lastName, company, region } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByFirebaseUid(firebaseUid);
      if (existingUser) {
        return res.json(existingUser);
      }

      // Check if this is a default SuperAdmin
      const defaultSuperAdmins = ['Yaseen.gem@gmail.com', 'Asia.Yaseentech@gmail.com', 'contact@yaseenmd.com'];
      let role = 'Viewer';
      let tenantId = null;

      if (defaultSuperAdmins.includes(email)) {
        role = 'SuperAdmin';
      } else {
        // Create a new tenant for non-SuperAdmin users
        const tenant = await storage.createTenant({
          name: company || `${firstName} ${lastName}'s Organization`,
          subdomain: company?.toLowerCase().replace(/\s+/g, '-') || undefined,
        });
        tenantId = tenant.id;
        role = 'Owner'; // First user in tenant becomes Owner
      }

      const userData = insertUserSchema.parse({
        firebaseUid,
        email,
        firstName,
        lastName,
        company,
        region,
        role,
        tenantId,
      });

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.get("/api/auth/me", authenticateUser, async (req, res) => {
    res.json(req.user);
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", authenticateUser, async (req, res) => {
    try {
      if (!req.user?.tenantId) {
        return res.status(400).json({ message: 'No tenant associated' });
      }

      const stats = await storage.getDashboardStats(req.user.tenantId);
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // Probe routes
  app.get("/api/probes", authenticateUser, async (req, res) => {
    try {
      if (req.user?.role === 'SuperAdmin') {
        // SuperAdmins can see all probes across all tenants
        const allProbes = await storage.getProbesByTenant(''); // This would need modification in storage
        res.json(allProbes);
      } else if (req.user?.tenantId) {
        const probes = await storage.getProbesByTenant(req.user.tenantId);
        res.json(probes);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error('Fetch probes error:', error);
      res.status(500).json({ message: 'Failed to fetch probes' });
    }
  });

  app.post("/api/probes", authenticateUser, requireRole(['SuperAdmin', 'Owner', 'Admin', 'Editor']), async (req, res) => {
    try {
      if (!req.user?.tenantId && req.user?.role !== 'SuperAdmin') {
        return res.status(400).json({ message: 'No tenant associated' });
      }

      const probeData = insertProbeSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
      });

      const probe = await storage.createProbe(probeData);
      res.json(probe);
    } catch (error) {
      console.error('Create probe error:', error);
      res.status(500).json({ message: 'Failed to create probe' });
    }
  });

  app.put("/api/probes/:id", authenticateUser, requireRole(['SuperAdmin', 'Owner', 'Admin', 'Editor']), async (req, res) => {
    try {
      const { id } = req.params;
      const existingProbe = await storage.getProbe(id);
      
      if (!existingProbe) {
        return res.status(404).json({ message: 'Probe not found' });
      }

      // Check permissions
      if (req.user?.role !== 'SuperAdmin' && existingProbe.tenantId !== req.user?.tenantId) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const updates = insertProbeSchema.partial().parse(req.body);
      const probe = await storage.updateProbe(id, updates);
      res.json(probe);
    } catch (error) {
      console.error('Update probe error:', error);
      res.status(500).json({ message: 'Failed to update probe' });
    }
  });

  app.delete("/api/probes/:id", authenticateUser, requireRole(['SuperAdmin', 'Owner', 'Admin', 'Editor']), async (req, res) => {
    try {
      const { id } = req.params;
      const existingProbe = await storage.getProbe(id);
      
      if (!existingProbe) {
        return res.status(404).json({ message: 'Probe not found' });
      }

      // Check permissions
      if (req.user?.role !== 'SuperAdmin' && existingProbe.tenantId !== req.user?.tenantId) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      await storage.deleteProbe(id);
      res.json({ message: 'Probe deleted successfully' });
    } catch (error) {
      console.error('Delete probe error:', error);
      res.status(500).json({ message: 'Failed to delete probe' });
    }
  });

  // AI-powered probe generation
  app.post("/api/probes/generate", authenticateUser, requireRole(['SuperAdmin', 'Owner', 'Admin', 'Editor']), async (req, res) => {
    try {
      const { url, code, description } = req.body;
      
      if (!url && !code) {
        return res.status(400).json({ message: 'Either URL or code must be provided' });
      }

      const generatedProbes = await generateProbeFromCode({ url, code, description });
      res.json(generatedProbes);
    } catch (error) {
      console.error('Generate probes error:', error);
      res.status(500).json({ message: 'Failed to generate probes' });
    }
  });

  // Gateway routes
  app.get("/api/gateways", authenticateUser, async (req, res) => {
    try {
      if (req.user?.role === 'SuperAdmin') {
        const coreGateways = await storage.getCoreGateways();
        res.json(coreGateways);
      } else if (req.user?.tenantId) {
        const customGateways = await storage.getCustomGateways(req.user.tenantId);
        const coreGateways = await storage.getCoreGateways();
        res.json([...coreGateways, ...customGateways]);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error('Fetch gateways error:', error);
      res.status(500).json({ message: 'Failed to fetch gateways' });
    }
  });

  app.post("/api/gateways", authenticateUser, requireRole(['SuperAdmin', 'Owner', 'Admin']), async (req, res) => {
    try {
      const gatewayData = insertGatewaySchema.parse({
        ...req.body,
        type: req.user?.role === 'SuperAdmin' ? req.body.type : 'Custom',
        tenantId: req.user?.role === 'SuperAdmin' ? req.body.tenantId : req.user?.tenantId,
      });

      const gateway = await storage.createGateway(gatewayData);
      res.json(gateway);
    } catch (error) {
      console.error('Create gateway error:', error);
      res.status(500).json({ message: 'Failed to create gateway' });
    }
  });

  // Notification Groups routes
  app.get("/api/notification-groups", authenticateUser, async (req, res) => {
    try {
      if (!req.user?.tenantId) {
        return res.json([]);
      }

      const groups = await storage.getNotificationGroupsByTenant(req.user.tenantId);
      res.json(groups);
    } catch (error) {
      console.error('Fetch notification groups error:', error);
      res.status(500).json({ message: 'Failed to fetch notification groups' });
    }
  });

  app.post("/api/notification-groups", authenticateUser, requireRole(['SuperAdmin', 'Owner', 'Admin', 'Editor']), async (req, res) => {
    try {
      if (!req.user?.tenantId) {
        return res.status(400).json({ message: 'No tenant associated' });
      }

      const groupData = insertNotificationGroupSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
      });

      const group = await storage.createNotificationGroup(groupData);
      res.json(group);
    } catch (error) {
      console.error('Create notification group error:', error);
      res.status(500).json({ message: 'Failed to create notification group' });
    }
  });

  // Billing routes
  app.post("/api/billing/create-subscription", authenticateUser, async (req, res) => {
    try {
      const { plan } = req.body;
      
      if (!PRICING_PLANS[plan as keyof typeof PRICING_PLANS]) {
        return res.status(400).json({ message: 'Invalid plan' });
      }

      const pricingPlan = PRICING_PLANS[plan as keyof typeof PRICING_PLANS];
      
      if (!pricingPlan.stripePriceId) {
        return res.status(400).json({ message: 'Free plan does not require subscription' });
      }

      // Create or get Stripe customer
      const customer = await createOrGetCustomer(
        req.user!.email,
        `${req.user!.firstName} ${req.user!.lastName}`
      );

      // Update user with Stripe customer ID
      await storage.updateStripeCustomerId(req.user!.id, customer.id);

      // Create subscription
      const subscription = await createSubscription(customer.id, pricingPlan.stripePriceId);

      // Update user with subscription ID
      await storage.updateUserStripeInfo(req.user!.id, {
        customerId: customer.id,
        subscriptionId: subscription.id,
      });

      const invoice = subscription.latest_invoice as any;
      const paymentIntent = invoice?.payment_intent;

      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret,
      });
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({ message: 'Failed to create subscription' });
    }
  });

  // Gateway API for probe results
  app.post("/api/gateway/results", async (req, res) => {
    try {
      const { apiKey, results } = req.body;
      
      if (!apiKey) {
        return res.status(401).json({ message: 'API key required' });
      }

      const gateway = await storage.getGatewayByApiKey(apiKey);
      if (!gateway) {
        return res.status(401).json({ message: 'Invalid API key' });
      }

      // Update gateway heartbeat
      await storage.updateGatewayHeartbeat(gateway.id);

      // Store probe results
      for (const result of results) {
        await storage.createProbeResult({
          ...result,
          gatewayId: gateway.id,
        });
      }

      res.json({ message: 'Results stored successfully' });
    } catch (error) {
      console.error('Store results error:', error);
      res.status(500).json({ message: 'Failed to store results' });
    }
  });

  app.get("/api/gateway/probes", async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return res.status(401).json({ message: 'API key required' });
      }

      const gateway = await storage.getGatewayByApiKey(apiKey);
      if (!gateway) {
        return res.status(401).json({ message: 'Invalid API key' });
      }

      // For now, return all active probes
      // In a real implementation, you'd filter by gateway assignments
      let probes;
      if (gateway.type === 'Core') {
        // Core gateways can execute probes from all tenants
        probes = await storage.getProbesByTenant('');
      } else {
        // Custom gateways only execute probes from their tenant
        probes = await storage.getProbesByTenant(gateway.tenantId!);
      }

      res.json(probes.filter(probe => probe.isActive));
    } catch (error) {
      console.error('Fetch gateway probes error:', error);
      res.status(500).json({ message: 'Failed to fetch probes' });
    }
  });

  // API Statistics endpoint (SuperAdmin only)
  app.get("/api/admin/api-stats", authenticateUser, requireRole(['SuperAdmin']), async (req, res) => {
    try {
      const stats = getApiStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('API stats error:', error);
      res.status(500).json({ message: 'Failed to fetch API statistics' });
    }
  });

  // Notification management endpoints
  
  // Send test notification (Admin+ only)
  app.post("/api/admin/notifications/send", authenticateUser, requireRole(['SuperAdmin', 'Owner', 'Admin']), async (req, res) => {
    try {
      const { type, recipient, subject, message, priority = 'medium' } = req.body;
      
      if (!type || !recipient || !message) {
        return res.status(400).json({ message: 'Missing required fields: type, recipient, message' });
      }

      if (!['email', 'sms', 'webhook'].includes(type)) {
        return res.status(400).json({ message: 'Invalid notification type. Must be email, sms, or webhook' });
      }

      // Basic validation
      if (message.length > 1000) {
        return res.status(400).json({ message: 'Message too long (max 1000 characters)' });
      }
      if (subject && subject.length > 200) {
        return res.status(400).json({ message: 'Subject too long (max 200 characters)' });
      }
      if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority. Must be low, medium, high, or critical' });
      }

      const notificationPayload = {
        id: randomUUID(),
        type,
        recipient,
        subject,
        message,
        metadata: {
          tenantId: req.user!.tenantId || 'system',
          priority,
        }
      };

      const result = await sendNotification(notificationPayload);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({ message: 'Failed to send notification' });
    }
  });

  // Get notification statistics (Admin+ only)
  app.get("/api/admin/notifications/stats", authenticateUser, requireRole(['SuperAdmin', 'Owner', 'Admin']), async (req, res) => {
    try {
      const stats = getNotificationStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Notification stats error:', error);
      res.status(500).json({ message: 'Failed to fetch notification statistics' });
    }
  });

  // Get notification logs (Admin+ only)
  app.get("/api/admin/notifications/logs", authenticateUser, requireRole(['SuperAdmin', 'Owner', 'Admin']), async (req, res) => {
    try {
      const { type, status, since, limit = 100 } = req.query;
      
      const filters: any = {};
      if (req.user!.role !== 'SuperAdmin' && req.user!.tenantId) {
        filters.tenantId = req.user!.tenantId; // Non-SuperAdmins see only their tenant's notifications
      }
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;
      if (since) filters.since = parseInt(since as string, 10);
      filters.limit = Math.min(parseInt(limit as string, 10), 1000); // Max 1000 logs

      const logs = getNotificationLogs(filters);
      res.json({
        success: true,
        data: logs,
        count: logs.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Notification logs error:', error);
      res.status(500).json({ message: 'Failed to fetch notification logs' });
    }
  });

  // Send notification to group (used internally by alert system) - Admin+ only for security
  app.post("/api/notifications/send-to-group", authenticateUser, requireRole(['SuperAdmin', 'Owner', 'Admin']), async (req, res) => {
    try {
      const { groupId, subject, message, priority = 'medium', probeId, alertId } = req.body;
      
      if (!groupId || !message) {
        return res.status(400).json({ message: 'Missing required fields: groupId, message' });
      }

      // Get the notification group
      const groups = await storage.getNotificationGroupsByTenant(req.user!.tenantId!);
      const group = groups.find(g => g.id === groupId);
      if (!group) {
        return res.status(404).json({ message: 'Notification group not found' });
      }

      // Check if user has access to this group
      if (req.user!.role !== 'SuperAdmin' && group.tenantId !== req.user!.tenantId) {
        return res.status(403).json({ message: 'Access denied to this notification group' });
      }

      const metadata = {
        tenantId: group.tenantId,
        probeId,
        alertId,
        priority
      };

      const results = await sendToGroup(group, subject || 'Alert Notification', message, metadata);
      res.json({
        success: true,
        data: results,
        count: results.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Send to group error:', error);
      res.status(500).json({ message: 'Failed to send notifications to group' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
