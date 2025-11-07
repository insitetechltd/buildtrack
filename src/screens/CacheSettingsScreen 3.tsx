/**
 * Cache Settings Screen
 * 
 * Displays cache statistics and provides cache management controls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cacheManager, uploadQueue } from '../services/cache';
import { CacheStats } from '../services/cache/types';

export default function CacheSettingsScreen({ navigation }: any) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queueStats, setQueueStats] = useState({
    pending: 0,
    concurrency: 0,
    networkType: 'unknown',
    isConnected: false,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const cacheStats = await cacheManager.getStats();
      setStats(cacheStats);

      const queue = uploadQueue.getQueueStats();
      setQueueStats(queue);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      Alert.alert('Error', 'Failed to load cache statistics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStats();
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached files (excluding pending uploads). Files will be re-downloaded when needed. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await cacheManager.clearCache({ onlyDownloaded: true });
              if (result.success && result.data) {
                Alert.alert(
                  'Cache Cleared',
                  `Removed ${result.data.filesRemoved} files\nFreed ${formatBytes(result.data.bytesFreed)}`
                );
                await loadStats();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const handleRetryFailed = async () => {
    try {
      const failed = await uploadQueue.getFailedUploads();
      if (failed.length === 0) {
        Alert.alert('No Failed Uploads', 'All uploads are successful or pending.');
        return;
      }

      Alert.alert(
        'Retry Failed Uploads',
        `Retry ${failed.length} failed upload(s)?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Retry',
            onPress: async () => {
              await uploadQueue.retryFailed();
              Alert.alert('Retry Started', 'Failed uploads have been queued for retry');
              await loadStats();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to retry uploads');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatPercentage = (value: number, max: number): number => {
    return Math.round((value / max) * 100);
  };

  const getStatusColor = (percentage: number): string => {
    if (percentage < 70) return '#10b981'; // Green
    if (percentage < 90) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600">Loading cache statistics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600">Failed to load cache statistics</Text>
          <TouchableOpacity
            onPress={loadStats}
            className="mt-4 px-6 py-2 bg-blue-500 rounded-lg"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const maxCacheSize = 500 * 1024 * 1024; // 500MB
  const usagePercentage = formatPercentage(stats.totalSize, maxCacheSize);
  const statusColor = getStatusColor(usagePercentage);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
            <Text className="ml-2 text-xl font-semibold text-gray-900">
              Cache Settings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Cache Usage */}
        <View className="mt-4 mx-4 p-4 bg-white rounded-lg shadow-sm">
          <Text className="text-xl font-semibold text-gray-900 mb-3">Cache Usage</Text>
          
          {/* Progress Bar */}
          <View className="mb-3">
            <View className="flex-row justify-between mb-2">
              <Text className="text-base text-gray-600">
                {formatBytes(stats.totalSize)} / {formatBytes(maxCacheSize)}
              </Text>
              <Text className="text-base font-medium" style={{ color: statusColor }}>
                {usagePercentage}%
              </Text>
            </View>
            <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(usagePercentage, 100)}%`,
                  backgroundColor: statusColor,
                }}
              />
            </View>
          </View>

          {/* File Counts */}
          <View className="pt-3 border-t border-gray-200">
            <Text className="text-base font-medium text-gray-700 mb-2">Breakdown</Text>
            <View className="space-y-1">
              <View className="flex-row justify-between">
                <Text className="text-base text-gray-600">Total Files</Text>
                <Text className="text-base font-medium text-gray-900">{stats.totalFiles}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-base text-gray-600">Images</Text>
                <Text className="text-base text-gray-900">
                  {stats.breakdown.images.count} ({formatBytes(stats.breakdown.images.size)})
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-base text-gray-600">Documents</Text>
                <Text className="text-base text-gray-900">
                  {stats.breakdown.documents.count} ({formatBytes(stats.breakdown.documents.size)})
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-base text-gray-600">Pending Uploads</Text>
                <Text className="text-base font-medium text-blue-600">
                  {stats.breakdown.pending.count} ({formatBytes(stats.breakdown.pending.size)})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Upload Queue Status */}
        <View className="mt-4 mx-4 p-4 bg-white rounded-lg shadow-sm">
          <Text className="text-xl font-semibold text-gray-900 mb-3">Upload Queue</Text>
          
          <View className="space-y-1">
            <View className="flex-row justify-between">
              <Text className="text-base text-gray-600">Pending Uploads</Text>
              <Text className="text-base font-medium text-gray-900">
                {stats.pendingUploads}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-base text-gray-600">Failed Uploads</Text>
              <Text className="text-base font-medium text-red-600">
                {stats.failedUploads}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-base text-gray-600">Network</Text>
              <View className="flex-row items-center">
                <View
                  className="w-2 h-2 rounded-full mr-2"
                  style={{
                    backgroundColor: queueStats.isConnected ? '#10b981' : '#ef4444',
                  }}
                />
                <Text className="text-base text-gray-900 capitalize">
                  {queueStats.networkType}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-base text-gray-600">Concurrent Uploads</Text>
              <Text className="text-base text-gray-900">{queueStats.concurrency}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="mt-4 mx-4 space-y-3 mb-8">
          {/* Retry Failed Uploads */}
          {stats.failedUploads > 0 && (
            <TouchableOpacity
              onPress={handleRetryFailed}
              className="p-4 bg-blue-500 rounded-lg flex-row items-center justify-center"
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text className="ml-2 text-white font-medium">
                Retry Failed Uploads ({stats.failedUploads})
              </Text>
            </TouchableOpacity>
          )}

          {/* Clear Cache */}
          <TouchableOpacity
            onPress={handleClearCache}
            className="p-4 bg-red-500 rounded-lg flex-row items-center justify-center"
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text className="ml-2 text-white font-medium">Clear Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Information */}
        <View className="mt-4 mx-4 p-4 bg-blue-50 rounded-lg mb-8">
          <View className="flex-row">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <View className="ml-3 flex-1">
              <Text className="text-base text-blue-900 font-medium mb-1">About Cache</Text>
              <Text className="text-base text-blue-800 leading-5">
                The app caches up to 500MB of files for offline access. Old files are automatically removed when space is needed. Pending uploads are never deleted.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

