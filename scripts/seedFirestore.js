import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Load service account
const serviceAccount = JSON.parse(
    readFileSync(new URL('./serviceAccountKey.json', import.meta.url))
);

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Sample dApps data with token info
const dappsData = [
    {
        name: 'Uniswap',
        slug: 'uniswap',
        logo: 'https://icons.llama.fi/uniswap.png',
        chains: ['ETHEREUM', 'BASE', 'ARBITRUM', 'POLYGON', 'OPTIMISM', 'BNB'],
        category: 'DEX',
        website: 'https://uniswap.org',
        twitter: 'https://twitter.com/Uniswap',
        description: 'Leading decentralized exchange protocol',
        dailyActiveWallets: 125000,
        dailyTxCount: 450000,
        volumeUsd: 2500000000,
        tvlUsd: 5200000000,
        walletGrowth7d: 12.5,
        walletGrowth30d: 45.2,
        txGrowth7d: 8.2,
        trendScore: 78,
        aiSignal: 'RISING',
        hasToken: true,
        tokenSymbol: 'UNI',
        tokenLaunched: true,
        tokenTgeDate: null,
        tokenTgeStatus: 'LIVE',
        tokenNotes: null,
        isActive: true,
    },
    {
        name: 'Jupiter',
        slug: 'jupiter',
        logo: 'https://icons.llama.fi/jupiter.jpg',
        chains: ['SOLANA'],
        category: 'DEX',
        website: 'https://jup.ag',
        twitter: 'https://twitter.com/JupiterExchange',
        description: 'Solana DEX aggregator',
        dailyActiveWallets: 320000,
        dailyTxCount: 1200000,
        volumeUsd: 4200000000,
        tvlUsd: 1800000000,
        walletGrowth7d: 65.2,
        walletGrowth30d: 180.5,
        txGrowth7d: 72.1,
        trendScore: 95,
        aiSignal: 'BREAKOUT',
        hasToken: true,
        tokenSymbol: 'JUP',
        tokenLaunched: true,
        tokenTgeDate: null,
        tokenTgeStatus: 'LIVE',
        tokenNotes: 'Launched Jan 2024',
        isActive: true,
    },
    {
        name: 'Aerodrome',
        slug: 'aerodrome',
        logo: 'https://icons.llama.fi/aerodrome.png',
        chains: ['BASE'],
        category: 'DEX',
        website: 'https://aerodrome.finance',
        twitter: 'https://twitter.com/AeurodromeFinance',
        description: 'Base native DEX',
        dailyActiveWallets: 85000,
        dailyTxCount: 280000,
        volumeUsd: 950000000,
        tvlUsd: 420000000,
        walletGrowth7d: 42.8,
        walletGrowth30d: 156.2,
        txGrowth7d: 38.5,
        trendScore: 88,
        aiSignal: 'BREAKOUT',
        hasToken: true,
        tokenSymbol: 'AERO',
        tokenLaunched: true,
        tokenTgeDate: null,
        tokenTgeStatus: 'LIVE',
        tokenNotes: null,
        isActive: true,
    },
    {
        name: 'Hyperliquid',
        slug: 'hyperliquid',
        logo: 'https://icons.llama.fi/hyperliquid.jpg',
        chains: ['ARBITRUM'],
        category: 'DERIVATIVES',
        website: 'https://hyperliquid.xyz',
        twitter: 'https://twitter.com/HyperliquidX',
        description: 'Perpetual DEX',
        dailyActiveWallets: 180000,
        dailyTxCount: 520000,
        volumeUsd: 8500000000,
        tvlUsd: 2100000000,
        walletGrowth7d: 85.2,
        walletGrowth30d: 320.5,
        txGrowth7d: 92.1,
        trendScore: 98,
        aiSignal: 'BREAKOUT',
        hasToken: true,
        tokenSymbol: 'HYPE',
        tokenLaunched: true,
        tokenTgeDate: null,
        tokenTgeStatus: 'LIVE',
        tokenNotes: 'Massive airdrop Nov 2024',
        isActive: true,
    },
    {
        name: 'Pump.fun',
        slug: 'pump-fun',
        logo: null,
        chains: ['SOLANA'],
        category: 'LAUNCHPAD',
        website: 'https://pump.fun',
        twitter: 'https://twitter.com/pumpdotfun',
        description: 'Memecoin launchpad',
        dailyActiveWallets: 450000,
        dailyTxCount: 2500000,
        volumeUsd: 120000000,
        tvlUsd: 0,
        walletGrowth7d: 125.5,
        walletGrowth30d: 580.2,
        txGrowth7d: 142.1,
        trendScore: 99,
        aiSignal: 'BREAKOUT',
        hasToken: false,
        tokenSymbol: null,
        tokenLaunched: false,
        tokenTgeDate: 'Q1 2025',
        tokenTgeStatus: 'RUMORED',
        tokenNotes: 'Points system active, major airdrop expected',
        isActive: true,
    },
    {
        name: 'Aave',
        slug: 'aave',
        logo: 'https://icons.llama.fi/aave.png',
        chains: ['ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BASE'],
        category: 'LENDING',
        website: 'https://aave.com',
        twitter: 'https://twitter.com/AaveAave',
        description: 'DeFi lending protocol',
        dailyActiveWallets: 45000,
        dailyTxCount: 120000,
        volumeUsd: 850000000,
        tvlUsd: 12000000000,
        walletGrowth7d: 8.3,
        walletGrowth30d: 22.1,
        txGrowth7d: 5.1,
        trendScore: 72,
        aiSignal: 'RISING',
        hasToken: true,
        tokenSymbol: 'AAVE',
        tokenLaunched: true,
        tokenTgeDate: null,
        tokenTgeStatus: 'LIVE',
        tokenNotes: null,
        isActive: true,
    },
    {
        name: 'Polymarket',
        slug: 'polymarket',
        logo: 'https://icons.llama.fi/polymarket.png',
        chains: ['POLYGON'],
        category: 'OTHER',
        website: 'https://polymarket.com',
        twitter: 'https://twitter.com/Polymarket',
        description: 'Prediction markets',
        dailyActiveWallets: 65000,
        dailyTxCount: 180000,
        volumeUsd: 250000000,
        tvlUsd: 0,
        walletGrowth7d: 32.5,
        walletGrowth30d: 85.2,
        txGrowth7d: 28.1,
        trendScore: 82,
        aiSignal: 'RISING',
        hasToken: false,
        tokenSymbol: null,
        tokenLaunched: false,
        tokenTgeDate: null,
        tokenTgeStatus: 'RUMORED',
        tokenNotes: 'Token speculation ongoing',
        isActive: true,
    },
    {
        name: 'Magic Eden',
        slug: 'magic-eden',
        logo: 'https://icons.llama.fi/magic-eden.jpg',
        chains: ['SOLANA', 'ETHEREUM', 'BASE', 'POLYGON'],
        category: 'NFT',
        website: 'https://magiceden.io',
        twitter: 'https://twitter.com/MagicEden',
        description: 'NFT marketplace',
        dailyActiveWallets: 95000,
        dailyTxCount: 280000,
        volumeUsd: 85000000,
        tvlUsd: 0,
        walletGrowth7d: 22.5,
        walletGrowth30d: 45.2,
        txGrowth7d: 18.2,
        trendScore: 74,
        aiSignal: 'RISING',
        hasToken: false,
        tokenSymbol: null,
        tokenLaunched: false,
        tokenTgeDate: null,
        tokenTgeStatus: 'RUMORED',
        tokenNotes: 'Token rumored for 2025',
        isActive: true,
    },
    {
        name: 'GMX',
        slug: 'gmx',
        logo: 'https://icons.llama.fi/gmx.png',
        chains: ['ARBITRUM', 'AVALANCHE'],
        category: 'DERIVATIVES',
        website: 'https://gmx.io',
        twitter: 'https://twitter.com/GMX_IO',
        description: 'Perpetual DEX',
        dailyActiveWallets: 28000,
        dailyTxCount: 95000,
        volumeUsd: 520000000,
        tvlUsd: 680000000,
        walletGrowth7d: -5.2,
        walletGrowth30d: 12.3,
        txGrowth7d: -3.1,
        trendScore: 58,
        aiSignal: 'DORMANT',
        hasToken: true,
        tokenSymbol: 'GMX',
        tokenLaunched: true,
        tokenTgeDate: null,
        tokenTgeStatus: 'LIVE',
        tokenNotes: null,
        isActive: true,
    },
    {
        name: 'Lido',
        slug: 'lido',
        logo: 'https://icons.llama.fi/lido.png',
        chains: ['ETHEREUM', 'POLYGON'],
        category: 'YIELD',
        website: 'https://lido.fi',
        twitter: 'https://twitter.com/LidoFinance',
        description: 'Liquid staking',
        dailyActiveWallets: 15000,
        dailyTxCount: 45000,
        volumeUsd: 180000000,
        tvlUsd: 32000000000,
        walletGrowth7d: 2.1,
        walletGrowth30d: 8.5,
        txGrowth7d: 1.8,
        trendScore: 65,
        aiSignal: 'DORMANT',
        hasToken: true,
        tokenSymbol: 'LDO',
        tokenLaunched: true,
        tokenTgeDate: null,
        tokenTgeStatus: 'LIVE',
        tokenNotes: null,
        isActive: true,
    },
];

// Seed function
async function seedDatabase() {
    console.log('🌱 Starting Firestore seed...\n');

    // Create dApps collection
    console.log('📦 Creating dApps collection...');
    const dappsRef = db.collection('dapps');

    for (const dapp of dappsData) {
        await dappsRef.doc(dapp.slug).set({
            ...dapp,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  ✓ Created: ${dapp.name}`);
    }

    // Create demo user
    console.log('\n👤 Creating demo user...');
    const usersRef = db.collection('users');
    await usersRef.doc('demo-user-001').set({
        email: 'demo@chainscout.ai',
        name: 'Demo User',
        tier: 'PRO',
        stripeCustomerId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('  ✓ Created: demo@chainscout.ai (Pro tier)');

    // Create sample watchlist
    console.log('\n⭐ Creating watchlist...');
    const watchlistRef = db.collection('watchlist');
    const watchlistItems = ['jupiter', 'aerodrome', 'hyperliquid', 'pump-fun'];
    for (const slug of watchlistItems) {
        await watchlistRef.add({
            userId: 'demo-user-001',
            dappSlug: slug,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    console.log(`  ✓ Added ${watchlistItems.length} items to watchlist`);

    // Create sample alerts
    console.log('\n🔔 Creating alerts...');
    const alertsRef = db.collection('alerts');
    await alertsRef.add({
        userId: 'demo-user-001',
        name: 'Base Breakouts',
        type: 'BREAKOUT',
        conditions: { chain: 'BASE' },
        isActive: true,
        lastTriggered: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await alertsRef.add({
        userId: 'demo-user-001',
        name: 'High Growth DEX',
        type: 'GROWTH_THRESHOLD',
        conditions: { category: 'DEX', growthThreshold: 50 },
        isActive: true,
        lastTriggered: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('  ✓ Created 2 sample alerts');

    // Create sample notifications
    console.log('\n📬 Creating notifications...');
    const notificationsRef = db.collection('notifications');
    await notificationsRef.add({
        userId: 'demo-user-001',
        alertId: null,
        title: 'New Breakout: Jupiter',
        message: 'Jupiter has hit BREAKOUT status with +65% growth this week',
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await notificationsRef.add({
        userId: 'demo-user-001',
        alertId: null,
        title: 'Hyperliquid +85% growth',
        message: 'Hyperliquid is showing exceptional growth on Arbitrum',
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await notificationsRef.add({
        userId: 'demo-user-001',
        alertId: null,
        title: 'Pump.fun approaching TGE',
        message: 'Pump.fun token launch expected Q1 2025, points are accumulating',
        isRead: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('  ✓ Created 3 sample notifications');

    console.log('\n✅ Seed complete!');
    console.log('\nCollections created:');
    console.log('  - dapps (10 protocols)');
    console.log('  - users (1 demo user)');
    console.log('  - watchlist (4 items)');
    console.log('  - alerts (2 alerts)');
    console.log('  - notifications (3 notifications)');

    process.exit(0);
}

// Run seed
seedDatabase().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
});
