import axios from 'axios';
import { Chain, Category } from '@prisma/client';

const DEFI_LLAMA_BASE = 'https://api.llama.fi';

interface DefiLlamaProtocol {
    id: string;
    name: string;
    slug: string;
    symbol?: string;
    logo?: string;
    chains: string[];
    category?: string;
    url?: string;
    twitter?: string;
    tvl?: number;
    chainTvls?: Record<string, number>;
    change_1d?: number;
    change_7d?: number;
}

// Map DeFiLlama chain names to our enum
const chainMapping: Record<string, Chain> = {
    'Ethereum': 'ETHEREUM',
    'Base': 'BASE',
    'Solana': 'SOLANA',
    'Arbitrum': 'ARBITRUM',
    'Optimism': 'OPTIMISM',
    'Polygon': 'POLYGON',
    'BSC': 'BNB',
    'Binance': 'BNB',
};

// Map categories to our enum
const categoryMapping: Record<string, Category> = {
    'Dexes': 'DEX',
    'DEX': 'DEX',
    'Lending': 'LENDING',
    'Borrowing Lending': 'LENDING',
    'NFT Marketplace': 'NFT',
    'NFT': 'NFT',
    'Gaming': 'GAMEFI',
    'GameFi': 'GAMEFI',
    'Launchpad': 'LAUNCHPAD',
    'Bridge': 'BRIDGE',
    'Cross Chain': 'BRIDGE',
    'AI': 'AI',
    'Infrastructure': 'INFRASTRUCTURE',
    'Yield': 'YIELD',
    'Yield Aggregator': 'YIELD',
    'Derivatives': 'DERIVATIVES',
    'Perpetuals': 'DERIVATIVES',
    'DAO': 'DAO',
    'Social': 'SOCIAL',
};

export class DeFiLlamaClient {
    private baseUrl = DEFI_LLAMA_BASE;

    // Get all protocols
    async getProtocols(): Promise<DefiLlamaProtocol[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/protocols`);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching DeFiLlama protocols:', error);
            return [];
        }
    }

    // Get TVL data for a specific protocol
    async getProtocolTvl(slug: string): Promise<{
        tvl: number;
        chainTvls: Record<string, number>;
    } | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/protocol/${slug}`);
            return {
                tvl: response.data.currentChainTvls?.total || response.data.tvl || 0,
                chainTvls: response.data.currentChainTvls || {},
            };
        } catch (error) {
            console.error(`Error fetching TVL for ${slug}:`, error);
            return null;
        }
    }

    // Get historical TVL for a protocol
    async getHistoricalTvl(slug: string, days = 30): Promise<Array<{
        date: Date;
        tvl: number;
    }>> {
        try {
            const response = await axios.get(`${this.baseUrl}/protocol/${slug}`);
            const tvls = response.data.tvl || [];

            return tvls
                .slice(-days)
                .map((entry: { date: number; totalLiquidityUSD: number }) => ({
                    date: new Date(entry.date * 1000),
                    tvl: entry.totalLiquidityUSD || 0,
                }));
        } catch (error) {
            console.error(`Error fetching historical TVL for ${slug}:`, error);
            return [];
        }
    }

    // Transform DeFiLlama data to our format
    transformProtocol(protocol: DefiLlamaProtocol): {
        name: string;
        slug: string;
        logo: string | null;
        chains: Chain[];
        category: Category;
        website: string | null;
        twitter: string | null;
        tvl: number;
    } {
        // Map chains
        const chains = protocol.chains
            .map((c) => chainMapping[c])
            .filter((c): c is Chain => c !== undefined);

        // Map category
        let category: Category = 'OTHER';
        if (protocol.category && categoryMapping[protocol.category]) {
            category = categoryMapping[protocol.category];
        }

        return {
            name: protocol.name,
            slug: protocol.slug || protocol.name.toLowerCase().replace(/\s+/g, '-'),
            logo: protocol.logo || null,
            chains: chains.length > 0 ? chains : ['ETHEREUM'],
            category,
            website: protocol.url || null,
            twitter: protocol.twitter ? `https://twitter.com/${protocol.twitter}` : null,
            tvl: protocol.tvl || 0,
        };
    }

    // Get top protocols by TVL for our supported chains
    async getTopProtocols(limit = 500): Promise<Array<ReturnType<typeof this.transformProtocol>>> {
        const protocols = await this.getProtocols();

        // Filter to our supported chains and sort by TVL
        const supportedChainNames = Object.keys(chainMapping);

        const filtered = protocols
            .filter((p) => p.chains.some((c) => supportedChainNames.includes(c)))
            .sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
            .slice(0, limit);

        return filtered.map((p) => this.transformProtocol(p));
    }
}

export default new DeFiLlamaClient();
