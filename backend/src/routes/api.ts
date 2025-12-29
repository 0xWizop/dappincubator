import { Router, Request, Response } from 'express';
import prisma from '../models/prisma.js';
import { getCache, setCache } from '../models/redis.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// API key middleware
const requireApiKey = async (req: Request, res: Response, next: Function) => {
    try {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            return res.status(401).json({ error: 'API key required' });
        }

        const key = await prisma.apiKey.findUnique({
            where: { key: apiKey },
            include: { user: true },
        });

        if (!key || !key.isActive) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        // Check rate limit
        const today = new Date().toISOString().split('T')[0];
        const rateLimitKey = `ratelimit:${apiKey}:${today}`;
        const currentCount = await getCache<number>(rateLimitKey) || 0;

        if (currentCount >= key.rateLimit) {
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        // Update rate limit counter (expires at midnight)
        await setCache(rateLimitKey, currentCount + 1, 86400);

        // Update last used
        await prisma.apiKey.update({
            where: { id: key.id },
            data: { lastUsedAt: new Date() },
        });

        (req as any).apiKeyUser = key.user;
        next();
    } catch (error) {
        return res.status(500).json({ error: 'API key validation failed' });
    }
};

// Auth middleware for key management
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

// ============================================
// PUBLIC API ENDPOINTS (require API key)
// ============================================

// GET /api/v1/dapps - List dApps
router.get('/dapps', requireApiKey, async (req: Request, res: Response) => {
    try {
        const { chain, category, signal, limit = '50', offset = '0' } = req.query;

        const where: any = { isActive: true };
        if (chain) where.chains = { has: chain };
        if (category) where.category = category;

        const dapps = await prisma.dApp.findMany({
            where,
            include: {
                trendScores: {
                    orderBy: { date: 'desc' },
                    take: 1,
                },
                metrics: {
                    orderBy: { date: 'desc' },
                    take: 1,
                },
            },
            take: Math.min(100, parseInt(limit as string)),
            skip: parseInt(offset as string),
        });

        let results = dapps.map((dapp) => ({
            id: dapp.id,
            name: dapp.name,
            slug: dapp.slug,
            chains: dapp.chains,
            category: dapp.category,
            website: dapp.website,
            dailyActiveWallets: dapp.metrics[0]?.dailyActiveWallets || 0,
            dailyTxCount: dapp.metrics[0]?.dailyTxCount || 0,
            volumeUsd: dapp.metrics[0]?.volumeUsd || 0,
            tvlUsd: dapp.metrics[0]?.tvlUsd || 0,
            trendScore: dapp.trendScores[0]?.trendScore || 0,
            aiSignal: dapp.trendScores[0]?.aiSignal || 'DORMANT',
            walletGrowth7d: dapp.trendScores[0]?.walletGrowth7d || 0,
        }));

        if (signal) {
            results = results.filter((d) => d.aiSignal === signal);
        }

        res.json({ data: results });
    } catch (error) {
        console.error('API dapps error:', error);
        res.status(500).json({ error: 'Failed to fetch dApps' });
    }
});

// GET /api/v1/dapps/:slug - Get single dApp
router.get('/dapps/:slug', requireApiKey, async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;

        const dapp = await prisma.dApp.findFirst({
            where: {
                OR: [{ slug }, { id: slug }],
                isActive: true,
            },
            include: {
                trendScores: {
                    orderBy: { date: 'desc' },
                    take: 30,
                },
                metrics: {
                    orderBy: { date: 'desc' },
                    take: 30,
                },
            },
        });

        if (!dapp) {
            return res.status(404).json({ error: 'DApp not found' });
        }

        res.json(dapp);
    } catch (error) {
        console.error('API dapp error:', error);
        res.status(500).json({ error: 'Failed to fetch dApp' });
    }
});

// GET /api/v1/leaderboard - Get leaderboard
router.get('/leaderboard', requireApiKey, async (req: Request, res: Response) => {
    try {
        const { category, chain, limit = '20' } = req.query;

        const where: any = { isActive: true };
        if (category) where.category = category;
        if (chain) where.chains = { has: chain };

        const dapps = await prisma.dApp.findMany({
            where,
            include: {
                trendScores: {
                    orderBy: { date: 'desc' },
                    take: 1,
                },
                metrics: {
                    orderBy: { date: 'desc' },
                    take: 1,
                },
            },
        });

        const results = dapps
            .map((dapp) => ({
                id: dapp.id,
                name: dapp.name,
                slug: dapp.slug,
                chains: dapp.chains,
                category: dapp.category,
                trendScore: dapp.trendScores[0]?.trendScore || 0,
                aiSignal: dapp.trendScores[0]?.aiSignal || 'DORMANT',
                dailyActiveWallets: dapp.metrics[0]?.dailyActiveWallets || 0,
                volumeUsd: dapp.metrics[0]?.volumeUsd || 0,
            }))
            .sort((a, b) => b.trendScore - a.trendScore)
            .slice(0, parseInt(limit as string))
            .map((d, i) => ({ rank: i + 1, ...d }));

        res.json({ data: results });
    } catch (error) {
        console.error('API leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// ============================================
// API KEY MANAGEMENT (require auth)
// ============================================

// GET /api/v1/keys - List user's API keys
router.get('/keys', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;

        // Check tier
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || user.tier === 'FREE') {
            return res.status(403).json({ error: 'API access requires Pro or Enterprise tier' });
        }

        const keys = await prisma.apiKey.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                key: true,
                rateLimit: true,
                lastUsedAt: true,
                isActive: true,
                createdAt: true,
            },
        });

        // Mask keys except last 4 chars
        const maskedKeys = keys.map((k) => ({
            ...k,
            key: `cs_...${k.key.slice(-4)}`,
        }));

        res.json(maskedKeys);
    } catch (error) {
        console.error('Error fetching API keys:', error);
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
});

// POST /api/v1/keys - Create new API key
router.post('/keys', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { name } = req.body;

        if (!name || name.length < 1) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Check tier
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { apiKeys: true },
        });

        if (!user || user.tier === 'FREE') {
            return res.status(403).json({ error: 'API access requires Pro or Enterprise tier' });
        }

        // Limit keys per user
        const maxKeys = user.tier === 'ENTERPRISE' ? 10 : 3;
        if (user.apiKeys.length >= maxKeys) {
            return res.status(400).json({ error: `Maximum ${maxKeys} API keys allowed` });
        }

        // Generate key
        const key = `cs_${uuidv4().replace(/-/g, '')}`;
        const rateLimit = user.tier === 'ENTERPRISE' ? 10000 : 1000;

        const apiKey = await prisma.apiKey.create({
            data: {
                userId,
                key,
                name,
                rateLimit,
            },
        });

        // Return full key only on creation
        res.status(201).json({
            id: apiKey.id,
            name: apiKey.name,
            key: apiKey.key,
            rateLimit: apiKey.rateLimit,
            createdAt: apiKey.createdAt,
            message: 'Save this key securely. It will not be shown again.',
        });
    } catch (error) {
        console.error('Error creating API key:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

// DELETE /api/v1/keys/:id - Delete API key
router.delete('/keys/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { id } = req.params;

        const key = await prisma.apiKey.findFirst({
            where: { id, userId },
        });

        if (!key) {
            return res.status(404).json({ error: 'API key not found' });
        }

        await prisma.apiKey.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting API key:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

export default router;
