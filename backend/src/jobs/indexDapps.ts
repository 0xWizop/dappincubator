import prisma from '../models/prisma.js';
import DeFiLlamaClient from '../integrations/DeFiLlamaClient.js';
import { invalidateCache } from '../models/redis.js';

// Index dApps from external APIs
export async function indexDapps(): Promise<void> {
    console.log('Starting dApp indexing...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        // Fetch from DeFiLlama
        console.log('Fetching protocols from DeFiLlama...');
        const protocols = await DeFiLlamaClient.getTopProtocols(1000);
        console.log(`Found ${protocols.length} protocols`);

        let created = 0;
        let updated = 0;

        for (const protocol of protocols) {
            try {
                // Upsert dApp
                const existing = await prisma.dApp.findUnique({
                    where: { slug: protocol.slug },
                });

                if (existing) {
                    await prisma.dApp.update({
                        where: { id: existing.id },
                        data: {
                            name: protocol.name,
                            logo: protocol.logo,
                            chains: protocol.chains,
                            category: protocol.category,
                            website: protocol.website,
                            twitter: protocol.twitter,
                        },
                    });
                    updated++;
                } else {
                    await prisma.dApp.create({
                        data: {
                            name: protocol.name,
                            slug: protocol.slug,
                            logo: protocol.logo,
                            chains: protocol.chains,
                            category: protocol.category,
                            website: protocol.website,
                            twitter: protocol.twitter,
                            contractAddresses: [],
                        },
                    });
                    created++;
                }

                // Create metrics entry
                const dapp = await prisma.dApp.findUnique({
                    where: { slug: protocol.slug },
                });

                if (dapp) {
                    // Get detailed TVL data
                    const tvlData = await DeFiLlamaClient.getProtocolTvl(protocol.slug);

                    // Create metrics for each chain
                    for (const chain of protocol.chains) {
                        const chainTvl = tvlData?.chainTvls?.[chain] || protocol.tvl / protocol.chains.length;

                        await prisma.dAppMetrics.upsert({
                            where: {
                                dappId_date_chain: {
                                    dappId: dapp.id,
                                    date: today,
                                    chain,
                                },
                            },
                            update: {
                                tvlUsd: chainTvl,
                                // Other metrics would come from different sources
                            },
                            create: {
                                dappId: dapp.id,
                                date: today,
                                chain,
                                tvlUsd: chainTvl,
                                dailyActiveWallets: 0, // Placeholder - would come from on-chain data
                                dailyTxCount: 0,
                                volumeUsd: 0,
                                twitterFollowers: 0,
                            },
                        });
                    }
                }

                // Rate limit to avoid API throttling
                await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Error processing protocol ${protocol.name}:`, error);
            }
        }

        console.log(`Indexing complete: ${created} created, ${updated} updated`);

        // Invalidate cache
        await invalidateCache('dapps:*');
        await invalidateCache('leaderboard:*');
    } catch (error) {
        console.error('Error during dApp indexing:', error);
        throw error;
    }
}

export default indexDapps;
