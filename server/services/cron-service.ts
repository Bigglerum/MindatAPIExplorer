import cron from 'node-cron';
import { MineralSyncService } from './mineral-sync-service.js';

export class CronService {
  private static instance: CronService;
  private mineralSyncService: MineralSyncService;
  private isRunning = false;

  private constructor() {
    this.mineralSyncService = MineralSyncService.getInstance();
  }

  static getInstance(): CronService {
    if (!CronService.instance) {
      CronService.instance = new CronService();
    }
    return CronService.instance;
  }

  /**
   * Start all scheduled cron jobs
   */
  start(): void {
    console.log('Starting cron service...');
    
    // Daily mineral sync at 2:00 AM UTC
    cron.schedule('0 2 * * *', async () => {
      if (this.isRunning) {
        console.log('Mineral sync already running, skipping...');
        return;
      }

      this.isRunning = true;
      try {
        console.log('Starting scheduled daily mineral sync...');
        const result = await this.mineralSyncService.performIncrementalSync();
        console.log('Scheduled mineral sync completed:', result);
      } catch (error) {
        console.error('Scheduled mineral sync failed:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      timezone: 'UTC'
    });

    // Weekly full sync on Sundays at 3:00 AM UTC
    cron.schedule('0 3 * * 0', async () => {
      if (this.isRunning) {
        console.log('Mineral sync already running, skipping weekly full sync...');
        return;
      }

      this.isRunning = true;
      try {
        console.log('Starting scheduled weekly full mineral sync...');
        const result = await this.mineralSyncService.performFullSync();
        console.log('Scheduled full mineral sync completed:', result);
      } catch (error) {
        console.error('Scheduled full mineral sync failed:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      timezone: 'UTC'
    });

    console.log('Cron jobs scheduled:');
    console.log('- Daily incremental sync: 2:00 AM UTC');
    console.log('- Weekly full sync: 3:00 AM UTC on Sundays');
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    console.log('Stopping cron service...');
    cron.destroy();
  }

  /**
   * Manually trigger mineral sync
   */
  async triggerMineralSync(type: 'full' | 'incremental' = 'incremental'): Promise<any> {
    if (this.isRunning) {
      throw new Error('Mineral sync is already running');
    }

    this.isRunning = true;
    try {
      console.log(`Manually triggering ${type} mineral sync...`);
      
      if (type === 'full') {
        return await this.mineralSyncService.performFullSync();
      } else {
        return await this.mineralSyncService.performIncrementalSync();
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}