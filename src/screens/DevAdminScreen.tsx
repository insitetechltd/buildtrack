import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../state/authStore';
import { useDatabaseConfig } from '../state/databaseConfigStore';
import StandardHeader from '../components/StandardHeader';
import * as databaseUtils from '../utils/databaseUtils';

// SECURITY: Dev Admin Tools are ONLY accessible to Tristan Admin of Insite Tech
const AUTHORIZED_DEV_ADMIN_EMAIL = 'admin_tristan@insitetech.com';

export default function DevAdminScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const {
    activeEnvironment,
    environments,
    switchEnvironment,
    addEnvironment,
    removeEnvironment,
  } = useDatabaseConfig();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvUrl, setNewEnvUrl] = useState('');
  const [newEnvKey, setNewEnvKey] = useState('');

  // SECURITY CHECK: Only allow Tristan Admin of Insite Tech
  if (!user || user.email !== AUTHORIZED_DEV_ADMIN_EMAIL) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Ionicons name="shield-off" size={64} color="#ef4444" />
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginTop: 16, textAlign: 'center' }}>
          Access Denied
        </Text>
        <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
          Dev Admin Tools are restricted to authorized personnel only.
        </Text>
        <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 16, textAlign: 'center' }}>
          Unauthorized access attempts are logged.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 24, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Test Scripts
  const testScripts = [
    {
      id: 'generate-mock',
      title: 'Generate Mock Tasks',
      description: 'Create test tasks for current environment',
      icon: 'create-outline',
      color: '#4CAF50',
      action: async () => {
        setIsLoading(true);
        try {
          await databaseUtils.generateMockTasks(50);
          Alert.alert('Success', '50 mock tasks generated');
        } catch (error: any) {
          Alert.alert('Error', error.message);
        } finally {
          setIsLoading(false);
        }
      },
    },
    {
      id: 'cleanup-mock',
      title: 'Cleanup Mock Tasks',
      description: 'Remove all mock/test tasks',
      icon: 'trash-outline',
      color: '#FF9800',
      action: async () => {
        Alert.alert(
          'Confirm Cleanup',
          'This will remove all mock tasks. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                setIsLoading(true);
                try {
                  await databaseUtils.cleanupMockTasks();
                  Alert.alert('Success', 'Mock tasks deleted');
                } catch (error: any) {
                  Alert.alert('Error', error.message);
                } finally {
                  setIsLoading(false);
                }
              },
            },
          ]
        );
      },
    },
    {
      id: 'reset-db',
      title: 'Reset Database',
      description: 'Clear all data and reset to initial state',
      icon: 'refresh-outline',
      color: '#F44336',
      action: async () => {
        Alert.alert(
          'DANGER: Reset Database',
          'This will DELETE ALL DATA in the current environment. This cannot be undone!',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'RESET',
              style: 'destructive',
              onPress: async () => {
                setIsLoading(true);
                try {
                  await databaseUtils.resetDatabase();
                  Alert.alert('Success', 'Database reset complete');
                } catch (error: any) {
                  Alert.alert('Error', error.message);
                } finally {
                  setIsLoading(false);
                }
              },
            },
          ]
        );
      },
    },
    {
      id: 'seed-db',
      title: 'Seed Database',
      description: 'Populate with sample data',
      icon: 'bulb-outline',
      color: '#2196F3',
      action: async () => {
        setIsLoading(true);
        try {
          await databaseUtils.seedDatabase();
          Alert.alert('Success', 'Database seeded with sample data');
        } catch (error: any) {
          Alert.alert('Error', error.message);
        } finally {
          setIsLoading(false);
        }
      },
    },
    {
      id: 'run-tests',
      title: 'Run Comprehensive Tests',
      description: 'Execute full test suite',
      icon: 'checkmark-done-outline',
      color: '#9C27B0',
      action: async () => {
        setIsLoading(true);
        try {
          const results = await databaseUtils.runComprehensiveTests();
          Alert.alert(
            'Test Results',
            `Passed: ${results.passed}\nFailed: ${results.failed}\nTotal: ${results.total}`
          );
        } catch (error: any) {
          Alert.alert('Error', error.message);
        } finally {
          setIsLoading(false);
        }
      },
    },
    {
      id: 'check-health',
      title: 'Database Health Check',
      description: 'Verify database connection and integrity',
      icon: 'medkit-outline',
      color: '#00BCD4',
      action: async () => {
        setIsLoading(true);
        try {
          const health = await databaseUtils.checkDatabaseHealth();
          Alert.alert(
            'Database Health',
            `Status: ${health.status}\n` +
            `Tables: ${health.tables}\n` +
            `Users: ${health.users}\n` +
            `Projects: ${health.projects}\n` +
            `Tasks: ${health.tasks}\n` +
            `Response Time: ${health.responseTime}ms`
          );
        } catch (error: any) {
          Alert.alert('Error', error.message);
        } finally {
          setIsLoading(false);
        }
      },
    },
  ];

  const handleSwitchEnvironment = async (envName: string) => {
    if (envName === 'production') {
      Alert.alert(
        'Switch to Production?',
        'You are about to switch to the production database. Be careful!',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch',
            onPress: async () => {
              setIsLoading(true);
              try {
                await switchEnvironment(envName);
                Alert.alert('Success', `Switched to ${envName}`);
              } catch (error: any) {
                Alert.alert('Error', error.message);
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]
      );
    } else {
      setIsLoading(true);
      try {
        await switchEnvironment(envName);
        Alert.alert('Success', `Switched to ${envName}`);
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddEnvironment = () => {
    if (!newEnvName || !newEnvUrl || !newEnvKey) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    addEnvironment(newEnvName, newEnvUrl, newEnvKey);
    setShowAddEnv(false);
    setNewEnvName('');
    setNewEnvUrl('');
    setNewEnvKey('');
    Alert.alert('Success', `Environment "${newEnvName}" added`);
  };

  const handleRemoveEnvironment = (envName: string) => {
    if (envName === 'production') {
      Alert.alert('Error', 'Cannot remove production environment');
      return;
    }

    Alert.alert(
      'Remove Environment',
      `Remove "${envName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeEnvironment(envName);
            Alert.alert('Success', `Environment removed`);
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StandardHeader
        title="Dev Admin"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView className="flex-1">
        {/* User Info */}
        <View className="bg-white p-4 mb-2">
          <Text className="text-xs text-gray-500 mb-1">LOGGED IN AS</Text>
          <Text className="text-lg font-semibold">{user?.name}</Text>
          <Text className="text-sm text-gray-600">{user?.email}</Text>
          <Text className="text-xs text-gray-500 mt-1">
            Role: {user?.role?.toUpperCase()}
          </Text>
        </View>

        {/* Active Environment */}
        <View className="bg-white p-4 mb-2">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs text-gray-500">ACTIVE ENVIRONMENT</Text>
            <View
              className={`px-2 py-1 rounded ${
                activeEnvironment === 'production'
                  ? 'bg-red-100'
                  : activeEnvironment === 'testing'
                  ? 'bg-yellow-100'
                  : 'bg-blue-100'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  activeEnvironment === 'production'
                    ? 'text-red-600'
                    : activeEnvironment === 'testing'
                    ? 'text-yellow-600'
                    : 'text-blue-600'
                }`}
              >
                {activeEnvironment?.toUpperCase() || 'NONE'}
              </Text>
            </View>
          </View>
          {activeEnvironment && environments[activeEnvironment] && (
            <Text className="text-xs text-gray-500 mt-1">
              {environments[activeEnvironment].url}
            </Text>
          )}
        </View>

        {/* Environment Switcher */}
        <View className="bg-white p-4 mb-2">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs text-gray-500">DATABASE ENVIRONMENTS</Text>
            <TouchableOpacity
              onPress={() => setShowAddEnv(!showAddEnv)}
              className="flex-row items-center"
            >
              <Ionicons name="add-circle-outline" size={20} color="#2196F3" />
              <Text className="text-blue-600 ml-1 text-sm">Add</Text>
            </TouchableOpacity>
          </View>

          {Object.keys(environments).map((envName) => (
            <TouchableOpacity
              key={envName}
              onPress={() => handleSwitchEnvironment(envName)}
              className="flex-row items-center justify-between p-3 mb-2 bg-gray-50 rounded-lg"
            >
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="font-semibold capitalize">{envName}</Text>
                  {activeEnvironment === envName && (
                    <View className="ml-2 w-2 h-2 rounded-full bg-green-500" />
                  )}
                </View>
                <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>
                  {environments[envName].url}
                </Text>
              </View>
              {envName !== 'production' && (
                <TouchableOpacity
                  onPress={() => handleRemoveEnvironment(envName)}
                  className="ml-2"
                >
                  <Ionicons name="trash-outline" size={20} color="#F44336" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}

          {showAddEnv && (
            <View className="mt-3 p-3 bg-blue-50 rounded-lg">
              <Text className="text-sm font-semibold mb-2">
                Add New Environment
              </Text>
              <TextInput
                placeholder="Environment Name (e.g., staging)"
                value={newEnvName}
                onChangeText={setNewEnvName}
                className="bg-white p-2 rounded mb-2 text-sm"
              />
              <TextInput
                placeholder="Supabase URL"
                value={newEnvUrl}
                onChangeText={setNewEnvUrl}
                className="bg-white p-2 rounded mb-2 text-sm"
                autoCapitalize="none"
              />
              <TextInput
                placeholder="Anon Key"
                value={newEnvKey}
                onChangeText={setNewEnvKey}
                className="bg-white p-2 rounded mb-2 text-sm"
                autoCapitalize="none"
                secureTextEntry
              />
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleAddEnvironment}
                  className="flex-1 bg-blue-600 p-2 rounded"
                >
                  <Text className="text-white text-center font-semibold">
                    Add
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowAddEnv(false)}
                  className="flex-1 bg-gray-300 p-2 rounded"
                >
                  <Text className="text-gray-700 text-center font-semibold">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Testing Tools */}
        <View className="bg-white p-4 mb-2">
          <Text className="text-xs text-gray-500 mb-3">TESTING TOOLS</Text>
          <View className="gap-2">
            {testScripts.map((script) => (
              <TouchableOpacity
                key={script.id}
                onPress={script.action}
                disabled={isLoading}
                className="flex-row items-center p-3 bg-gray-50 rounded-lg"
                style={{ borderLeftWidth: 4, borderLeftColor: script.color }}
              >
                <Ionicons
                  name={script.icon as any}
                  size={24}
                  color={script.color}
                />
                <View className="flex-1 ml-3">
                  <Text className="font-semibold">{script.title}</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {script.description}
                  </Text>
                </View>
                {isLoading && <ActivityIndicator size="small" color={script.color} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Warning Banner */}
        {activeEnvironment === 'production' && (
          <View className="bg-red-100 p-4 m-4 rounded-lg border border-red-300">
            <View className="flex-row items-center">
              <Ionicons name="warning" size={24} color="#F44336" />
              <Text className="text-red-600 font-semibold ml-2 flex-1">
                You are connected to PRODUCTION database. Be extremely careful!
              </Text>
            </View>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white p-6 rounded-lg">
            <ActivityIndicator size="large" color="#2196F3" />
            <Text className="mt-3 text-gray-700">Processing...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

