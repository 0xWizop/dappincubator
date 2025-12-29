import cron from 'node-cron';
import indexDapps from './indexDapps.js';
import { calculateAllTrendScores } from '../services/TrendScoreService.js';
import { evaluateAlerts } from '../services/AlertService.js';

// Track running jobs to prevent overlap
let isIndexing = false;
let isCalculatingScores = false;
let isEvaluatingAlerts = false;

// Index dApps daily at 00:00 UTC
cron.schedule('0 0 * * *', async () => {
    if (isIndexing) {
        console.log('Indexing job already running, skipping...');
        return;
    }

    isIndexing = true;
    console.log('Starting scheduled dApp indexing...');

    try {
        await indexDapps();
        console.log('Scheduled dApp indexing completed');
    } catch (error) {
        console.error('Scheduled dApp indexing failed:', error);
    } finally {
        isIndexing = false;
    }
});

// Calculate trend scores daily at 01:00 UTC (after indexing)
cron.schedule('0 1 * * *', async () => {
    if (isCalculatingScores) {
        console.log('Trend score calculation already running, skipping...');
        return;
    }

    isCalculatingScores = true;
    console.log('Starting scheduled trend score calculation...');

    try {
        await calculateAllTrendScores();
        console.log('Scheduled trend score calculation completed');
    } catch (error) {
        console.error('Scheduled trend score calculation failed:', error);
    } finally {
        isCalculatingScores = false;
    }
});

// Evaluate alerts every hour
cron.schedule('0 * * * *', async () => {
    if (isEvaluatingAlerts) {
        console.log('Alert evaluation already running, skipping...');
        return;
    }

    isEvaluatingAlerts = true;
    console.log('Starting scheduled alert evaluation...');

    try {
        await evaluateAlerts();
        console.log('Scheduled alert evaluation completed');
    } catch (error) {
        console.error('Scheduled alert evaluation failed:', error);
    } finally {
        isEvaluatingAlerts = false;
    }
});

console.log('📅 Cron jobs scheduled:');
console.log('  - dApp indexing: daily at 00:00 UTC');
console.log('  - Trend scores: daily at 01:00 UTC');
console.log('  - Alert evaluation: every hour');

// Export for manual triggering
export { indexDapps, calculateAllTrendScores, evaluateAlerts };
