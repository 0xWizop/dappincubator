import axios from 'axios';
import { Chain } from '@prisma/client';

// API keys from environment
const API_KEYS = {
    ETHERSCAN: process.env.ETHERSCAN_API_KEY || '',
    BASESCAN: process.env.BASESCAN_API_KEY || '',
    ARBISCAN: process.env.ARBISCAN_API_KEY || '',
    OPTIMISM: process.env.OPTIMISM_API_KEY || '',
    POLYGONSCAN: process.env.POLYGONSCAN_API_KEY || '',
    BSCSCAN: process.env.BSCSCAN_API_KEY || '',
};

// Explorer base URLs
const EXPLORER_URLS: Record<Chain, string> = {
    ETHEREUM: 'https://api.etherscan.io/api',
    BASE: 'https://api.basescan.org/api',
    ARBITRUM: 'https://api.arbiscan.io/api',
    OPTIMISM: 'https://api-optimistic.etherscan.io/api',
    POLYGON: 'https://api.polygonscan.com/api',
    BNB: 'https://api.bscscan.com/api',
    SOLANA: '', // Solana uses different API
};

const API_KEY_MAP: Record<Chain, string> = {
    ETHEREUM: API_KEYS.ETHERSCAN,
    BASE: API_KEYS.BASESCAN,
    ARBITRUM: API_KEYS.ARBISCAN,
    OPTIMISM: API_KEYS.OPTIMISM,
    POLYGON: API_KEYS.POLYGONSCAN,
    BNB: API_KEYS.BSCSCAN,
    SOLANA: '',
};

interface ContractStats {
    address: string;
    chain: Chain;
    txCount: number;
    uniqueAddresses: number;
}

export class BlockchainExplorerClient {
    // Get transaction count for a contract address
    async getContractTxCount(chain: Chain, address: string): Promise<number> {
        if (chain === 'SOLANA') {
            return this.getSolanaContractStats(address);
        }

        const baseUrl = EXPLORER_URLS[chain];
        const apiKey = API_KEY_MAP[chain];

        if (!baseUrl || !apiKey) {
            console.warn(`No API configured for chain ${chain}`);
            return 0;
        }

        try {
            // Get internal transactions count as proxy for activity
            const response = await axios.get(baseUrl, {
                params: {
                    module: 'account',
                    action: 'txlist',
                    address,
                    startblock: 0,
                    endblock: 99999999,
                    page: 1,
                    offset: 1,
                    sort: 'desc',
                    apikey: apiKey,
                },
            });

            if (response.data.status === '1' && response.data.result) {
                // This returns recent txs, not total count
                // For accurate count, we'd need to paginate or use different endpoint
                return response.data.result.length || 0;
            }

            return 0;
        } catch (error) {
            console.error(`Error fetching tx count for ${chain}:${address}:`, error);
            return 0;
        }
    }

    // Get unique wallet addresses interacting with contract (last 24h)
    async getUniqueAddresses24h(chain: Chain, address: string): Promise<number> {
        if (chain === 'SOLANA') {
            return 0; // Handled separately
        }

        const baseUrl = EXPLORER_URLS[chain];
        const apiKey = API_KEY_MAP[chain];

        if (!baseUrl || !apiKey) {
            return 0;
        }

        try {
            const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

            const response = await axios.get(baseUrl, {
                params: {
                    module: 'account',
                    action: 'txlist',
                    address,
                    startblock: 0,
                    endblock: 99999999,
                    page: 1,
                    offset: 100,
                    sort: 'desc',
                    apikey: apiKey,
                },
            });

            if (response.data.status === '1' && response.data.result) {
                const recentTxs = response.data.result.filter(
                    (tx: { timeStamp: string }) => parseInt(tx.timeStamp) >= oneDayAgo
                );

                const uniqueAddresses = new Set(
                    recentTxs.map((tx: { from: string }) => tx.from.toLowerCase())
                );

                return uniqueAddresses.size;
            }

            return 0;
        } catch (error) {
            console.error(`Error fetching unique addresses:`, error);
            return 0;
        }
    }

    // Solana-specific stats (using Solscan API)
    async getSolanaContractStats(address: string): Promise<number> {
        const apiKey = process.env.SOLSCAN_API_KEY;
        if (!apiKey) return 0;

        try {
            const response = await axios.get(
                `https://pro-api.solscan.io/v2.0/account/${address}`,
                {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                }
            );

            return response.data?.data?.txCount || 0;
        } catch (error) {
            console.error('Error fetching Solana stats:', error);
            return 0;
        }
    }

    // Get contract info
    async getContractInfo(chain: Chain, address: string): Promise<{
        name?: string;
        verified: boolean;
    } | null> {
        if (chain === 'SOLANA') return null;

        const baseUrl = EXPLORER_URLS[chain];
        const apiKey = API_KEY_MAP[chain];

        if (!baseUrl || !apiKey) return null;

        try {
            const response = await axios.get(baseUrl, {
                params: {
                    module: 'contract',
                    action: 'getsourcecode',
                    address,
                    apikey: apiKey,
                },
            });

            if (response.data.status === '1' && response.data.result?.[0]) {
                const result = response.data.result[0];
                return {
                    name: result.ContractName || undefined,
                    verified: result.ABI !== 'Contract source code not verified',
                };
            }

            return null;
        } catch (error) {
            console.error('Error fetching contract info:', error);
            return null;
        }
    }

    // Batch get stats for multiple contracts
    async batchGetContractStats(
        contracts: Array<{ chain: Chain; address: string }>
    ): Promise<ContractStats[]> {
        const results: ContractStats[] = [];

        // Process in batches to avoid rate limits
        const batchSize = 5;
        for (let i = 0; i < contracts.length; i += batchSize) {
            const batch = contracts.slice(i, i + batchSize);

            const batchResults = await Promise.all(
                batch.map(async ({ chain, address }) => {
                    const [txCount, uniqueAddresses] = await Promise.all([
                        this.getContractTxCount(chain, address),
                        this.getUniqueAddresses24h(chain, address),
                    ]);

                    return {
                        address,
                        chain,
                        txCount,
                        uniqueAddresses,
                    };
                })
            );

            results.push(...batchResults);

            // Rate limit delay
            if (i + batchSize < contracts.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        return results;
    }
}

export default new BlockchainExplorerClient();
