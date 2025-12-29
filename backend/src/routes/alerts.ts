import { Router, Request, Response } from 'express';
import prisma from '../models/prisma.js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AlertType, Chain, Category, AISignal } from '@prisma/client';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Middleware to verify auth
const requireAuth = async (req: Request, res: Response, next: Function) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization required' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        (req as any).userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Validation schema
const alertSchema = z.object({
    name: z.string().min(1).max(100),
    type: z.nativeEnum(AlertType),
    conditions: z.object({
        chain: z.nativeEnum(Chain).optional(),
        category: z.nativeEnum(Category).optional(),
        signal: z.nativeEnum(AISignal).optional(),
        growthThreshold: z.number().optional(),
        scoreThreshold: z.number().optional(),
    }),
});

// GET /api/alerts - List user's alerts
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        const alerts = await prisma.alert.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                notifications: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        res.json(alerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// POST /api/alerts - Create new alert
router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const data = alertSchema.parse(req.body);

        // Check user tier for alert limits
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { alerts: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Free tier: max 3 alerts
        if (user.tier === 'FREE' && user.alerts.length >= 3) {
            return res.status(403).json({
                error: 'Alert limit reached. Upgrade to Pro for unlimited alerts.'
            });
        }

        const alert = await prisma.alert.create({
            data: {
                userId,
                name: data.name,
                type: data.type,
                conditions: data.conditions,
            },
        });

        res.status(201).json(alert);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Error creating alert:', error);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

// PATCH /api/alerts/:id - Update alert
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const alert = await prisma.alert.findFirst({
            where: { id, userId },
        });

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        const updated = await prisma.alert.update({
            where: { id },
            data: req.body,
        });

        res.json(updated);
    } catch (error) {
        console.error('Error updating alert:', error);
        res.status(500).json({ error: 'Failed to update alert' });
    }
});

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const alert = await prisma.alert.findFirst({
            where: { id, userId },
        });

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        await prisma.alert.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting alert:', error);
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

// GET /api/alerts/notifications - Get user's notifications
router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { unreadOnly } = req.query;

        const where: any = { userId };
        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                alert: {
                    select: { name: true, type: true },
                },
            },
        });

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// PATCH /api/alerts/notifications/:id/read - Mark notification as read
router.patch('/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const notification = await prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

export default router;
