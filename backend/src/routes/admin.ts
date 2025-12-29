import { Router, Request, Response } from 'express';
import prisma from '../models/prisma.js';
import jwt from 'jsonwebtoken';
import { SponsoredStatus } from '@prisma/client';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Admin emails (in production, use a proper admin role system)
const ADMIN_EMAILS = ['admin@chainscout.ai'];

// Middleware to verify admin auth
const requireAdmin = async (req: Request, res: Response, next: Function) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization required' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user || !ADMIN_EMAILS.includes(user.email)) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        (req as any).userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// GET /api/admin/sponsored - List all sponsored listings
router.get('/sponsored', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { status } = req.query;

        const where: any = {};
        if (status && Object.values(SponsoredStatus).includes(status as SponsoredStatus)) {
            where.status = status as SponsoredStatus;
        }

        const listings = await prisma.sponsoredListing.findMany({
            where,
            include: {
                dapp: {
                    select: {
                        name: true,
                        slug: true,
                        logo: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(listings);
    } catch (error) {
        console.error('Error fetching sponsored listings:', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

// PATCH /api/admin/sponsored/:id - Update sponsored listing status
router.patch('/sponsored/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !Object.values(SponsoredStatus).includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const listing = await prisma.sponsoredListing.update({
            where: { id },
            data: { status },
            include: {
                dapp: {
                    select: { name: true, slug: true },
                },
            },
        });

        res.json(listing);
    } catch (error) {
        console.error('Error updating sponsored listing:', error);
        res.status(500).json({ error: 'Failed to update listing' });
    }
});

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
    try {
        const [
            totalDapps,
            totalUsers,
            activeSubscriptions,
            pendingSponsored,
        ] = await Promise.all([
            prisma.dApp.count({ where: { isActive: true } }),
            prisma.user.count(),
            prisma.subscription.count({ where: { status: 'ACTIVE' } }),
            prisma.sponsoredListing.count({ where: { status: 'PENDING' } }),
        ]);

        const usersByTier = await prisma.user.groupBy({
            by: ['tier'],
            _count: { id: true },
        });

        res.json({
            totalDapps,
            totalUsers,
            activeSubscriptions,
            pendingSponsored,
            usersByTier: usersByTier.reduce((acc, curr) => {
                acc[curr.tier] = curr._count.id;
                return acc;
            }, {} as Record<string, number>),
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/admin/users - List users
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
    try {
        const { tier, page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(page as string));
        const limitNum = Math.min(100, parseInt(limit as string));

        const where: any = {};
        if (tier) {
            where.tier = tier;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    tier: true,
                    createdAt: true,
                    _count: {
                        select: { alerts: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            data: users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

export default router;
