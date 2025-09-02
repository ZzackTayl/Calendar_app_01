'use client';

import { createSupabaseClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChannelInfo {
  channel: RealtimeChannel;
  userId: string;
  type: string;
  createdAt: Date;
}

/**
 * Singleton class to manage real-time subscription channels
 * Prevents duplicate subscriptions and provides centralized channel management
 */
class RealtimeManager {
  private static instance: RealtimeManager;
  private channels: Map<string, ChannelInfo> = new Map();
  private supabase = createSupabaseClient();

  private constructor() {}

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  /**
   * Get or create a channel for a specific user and data type
   */
  getOrCreateChannel(userId: string, type: 'events' | 'relationships' | 'invitations', setupFn: (channel: RealtimeChannel) => void): RealtimeChannel {
    const channelKey = `${type}-${userId}`;
    const existingChannel = this.channels.get(channelKey);

    // Return existing channel if it exists and is still connected
    if (existingChannel && this.isChannelActive(existingChannel.channel)) {
      console.log(`📡 Reusing existing ${type} channel for user ${userId}`);
      return existingChannel.channel;
    }

    // Clean up old channel if it exists
    if (existingChannel) {
      this.removeChannel(channelKey);
    }

    // Create new channel
    console.log(`📡 Creating new ${type} channel for user ${userId}`);
    const channel = this.supabase.channel(channelKey);
    
    // Apply setup function to configure subscriptions
    setupFn(channel);

    // Store channel info
    this.channels.set(channelKey, {
      channel,
      userId,
      type,
      createdAt: new Date()
    });

    return channel;
  }

  /**
   * Remove a specific channel
   */
  removeChannel(channelKey: string): void {
    const channelInfo = this.channels.get(channelKey);
    if (channelInfo) {
      console.log(`📡 Removing ${channelInfo.type} channel for user ${channelInfo.userId}`);
      this.supabase.removeChannel(channelInfo.channel);
      this.channels.delete(channelKey);
    }
  }

  /**
   * Remove all channels for a specific user
   */
  removeUserChannels(userId: string): void {
    const channelsToRemove: string[] = [];
    
    this.channels.forEach((channelInfo, key) => {
      if (channelInfo.userId === userId) {
        channelsToRemove.push(key);
      }
    });

    channelsToRemove.forEach(key => this.removeChannel(key));
  }

  /**
   * Remove all channels (cleanup)
   */
  removeAllChannels(): void {
    console.log('📡 Removing all real-time channels');
    this.channels.forEach((channelInfo, key) => {
      this.supabase.removeChannel(channelInfo.channel);
    });
    this.channels.clear();
  }

  /**
   * Get channel statistics
   */
  getChannelStats() {
    const stats = {
      totalChannels: this.channels.size,
      channelsByType: {} as Record<string, number>,
      channelsByUser: {} as Record<string, number>,
      oldestChannel: null as Date | null,
      newestChannel: null as Date | null
    };

    this.channels.forEach(channelInfo => {
      // Count by type
      stats.channelsByType[channelInfo.type] = (stats.channelsByType[channelInfo.type] || 0) + 1;
      
      // Count by user
      stats.channelsByUser[channelInfo.userId] = (stats.channelsByUser[channelInfo.userId] || 0) + 1;
      
      // Track oldest/newest
      if (!stats.oldestChannel || channelInfo.createdAt < stats.oldestChannel) {
        stats.oldestChannel = channelInfo.createdAt;
      }
      if (!stats.newestChannel || channelInfo.createdAt > stats.newestChannel) {
        stats.newestChannel = channelInfo.createdAt;
      }
    });

    return stats;
  }

  /**
   * Check if a channel is still active
   */
  private isChannelActive(channel: RealtimeChannel): boolean {
    // Check if the channel is still subscribed
    // This is a simplified check - in practice, you might want more sophisticated logic
    return channel && typeof channel.subscribe === 'function';
  }

  /**
   * Cleanup stale channels (older than 1 hour)
   */
  cleanupStaleChannels(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const staleChannels: string[] = [];

    this.channels.forEach((channelInfo, key) => {
      if (channelInfo.createdAt < oneHourAgo && !this.isChannelActive(channelInfo.channel)) {
        staleChannels.push(key);
      }
    });

    staleChannels.forEach(key => this.removeChannel(key));

    if (staleChannels.length > 0) {
      console.log(`📡 Cleaned up ${staleChannels.length} stale channels`);
    }
  }
}

// Export singleton instance
export const realtimeManager = RealtimeManager.getInstance();

// Auto-cleanup stale channels every 30 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    realtimeManager.cleanupStaleChannels();
  }, 30 * 60 * 1000);
}

// Cleanup all channels when page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeManager.removeAllChannels();
  });
}