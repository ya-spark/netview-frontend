import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();

export async function verifyToken(idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyToken(token);
    
    const user = await storage.getUserByFirebaseUid(decodedToken.uid);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}

export async function createDefaultSuperAdmins() {
  const defaultSuperAdmins = [
    'Yaseen.gem@gmail.com',
    'Asia.Yaseentech@gmail.com',
    'contact@yaseenmd.com'
  ];

  for (const email of defaultSuperAdmins) {
    const existingUser = await storage.getUserByEmail(email);
    if (!existingUser) {
      try {
        // Create a placeholder user that will be updated when they first sign in
        await storage.createUser({
          firebaseUid: `temp-${email}`,
          email,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SuperAdmin',
          tenantId: null,
        });
      } catch (error) {
        console.error(`Failed to create default SuperAdmin ${email}:`, error);
      }
    }
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: import('@shared/schema').User;
    }
  }
}
