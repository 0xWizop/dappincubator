import { Router, Request, Response } from 'express';
import prisma from '../models/prisma.js';
import { getCache, setCache } from '../models/redis.js';
import { Chain, Category, AISignal } from '@prisma/client';

const router = Router();

// GET /api/dapps - List all dApps with filters and pagination
router.get('/', async (req: Request, res: Response) => {
    try {
        const {
            chain,
            category,
            signal,
            minGrowth,
            maxGrowth,
            minScore,
            sortBy = 'trendScore',
            sortOrder = 'desc',
            page = '1',
            limit = '50',
        } = req.query;

        // Build cache key
        const cacheKey = `dapps:${JSON.stringify(req.query)}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Build where clause
        const where: any = {
            isActive: true,
        };

        if (chain && Object.values(Chain).includes(chain as Chain)) {
            where.chains = { has: chain as Chain };
        }

        if (category && Object.values(Category).includes(category as Category)) {
            where.category = category as Category;
        }

        // Get dApps with latest trend scores
        const pageNum = Math.max(1, parseInt(page as string));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
        const skip = (pageNum - 1) * limitNum;

        const [dapps, total] = await Promise.all([
            prisma.dApp.findMany({
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
                skip,
                take: limitNum,
            }),
            prisma.dApp.count({ where }),
        ]);

        // Filter and sort by trend score data
        let results = dapps.map((dapp) => {
            const latestScore = dapp.trendScores[0];
            const latestMetrics = dapp.metrics[0];
            return {
                id: dapp.id,
                name: dapp.name,
                slug: dapp.slug,
                logo: dapp.logo,
                chains: dapp.chains,
                category: dapp.category,
                website: dapp.website,
                twitter: dapp.twitter,
                dailyActiveWallets: latestMetrics?.dailyActiveWallets || 0,
                dailyTxCount: latestMetrics?.dailyTxCount || 0,
                volumeUsd: latestMetrics?.volumeUsd || 0,
                tvlUsd: latestMetrics?.tvlUsd || 0,
                walletGrowth7d: latestScore?.walletGrowth7d || 0,
                walletGrowth30d: latestScore?.walletGrowth30d || 0,
                trendScore: latestScore?.trendScore || 0,
                aiSignal: latestScore?.aiSignal || 'DORMANT',
            };
        });

        // Apply signal filter
        if (signal && Object.values(AISignal).includes(signal as AISignal)) {
            results = results.filter((d) => d.aiSignal === signal);
        }

        // Apply growth filters
        if (minGrowth) {
            const min = parseFloat(minGrowth as string);
            results = results.filter((d) => d.walletGrowth7d >= min);
        }
        if (maxGrowth) {
            const max = parseFloat(maxGrowth as string);
            results = results.filter((d) => d.walletGrowth7d <= max);
        }
        if (minScore) {
            const min = parseFloat(minScore as string);
            results = results.filter((d) => d.trendScore >= min);
        }

        // Sort
        const sortField = sortBy as keyof typeof results[0];
        results.sort((a, b) => {
            const aVal = a[sortField] ?? 0;
            const bVal = b[sortField] ?? 0;
            return sortOrder === 'desc'
                ? (bVal as number) - (aVal as number)
                : (aVal as number) - (bVal as number);
        });

        const response = {
            data: results,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        };

        // Cache for 5 minutes
        await setCache(cacheKey, response, 300);

        res.json(response);
    } catch (error) {
        console.error('Error fetching dApps:', error);
        res.status(500).json({ error: 'Failed to fetch dApps' });
    }
});

// GET /api/dapps/leaderboard - Top dApps by category
router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
        const { category, chain, limit = '10' } = req.query;

        const cacheKey = `leaderboard:${category || 'all'}:${chain || 'all'}:${limit}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const where: any = { isActive: true };
        if (category && Object.values(Category).includes(category as Category)) {
            where.category = category as Category;
        }
        if (chain && Object.values(Chain).includes(chain as Chain)) {
            where.chains = { has: chain as Chain };
        }

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
            take: parseInt(limit as string),
        });

        const results = dapps
            .map((dapp, index) => {
                const latestScore = dapp.trendScores[0];
                const latestMetrics = dapp.metrics[0];
                return {
                    rank: index + 1,
                    id: dapp.id,
                    name: dapp.name,
                    slug: dapp.slug,
                    logo: dapp.logo,
                    chains: dapp.chains,
                    category: dapp.category,
                    dailyActiveWallets: latestMetrics?.dailyActiveWallets || 0,
                    walletGrowth7d: latestScore?.walletGrowth7d || 0,
                    volumeUsd: latestMetrics?.volumeUsd || 0,
                    trendScore: latestScore?.trendScore || 0,
                    aiSignal: latestScore?.aiSignal || 'DORMANT',
                };
            })
            .sort((a, b) => b.trendScore - a.trendScore)
            .map((d, i) => ({ ...d, rank: i + 1 }));

        await setCache(cacheKey, results, 300);
        res.json(results);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /api/dapps/:id - Get single dApp details
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const cacheKey = `dapp:${id}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const dapp = await prisma.dApp.findFirst({
            where: {
                OR: [{ id }, { slug: id }],
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

        await setCache(cacheKey, dapp, 300);
        res.json(dapp);
    } catch (error) {
        console.error('Error fetching dApp:', error);
        res.status(500).json({ error: 'Failed to fetch dApp' });
    }
});

// GET /api/dapps/categories/stats - Category statistics
router.get('/categories/stats', async (req: Request, res: Response) => {
    try {
        const cacheKey = 'categories:stats';
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const stats = await prisma.dApp.groupBy({
            by: ['category'],
            _count: { id: true },
            where: { isActive: true },
        });

        const result = stats.map((s) => ({
            category: s.category,
            count: s._count.id,
        }));

        await setCache(cacheKey, result, 600);
        res.json(result);
    } catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({ error: 'Failed to fetch category stats' });
    }
});

export default router;
