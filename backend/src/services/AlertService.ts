import prisma from '../models/prisma.js';

interface AlertConditions {
    chain?: string;
    category?: string;
    signal?: string;
    growthThreshold?: number;
    scoreThreshold?: number;
}

// Evaluate alerts and create notifications
export async function evaluateAlerts(): Promise<void> {
    console.log('Starting alert evaluation...');

    const activeAlerts = await prisma.alert.findMany({
        where: { isActive: true },
        include: { user: true },
    });

    console.log(`Found ${activeAlerts.length} active alerts`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const alert of activeAlerts) {
        try {
            const conditions = alert.conditions as AlertConditions;
            const triggeredDapps = await findMatchingDapps(conditions);

            if (triggeredDapps.length > 0) {
                // Check if already triggered today
                const alreadyTriggered = alert.lastTriggered &&
                    new Date(alert.lastTriggered).toDateString() === today.toDateString();

                if (!alreadyTriggered) {
                    // Create notification
                    await prisma.$transaction([
                        prisma.notification.create({
                            data: {
                                userId: alert.userId,
                                alertId: alert.id,
                                title: `Alert: ${alert.name}`,
                                message: formatAlertMessage(alert.type, triggeredDapps),
                            },
                        }),
                        prisma.alert.update({
                            where: { id: alert.id },
                            data: { lastTriggered: new Date() },
                        }),
                    ]);

                    // TODO: Send email notification if user has email alerts enabled
                    // await sendAlertEmail(alert.user.email, alert.name, triggeredDapps);

                    console.log(`Alert triggered: ${alert.name} for user ${alert.userId}`);
                }
            }
        } catch (error) {
            console.error(`Error evaluating alert ${alert.id}:`, error);
        }
    }

    console.log('Alert evaluation completed');
}

// Find dApps matching alert conditions
async function findMatchingDapps(conditions: AlertConditions): Promise<Array<{
    name: string;
    trendScore: number;
    aiSignal: string;
    walletGrowth7d: number;
}>> {
    const where: any = { isActive: true };

    if (conditions.chain) {
        where.chains = { has: conditions.chain };
    }

    if (conditions.category) {
        where.category = conditions.category;
    }

    const dapps = await prisma.dApp.findMany({
        where,
        include: {
            trendScores: {
                orderBy: { date: 'desc' },
                take: 1,
            },
        },
    });

    // Filter by additional conditions
    return dapps
        .filter((dapp) => {
            const score = dapp.trendScores[0];
            if (!score) return false;

            if (conditions.signal && score.aiSignal !== conditions.signal) {
                return false;
            }

            if (conditions.growthThreshold && score.walletGrowth7d < conditions.growthThreshold) {
                return false;
            }

            if (conditions.scoreThreshold && score.trendScore < conditions.scoreThreshold) {
                return false;
            }

            return true;
        })
        .map((dapp) => ({
            name: dapp.name,
            trendScore: dapp.trendScores[0]?.trendScore || 0,
            aiSignal: dapp.trendScores[0]?.aiSignal || 'DORMANT',
            walletGrowth7d: dapp.trendScores[0]?.walletGrowth7d || 0,
        }));
}

// Format alert notification message
function formatAlertMessage(
    alertType: string,
    dapps: Array<{ name: string; trendScore: number; aiSignal: string; walletGrowth7d: number }>
): string {
    const count = dapps.length;
    const topDapps = dapps.slice(0, 5);

    switch (alertType) {
        case 'BREAKOUT':
            return `${count} dApp${count > 1 ? 's have' : ' has'} reached BREAKOUT status: ${topDapps.map((d) => d.name).join(', ')}`;

        case 'GROWTH_THRESHOLD':
            return `${count} dApp${count > 1 ? 's' : ''} matched your growth threshold: ${topDapps.map((d) => `${d.name} (+${d.walletGrowth7d.toFixed(1)}%)`).join(', ')}`;

        case 'CATEGORY_SIGNAL':
            return `${count} dApp${count > 1 ? 's' : ''} in your watched category: ${topDapps.map((d) => `${d.name} (${d.aiSignal})`).join(', ')}`;

        default:
            return `${count} dApp${count > 1 ? 's' : ''} matched your alert conditions: ${topDapps.map((d) => d.name).join(', ')}`;
    }
}

export default {
    evaluateAlerts,
};
