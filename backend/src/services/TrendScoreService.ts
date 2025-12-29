import prisma from '../models/prisma.js';
import { AISignal } from '@prisma/client';

// Weights for trend score calculation
const WEIGHTS = {
    walletGrowth: 0.35,
    txGrowth: 0.25,
    volumeAcceleration: 0.25,
    socialGrowth: 0.15,
};

// Calculate percentage growth
function calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
}

// Calculate acceleration (rate of change of growth)
function calculateAcceleration(values: number[]): number {
    if (values.length < 3) return 0;

    const recentGrowth = calculateGrowthRate(values[0], values[1]);
    const previousGrowth = calculateGrowthRate(values[1], values[2]);

    return recentGrowth - previousGrowth;
}

// Normalize score to 0-100 range
function normalizeScore(score: number): number {
    // Use sigmoid-like transformation
    const normalized = 50 + (50 * Math.tanh(score / 100));
    return Math.max(0, Math.min(100, normalized));
}

// Calculate trend score for a dApp
export async function calculateTrendScoreForDApp(dappId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get metrics for last 30 days
    const metrics = await prisma.dAppMetrics.findMany({
        where: {
            dappId,
            date: {
                gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
            },
        },
        orderBy: { date: 'desc' },
    });

    if (metrics.length < 2) {
        console.log(`Insufficient metrics for dApp ${dappId}`);
        return;
    }

    // Aggregate metrics by date
    const dailyMetrics = new Map<string, {
        wallets: number;
        txs: number;
        volume: number;
        followers: number;
    }>();

    metrics.forEach((m) => {
        const dateKey = m.date.toISOString().split('T')[0];
        const existing = dailyMetrics.get(dateKey) || { wallets: 0, txs: 0, volume: 0, followers: 0 };
        dailyMetrics.set(dateKey, {
            wallets: existing.wallets + m.dailyActiveWallets,
            txs: existing.txs + m.dailyTxCount,
            volume: existing.volume + m.volumeUsd,
            followers: Math.max(existing.followers, m.twitterFollowers),
        });
    });

    const sortedDates = Array.from(dailyMetrics.keys()).sort().reverse();

    // Get values for calculations
    const getValuesForDays = (days: number) => {
        return sortedDates.slice(0, days).map((d) => dailyMetrics.get(d)!);
    };

    const last7Days = getValuesForDays(7);
    const last30Days = getValuesForDays(30);

    // Calculate growth rates
    const walletGrowth7d = last7Days.length >= 2
        ? calculateGrowthRate(last7Days[0].wallets, last7Days[last7Days.length - 1].wallets)
        : 0;

    const walletGrowth30d = last30Days.length >= 2
        ? calculateGrowthRate(last30Days[0].wallets, last30Days[last30Days.length - 1].wallets)
        : 0;

    const txGrowth7d = last7Days.length >= 2
        ? calculateGrowthRate(last7Days[0].txs, last7Days[last7Days.length - 1].txs)
        : 0;

    const txGrowth30d = last30Days.length >= 2
        ? calculateGrowthRate(last30Days[0].txs, last30Days[last30Days.length - 1].txs)
        : 0;

    const volumeAcceleration = calculateAcceleration(last7Days.map((d) => d.volume));

    const socialGrowth = last7Days.length >= 2 && last7Days[last7Days.length - 1].followers > 0
        ? calculateGrowthRate(last7Days[0].followers, last7Days[last7Days.length - 1].followers)
        : 0;

    // Calculate composite trend score
    const rawScore =
        walletGrowth7d * WEIGHTS.walletGrowth +
        txGrowth7d * WEIGHTS.txGrowth +
        volumeAcceleration * WEIGHTS.volumeAcceleration +
        socialGrowth * WEIGHTS.socialGrowth;

    const trendScore = normalizeScore(rawScore);

    // Classify AI signal
    const aiSignal = classifyAISignal({
        walletGrowth7d,
        txGrowth7d,
        volumeAcceleration,
        volumeUsd: last7Days[0]?.volume || 0,
        consecutiveDays: last7Days,
    });

    // Upsert trend score
    await prisma.trendScore.upsert({
        where: {
            dappId_date: {
                dappId,
                date: today,
            },
        },
        update: {
            walletGrowth7d,
            walletGrowth30d,
            txGrowth7d,
            txGrowth30d,
            volumeAcceleration,
            socialGrowth,
            trendScore,
            aiSignal,
        },
        create: {
            dappId,
            date: today,
            walletGrowth7d,
            walletGrowth30d,
            txGrowth7d,
            txGrowth30d,
            volumeAcceleration,
            socialGrowth,
            trendScore,
            aiSignal,
        },
    });

    console.log(`Updated trend score for dApp ${dappId}: ${trendScore.toFixed(2)}, signal: ${aiSignal}`);
}

// Classify AI signal based on metrics
function classifyAISignal(data: {
    walletGrowth7d: number;
    txGrowth7d: number;
    volumeAcceleration: number;
    volumeUsd: number;
    consecutiveDays: Array<{ wallets: number; txs: number; volume: number }>;
}): AISignal {
    const { walletGrowth7d, txGrowth7d, volumeAcceleration, volumeUsd, consecutiveDays } = data;

    // Check for exponential growth (BREAKOUT)
    // 3 consecutive days of >20% daily growth
    if (consecutiveDays.length >= 4) {
        let consecutiveHighGrowth = 0;
        for (let i = 0; i < consecutiveDays.length - 1 && i < 3; i++) {
            const growth = calculateGrowthRate(consecutiveDays[i].wallets, consecutiveDays[i + 1].wallets);
            if (growth >= 20) {
                consecutiveHighGrowth++;
            } else {
                break;
            }
        }
        if (consecutiveHighGrowth >= 3) {
            return 'BREAKOUT';
        }
    }

    // RISING: Good growth but under volume threshold (early stage)
    if (walletGrowth7d > 20 && txGrowth7d > 10 && volumeUsd < 1_000_000) {
        return 'RISING';
    }

    // DECLINING: Negative slope for 7 days
    if (walletGrowth7d < -10 && txGrowth7d < -10) {
        return 'DECLINING';
    }

    // DORMANT: Default state
    return 'DORMANT';
}

// Calculate scores for all dApps
export async function calculateAllTrendScores(): Promise<void> {
    console.log('Starting trend score calculation for all dApps...');

    const dapps = await prisma.dApp.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
    });

    console.log(`Found ${dapps.length} active dApps`);

    for (const dapp of dapps) {
        try {
            await calculateTrendScoreForDApp(dapp.id);
        } catch (error) {
            console.error(`Error calculating trend score for ${dapp.name}:`, error);
        }
    }

    console.log('Trend score calculation completed');
}

export default {
    calculateTrendScoreForDApp,
    calculateAllTrendScores,
};
