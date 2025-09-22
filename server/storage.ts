import { 
  users, tenants, probes, gateways, notificationGroups, probeResults, alerts, probeGateways, apiKeys,
  type User, type InsertUser, type Tenant, type InsertTenant, 
  type Probe, type InsertProbe, type Gateway, type InsertGateway,
  type NotificationGroup, type InsertNotificationGroup,
  type ProbeResult, type InsertProbeResult, type Alert, type InsertAlert,
  type ApiKey, type InsertApiKey
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  updateStripeCustomerId(id: string, customerId: string): Promise<User>;
  updateUserStripeInfo(id: string, info: { customerId: string; subscriptionId: string }): Promise<User>;

  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<InsertTenant>): Promise<Tenant>;
  getTenantUsers(tenantId: string): Promise<User[]>;

  // Probes
  getProbe(id: string): Promise<Probe | undefined>;
  getProbesByTenant(tenantId: string): Promise<Probe[]>;
  createProbe(probe: InsertProbe): Promise<Probe>;
  updateProbe(id: string, updates: Partial<InsertProbe>): Promise<Probe>;
  deleteProbe(id: string): Promise<void>;

  // Gateways
  getGateway(id: string): Promise<Gateway | undefined>;
  getGatewayByApiKey(apiKey: string): Promise<Gateway | undefined>;
  getCoreGateways(): Promise<Gateway[]>;
  getCustomGateways(tenantId: string): Promise<Gateway[]>;
  createGateway(gateway: InsertGateway): Promise<Gateway>;
  updateGateway(id: string, updates: Partial<InsertGateway>): Promise<Gateway>;
  deleteGateway(id: string): Promise<void>;
  updateGatewayHeartbeat(id: string): Promise<void>;

  // Notification Groups
  getNotificationGroup(id: string): Promise<NotificationGroup | undefined>;
  getNotificationGroupsByTenant(tenantId: string): Promise<NotificationGroup[]>;
  createNotificationGroup(group: InsertNotificationGroup): Promise<NotificationGroup>;
  updateNotificationGroup(id: string, updates: Partial<InsertNotificationGroup>): Promise<NotificationGroup>;
  deleteNotificationGroup(id: string): Promise<void>;

  // Probe Results
  createProbeResult(result: InsertProbeResult): Promise<ProbeResult>;
  getProbeResults(probeId: string, limit?: number): Promise<ProbeResult[]>;
  getProbeResultsByTimeRange(probeId: string, startTime: Date, endTime: Date): Promise<ProbeResult[]>;

  // Alerts
  createAlert(alert: InsertAlert): Promise<Alert>;
  getActiveAlerts(tenantId: string): Promise<Alert[]>;
  getAlertsByTenant(tenantId: string): Promise<Alert[]>;
  resolveAlert(id: string): Promise<Alert>;

  // Dashboard Stats
  getDashboardStats(tenantId: string): Promise<{
    totalProbes: number;
    activeAlerts: number;
    overallUptime: number;
    creditsUsed: number;
  }>;

  // API Keys
  getApiKey(id: string): Promise<ApiKey | undefined>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  getUserApiKeys(userId: string): Promise<ApiKey[]>;
  getTenantApiKeys(tenantId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey & { keyHash: string }): Promise<ApiKey>;
  updateApiKey(id: string, updates: Partial<Omit<InsertApiKey, 'userId' | 'tenantId'>>): Promise<ApiKey>;
  updateApiKeyUsage(id: string): Promise<void>;
  deactivateApiKey(id: string): Promise<void>;
  deleteApiKey(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateStripeCustomerId(id: string, customerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeInfo(id: string, info: { customerId: string; subscriptionId: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: info.customerId,
        stripeSubscriptionId: info.subscriptionId,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(insertTenant).returning();
    return tenant;
  }

  async updateTenant(id: string, updates: Partial<InsertTenant>): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  async getTenantUsers(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async getProbe(id: string): Promise<Probe | undefined> {
    const [probe] = await db.select().from(probes).where(eq(probes.id, id));
    return probe || undefined;
  }

  async getProbesByTenant(tenantId: string): Promise<Probe[]> {
    if (tenantId === 'ALL_TENANTS') {
      // Return all probes if requested (for Core gateways)
      return await db.select().from(probes);
    }
    return await db.select().from(probes).where(eq(probes.tenantId, tenantId));
  }

  async createProbe(insertProbe: InsertProbe): Promise<Probe> {
    const [probe] = await db.insert(probes).values(insertProbe).returning();
    return probe;
  }

  async updateProbe(id: string, updates: Partial<InsertProbe>): Promise<Probe> {
    const [probe] = await db
      .update(probes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(probes.id, id))
      .returning();
    return probe;
  }

  async deleteProbe(id: string): Promise<void> {
    await db.delete(probes).where(eq(probes.id, id));
  }

  async getGateway(id: string): Promise<Gateway | undefined> {
    const [gateway] = await db.select().from(gateways).where(eq(gateways.id, id));
    return gateway || undefined;
  }

  async getGatewayByApiKey(apiKey: string): Promise<Gateway | undefined> {
    const [gateway] = await db.select().from(gateways).where(eq(gateways.apiKey, apiKey));
    return gateway || undefined;
  }

  async getCoreGateways(): Promise<Gateway[]> {
    return await db.select().from(gateways).where(eq(gateways.type, "Core"));
  }

  async getCustomGateways(tenantId: string): Promise<Gateway[]> {
    return await db.select().from(gateways).where(
      and(eq(gateways.type, "Custom"), eq(gateways.tenantId, tenantId))
    );
  }

  async createGateway(insertGateway: InsertGateway): Promise<Gateway> {
    const gatewayWithApiKey = {
      ...insertGateway,
      apiKey: randomUUID(),
    };
    const [gateway] = await db.insert(gateways).values(gatewayWithApiKey).returning();
    return gateway;
  }

  async updateGateway(id: string, updates: Partial<InsertGateway>): Promise<Gateway> {
    const [gateway] = await db
      .update(gateways)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gateways.id, id))
      .returning();
    return gateway;
  }

  async deleteGateway(id: string): Promise<void> {
    await db.delete(gateways).where(eq(gateways.id, id));
  }

  async updateGatewayHeartbeat(id: string): Promise<void> {
    await db
      .update(gateways)
      .set({ isOnline: true, lastHeartbeat: new Date() })
      .where(eq(gateways.id, id));
  }

  async getNotificationGroup(id: string): Promise<NotificationGroup | undefined> {
    const [group] = await db.select().from(notificationGroups).where(eq(notificationGroups.id, id));
    return group || undefined;
  }

  async getNotificationGroupsByTenant(tenantId: string): Promise<NotificationGroup[]> {
    return await db.select().from(notificationGroups).where(eq(notificationGroups.tenantId, tenantId));
  }

  async createNotificationGroup(insertGroup: InsertNotificationGroup): Promise<NotificationGroup> {
    const [group] = await db.insert(notificationGroups).values(insertGroup).returning();
    return group;
  }

  async updateNotificationGroup(id: string, updates: Partial<InsertNotificationGroup>): Promise<NotificationGroup> {
    const [group] = await db
      .update(notificationGroups)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notificationGroups.id, id))
      .returning();
    return group;
  }

  async deleteNotificationGroup(id: string): Promise<void> {
    await db.delete(notificationGroups).where(eq(notificationGroups.id, id));
  }

  async createProbeResult(insertResult: InsertProbeResult): Promise<ProbeResult> {
    const [result] = await db.insert(probeResults).values(insertResult).returning();
    return result;
  }

  async getProbeResults(probeId: string, limit: number = 100): Promise<ProbeResult[]> {
    return await db
      .select()
      .from(probeResults)
      .where(eq(probeResults.probeId, probeId))
      .orderBy(desc(probeResults.checkedAt))
      .limit(limit);
  }

  async getProbeResultsByTimeRange(probeId: string, startTime: Date, endTime: Date): Promise<ProbeResult[]> {
    return await db
      .select()
      .from(probeResults)
      .where(
        and(
          eq(probeResults.probeId, probeId),
          gte(probeResults.checkedAt, startTime),
          lte(probeResults.checkedAt, endTime)
        )
      )
      .orderBy(desc(probeResults.checkedAt));
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values(insertAlert).returning();
    return alert;
  }

  async getActiveAlerts(tenantId: string): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.tenantId, tenantId), eq(alerts.isResolved, false)))
      .orderBy(desc(alerts.createdAt));
  }

  async getAlertsByTenant(tenantId: string): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.tenantId, tenantId))
      .orderBy(desc(alerts.createdAt));
  }

  async resolveAlert(id: string): Promise<Alert> {
    const [alert] = await db
      .update(alerts)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  async getDashboardStats(tenantId: string): Promise<{
    totalProbes: number;
    activeAlerts: number;
    overallUptime: number;
    creditsUsed: number;
  }> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    
    const [probeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(probes)
      .where(eq(probes.tenantId, tenantId));

    const [alertCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(and(eq(alerts.tenantId, tenantId), eq(alerts.isResolved, false)));

    // Calculate uptime from recent probe results (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [uptimeData] = await db
      .select({
        total: sql<number>`count(*)`,
        successful: sql<number>`count(*) filter (where status = 'Up')`
      })
      .from(probeResults)
      .innerJoin(probes, eq(probeResults.probeId, probes.id))
      .where(
        and(
          eq(probes.tenantId, tenantId),
          gte(probeResults.checkedAt, oneDayAgo)
        )
      );

    const uptime = uptimeData.total > 0 ? (uptimeData.successful / uptimeData.total) * 100 : 100;

    return {
      totalProbes: probeCount.count,
      activeAlerts: alertCount.count,
      overallUptime: Math.round(uptime * 100) / 100,
      creditsUsed: tenant?.creditsUsed || 0,
    };
  }

  // API Keys
  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey || undefined;
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    return apiKey || undefined;
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
  }

  async getTenantApiKeys(tenantId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.tenantId, tenantId)).orderBy(desc(apiKeys.createdAt));
  }

  async createApiKey(apiKey: InsertApiKey & { keyHash: string }): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(apiKey).returning();
    return created;
  }

  async updateApiKey(id: string, updates: Partial<Omit<InsertApiKey, 'userId' | 'tenantId'>>): Promise<ApiKey> {
    const [updated] = await db.update(apiKeys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return updated;
  }

  async updateApiKeyUsage(id: string): Promise<void> {
    await db.update(apiKeys)
      .set({
        lastUsed: new Date(),
        usageCount: sql`${apiKeys.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(apiKeys.id, id));
  }

  async deactivateApiKey(id: string): Promise<void> {
    await db.update(apiKeys)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }
}

export const storage = new DatabaseStorage();
