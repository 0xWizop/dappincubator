import prisma from './src/models/prisma.js';
import { Chain, Category, AISignal } from '@prisma/client';

// Sample dApps for seeding the database
const sampleDapps = [
    { name: 'Uniswap', slug: 'uniswap', chains: ['ETHEREUM', 'BASE', 'ARBITRUM', 'POLYGON', 'OPTIMISM', 'BNB'] as Chain[], category: 'DEX' as Category, website: 'https://uniswap.org', twitter: 'https://twitter.com/Uniswap' },
    { name: 'Aave', slug: 'aave', chains: ['ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BASE'] as Chain[], category: 'LENDING' as Category, website: 'https://aave.com', twitter: 'https://twitter.com/aaborrowallow' },
    { name: 'OpenSea', slug: 'opensea', chains: ['ETHEREUM', 'POLYGON', 'BASE'] as Chain[], category: 'NFT' as Category, website: 'https://opensea.io', twitter: 'https://twitter.com/opensea' },
    { name: 'Curve', slug: 'curve', chains: ['ETHEREUM', 'POLYGON', 'ARBITRUM'] as Chain[], category: 'DEX' as Category, website: 'https://curve.fi', twitter: 'https://twitter.com/CurveFinance' },
    { name: 'GMX', slug: 'gmx', chains: ['ARBITRUM', 'BASE'] as Chain[], category: 'DERIVATIVES' as Category, website: 'https://gmx.io', twitter: 'https://twitter.com/GMX_IO' },
    { name: 'Lido', slug: 'lido', chains: ['ETHEREUM', 'POLYGON'] as Chain[], category: 'YIELD' as Category, website: 'https://lido.fi', twitter: 'https://twitter.com/LidoFinance' },
    { name: 'MakerDAO', slug: 'makerdao', chains: ['ETHEREUM'] as Chain[], category: 'LENDING' as Category, website: 'https://makerdao.com', twitter: 'https://twitter.com/MakerDAO' },
    { name: 'Compound', slug: 'compound', chains: ['ETHEREUM', 'POLYGON', 'BASE'] as Chain[], category: 'LENDING' as Category, website: 'https://compound.finance', twitter: 'https://twitter.com/compoundfinance' },
    { name: 'SushiSwap', slug: 'sushiswap', chains: ['ETHEREUM', 'POLYGON', 'ARBITRUM', 'BNB'] as Chain[], category: 'DEX' as Category, website: 'https://sushi.com', twitter: 'https://twitter.com/SushiSwap' },
    { name: 'PancakeSwap', slug: 'pancakeswap', chains: ['BNB', 'ETHEREUM', 'BASE'] as Chain[], category: 'DEX' as Category, website: 'https://pancakeswap.finance', twitter: 'https://twitter.com/PancakeSwap' },
    { name: 'Blur', slug: 'blur', chains: ['ETHEREUM'] as Chain[], category: 'NFT' as Category, website: 'https://blur.io', twitter: 'https://twitter.com/blur_io' },
    { name: 'Stargate', slug: 'stargate', chains: ['ETHEREUM', 'ARBITRUM', 'OPTIMISM', 'POLYGON', 'BASE', 'BNB'] as Chain[], category: 'BRIDGE' as Category, website: 'https://stargate.finance', twitter: 'https://twitter.com/StargateFinance' },
    { name: 'Aerodrome', slug: 'aerodrome', chains: ['BASE'] as Chain[], category: 'DEX' as Category, website: 'https://aerodrome.finance', twitter: 'https://twitter.com/AesirFinance' },
    { name: 'Friend.tech', slug: 'friend-tech', chains: ['BASE'] as Chain[], category: 'SOCIAL' as Category, website: 'https://friend.tech', twitter: 'https://twitter.com/friendtech' },
    { name: 'Farcaster', slug: 'farcaster', chains: ['BASE', 'OPTIMISM'] as Chain[], category: 'SOCIAL' as Category, website: 'https://farcaster.xyz', twitter: 'https://twitter.com/faborrowallow' },
    { name: 'Raydium', slug: 'raydium', chains: ['SOLANA'] as Chain[], category: 'DEX' as Category, website: 'https://raydium.io', twitter: 'https://twitter.com/RaydiumProtocol' },
    { name: 'Jupiter', slug: 'jupiter', chains: ['SOLANA'] as Chain[], category: 'DEX' as Category, website: 'https://jup.ag', twitter: 'https://twitter.com/JupiterExchange' },
    { name: 'Magic Eden', slug: 'magic-eden', chains: ['SOLANA', 'ETHEREUM', 'POLYGON', 'BASE'] as Chain[], category: 'NFT' as Category, website: 'https://magiceden.io', twitter: 'https://twitter.com/MagicEden' },
    { name: 'Marinade', slug: 'marinade', chains: ['SOLANA'] as Chain[], category: 'YIELD' as Category, website: 'https://marinade.finance', twitter: 'https://twitter.com/MarinadeFinance' },
    { name: 'Orca', slug: 'orca', chains: ['SOLANA'] as Chain[], category: 'DEX' as Category, website: 'https://orca.so', twitter: 'https://twitter.com/orca_so' },
];

// Generate random metrics
function randomMetrics() {
    return {
        dailyActiveWallets: Math.floor(Math.random() * 50000) + 1000,
        dailyTxCount: Math.floor(Math.random() * 100000) + 5000,
        volumeUsd: Math.random() * 100000000 + 1000000,
        tvlUsd: Math.random() * 500000000 + 10000000,
        twitterFollowers: Math.floor(Math.random() * 500000) + 10000,
    };
}

// Generate random trend score
function randomTrendScore(): { trendScore: number; aiSignal: AISignal; walletGrowth7d: number; walletGrowth30d: number; txGrowth7d: number; txGrowth30d: number; volumeAcceleration: number; socialGrowth: number } {
    const signals: AISignal[] = ['DORMANT', 'RISING', 'BREAKOUT', 'DECLINING'];
    const signalWeights = [0.4, 0.3, 0.15, 0.15]; // Distribution

    let random = Math.random();
    let signal: AISignal = 'DORMANT';
    let cumulative = 0;
    for (let i = 0; i < signals.length; i++) {
        cumulative += signalWeights[i];
        if (random < cumulative) {
            signal = signals[i];
            break;
        }
    }

    const walletGrowth7d = (Math.random() - 0.3) * 100; // -30% to +70%
    const walletGrowth30d = (Math.random() - 0.3) * 150;
    const txGrowth7d = (Math.random() - 0.3) * 80;
    const txGrowth30d = (Math.random() - 0.3) * 120;
    const volumeAcceleration = (Math.random() - 0.5) * 50;
    const socialGrowth = Math.random() * 30;

    const trendScore = Math.max(0, Math.min(100,
        50 + walletGrowth7d * 0.35 + txGrowth7d * 0.25 + volumeAcceleration * 0.25 + socialGrowth * 0.15
    ));

    return { trendScore, aiSignal: signal, walletGrowth7d, walletGrowth30d, txGrowth7d, txGrowth30d, volumeAcceleration, socialGrowth };
}

async function seed() {
    console.log('🌱 Starting database seed...');

    // Create dApps
    for (const dappData of sampleDapps) {
        console.log(`Creating dApp: ${dappData.name}`);

        const dapp = await prisma.dApp.upsert({
            where: { slug: dappData.slug },
            update: dappData,
            create: {
                ...dappData,
                contractAddresses: [],
            },
        });

        // Create metrics for last 30 days
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            for (const chain of dapp.chains) {
                const metrics = randomMetrics();

                await prisma.dAppMetrics.upsert({
                    where: {
                        dappId_date_chain: {
                            dappId: dapp.id,
                            date,
                            chain,
                        },
                    },
                    update: metrics,
                    create: {
                        dappId: dapp.id,
                        date,
                        chain,
                        ...metrics,
                    },
                });
            }

            // Create trend score
            const trendData = randomTrendScore();
            await prisma.trendScore.upsert({
                where: {
                    dappId_date: {
                        dappId: dapp.id,
                        date,
                    },
                },
                update: trendData,
                create: {
                    dappId: dapp.id,
                    date,
                    ...trendData,
                },
            });
        }
    }

    // Create a test user
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('password123', 12);

    await prisma.user.upsert({
        where: { email: 'demo@chainscout.ai' },
        update: {},
        create: {
            email: 'demo@chainscout.ai',
            passwordHash,
            name: 'Demo User',
            tier: 'PRO',
        },
    });

    await prisma.user.upsert({
        where: { email: 'admin@chainscout.ai' },
        update: {},
        create: {
            email: 'admin@chainscout.ai',
            passwordHash,
            name: 'Admin',
            tier: 'ENTERPRISE',
        },
    });

    console.log('✅ Database seed completed!');
    console.log('Test users created:');
    console.log('  - demo@chainscout.ai / password123 (Pro tier)');
    console.log('  - admin@chainscout.ai / password123 (Enterprise/Admin)');
}

seed()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
