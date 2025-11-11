// src/screens/admin/DataMigrationScreen.tsx

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, AdminMenuDrawer } from '../../components/common';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { MigrationService, MigrationResult } from '../../services/migration.service';
import { useAuthStore } from '../../store/authStore';
import { UI_CONFIG } from '../../constants/config';
import { AdminRoute } from '../../components/common/AdminMenuDrawer';

type DataMigrationScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Migration'>;

const DataMigrationScreen: React.FC = () => {
  const navigation = useNavigation<DataMigrationScreenNavigationProp>();
  const { logout } = useAuthStore();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; issues: string[] } | null>(null);
  const [options, setOptions] = useState({
    skipExisting: true,
    createAuthAccounts: true,
  });

  const handleMenuNavigate = (route: AdminRoute) => {
    if (route === 'Migration') {
      // Already on Migration, just close menu
      return;
    }
    navigation.navigate(route);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleStartMigration = () => {
    Alert.alert(
      'Start Migration',
      'This will migrate all data from localStorage to Supabase. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Migration',
          style: 'destructive',
          onPress: async () => {
            setIsMigrating(true);
            setMigrationResult(null);
            try {
              const result = await MigrationService.migrateAll({
                skipExisting: options.skipExisting,
                createAuthAccounts: options.createAuthAccounts,
                dryRun: false,
              });
              setMigrationResult(result);
              if (result.success) {
                Alert.alert('Success', 'Data migration completed successfully!');
              } else {
                Alert.alert(
                  'Migration Completed with Errors',
                  `Migration completed but ${result.errors.length} error(s) occurred. Check the details below.`
                );
              }
            } catch (error: any) {
              Alert.alert('Migration Failed', error.message || 'An unexpected error occurred');
            } finally {
              setIsMigrating(false);
            }
          },
        },
      ]
    );
  };

  const handleDryRun = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const result = await MigrationService.migrateAll({
        skipExisting: options.skipExisting,
        createAuthAccounts: options.createAuthAccounts,
        dryRun: true,
      });
      setMigrationResult(result);
      Alert.alert(
        'Dry Run Complete',
        `Would migrate:\n- ${result.migrated.users} users\n- ${result.migrated.addresses} addresses\n- ${result.migrated.vehicles} vehicles\n- ${result.migrated.bookings} bookings`
      );
    } catch (error: any) {
      Alert.alert('Dry Run Failed', error.message || 'An unexpected error occurred');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const result = await MigrationService.validateMigration();
      setValidationResult(result);
      if (result.valid) {
        Alert.alert('Validation Success', 'All data integrity checks passed!');
      } else {
        Alert.alert(
          'Validation Issues Found',
          `Found ${result.issues.length} issue(s). Check the details below.`
        );
      }
    } catch (error: any) {
      Alert.alert('Validation Failed', error.message || 'An unexpected error occurred');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Migration"
      />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="menu" size={28} color={UI_CONFIG.colors.primary} />
        </TouchableOpacity>
        <Typography variant="h2" style={styles.headerTitle}>
          Data Migration
        </Typography>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Migration Options
          </Typography>
          
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setOptions({ ...options, skipExisting: !options.skipExisting })}
          >
            <View style={styles.optionContent}>
              <Typography variant="body" style={styles.optionLabel}>
                Skip Existing Records
              </Typography>
              <Typography variant="caption" style={styles.optionDescription}>
                Skip records that already exist in Supabase
              </Typography>
            </View>
            <Ionicons
              name={options.skipExisting ? 'checkbox' : 'square-outline'}
              size={24}
              color={UI_CONFIG.colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setOptions({ ...options, createAuthAccounts: !options.createAuthAccounts })}
          >
            <View style={styles.optionContent}>
              <Typography variant="body" style={styles.optionLabel}>
                Create Auth Accounts
              </Typography>
              <Typography variant="caption" style={styles.optionDescription}>
                Create Supabase Auth accounts for users (requires passwords)
              </Typography>
            </View>
            <Ionicons
              name={options.createAuthAccounts ? 'checkbox' : 'square-outline'}
              size={24}
              color={UI_CONFIG.colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Actions
          </Typography>

          <TouchableOpacity
            style={[styles.button, styles.dryRunButton]}
            onPress={handleDryRun}
            disabled={isMigrating || isValidating}
          >
            {isMigrating ? (
              <ActivityIndicator color={UI_CONFIG.colors.primary} />
            ) : (
              <>
                <Ionicons name="eye-outline" size={20} color={UI_CONFIG.colors.primary} />
                <Typography variant="button" style={styles.buttonText}>
                  Dry Run (Preview)
                </Typography>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.migrateButton]}
            onPress={handleStartMigration}
            disabled={isMigrating || isValidating}
          >
            {isMigrating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Typography variant="button" style={[styles.buttonText, styles.migrateButtonText]}>
                  Start Migration
                </Typography>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.validateButton]}
            onPress={handleValidate}
            disabled={isMigrating || isValidating}
          >
            {isValidating ? (
              <ActivityIndicator color={UI_CONFIG.colors.primary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={UI_CONFIG.colors.primary} />
                <Typography variant="button" style={styles.buttonText}>
                  Validate Data
                </Typography>
              </>
            )}
          </TouchableOpacity>
        </View>

        {migrationResult && (
          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Migration Results
            </Typography>
            
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Typography variant="body" style={styles.resultLabel}>Status:</Typography>
                <Typography
                  variant="body"
                  style={[
                    styles.resultValue,
                    migrationResult.success ? styles.successText : styles.errorText,
                  ]}
                >
                  {migrationResult.success ? 'Success' : 'Completed with Errors'}
                </Typography>
              </View>

              <View style={styles.resultRow}>
                <Typography variant="body" style={styles.resultLabel}>Users:</Typography>
                <Typography variant="body" style={styles.resultValue}>
                  {migrationResult.migrated.users}
                </Typography>
              </View>

              <View style={styles.resultRow}>
                <Typography variant="body" style={styles.resultLabel}>Addresses:</Typography>
                <Typography variant="body" style={styles.resultValue}>
                  {migrationResult.migrated.addresses}
                </Typography>
              </View>

              <View style={styles.resultRow}>
                <Typography variant="body" style={styles.resultLabel}>Vehicles:</Typography>
                <Typography variant="body" style={styles.resultValue}>
                  {migrationResult.migrated.vehicles}
                </Typography>
              </View>

              <View style={styles.resultRow}>
                <Typography variant="body" style={styles.resultLabel}>Bookings:</Typography>
                <Typography variant="body" style={styles.resultValue}>
                  {migrationResult.migrated.bookings}
                </Typography>
              </View>

              {migrationResult.errors.length > 0 && (
                <View style={styles.errorsContainer}>
                  <Typography variant="body" style={styles.errorsTitle}>
                    Errors ({migrationResult.errors.length}):
                  </Typography>
                  {migrationResult.errors.slice(0, 5).map((error, index) => (
                    <Typography key={index} variant="caption" style={styles.errorText}>
                      • {error}
                    </Typography>
                  ))}
                  {migrationResult.errors.length > 5 && (
                    <Typography variant="caption" style={styles.errorText}>
                      ... and {migrationResult.errors.length - 5} more
                    </Typography>
                  )}
                </View>
              )}

              {migrationResult.warnings.length > 0 && (
                <View style={styles.warningsContainer}>
                  <Typography variant="body" style={styles.warningsTitle}>
                    Warnings ({migrationResult.warnings.length}):
                  </Typography>
                  {migrationResult.warnings.slice(0, 5).map((warning, index) => (
                    <Typography key={index} variant="caption" style={styles.warningText}>
                      • {warning}
                    </Typography>
                  ))}
                  {migrationResult.warnings.length > 5 && (
                    <Typography variant="caption" style={styles.warningText}>
                      ... and {migrationResult.warnings.length - 5} more
                    </Typography>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {validationResult && (
          <View style={styles.section}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Validation Results
            </Typography>
            
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Typography variant="body" style={styles.resultLabel}>Status:</Typography>
                <Typography
                  variant="body"
                  style={[
                    styles.resultValue,
                    validationResult.valid ? styles.successText : styles.errorText,
                  ]}
                >
                  {validationResult.valid ? 'Valid' : 'Issues Found'}
                </Typography>
              </View>

              {validationResult.issues.length > 0 && (
                <View style={styles.errorsContainer}>
                  <Typography variant="body" style={styles.errorsTitle}>
                    Issues ({validationResult.issues.length}):
                  </Typography>
                  {validationResult.issues.map((issue, index) => (
                    <Typography key={index} variant="caption" style={styles.errorText}>
                      • {issue}
                    </Typography>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.infoSection}>
          <Typography variant="caption" style={styles.infoText}>
            💡 Tip: Run a dry run first to preview what will be migrated before starting the actual migration.
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 8,
    marginBottom: 12,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    color: UI_CONFIG.colors.textSecondary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  dryRunButton: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.primary,
  },
  migrateButton: {
    backgroundColor: UI_CONFIG.colors.primary,
  },
  validateButton: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.primary,
  },
  buttonText: {
    color: UI_CONFIG.colors.primary,
    fontWeight: '600',
  },
  migrateButtonText: {
    color: '#fff',
  },
  resultCard: {
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 8,
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultLabel: {
    fontWeight: '600',
  },
  resultValue: {
    fontWeight: '500',
  },
  successText: {
    color: '#10b981',
  },
  errorText: {
    color: '#ef4444',
  },
  errorsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  errorsTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#ef4444',
  },
  warningsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  warningsTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#f59e0b',
  },
  warningText: {
    color: '#f59e0b',
    marginBottom: 4,
  },
  infoSection: {
    marginTop: 8,
    padding: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 8,
  },
  infoText: {
    color: UI_CONFIG.colors.textSecondary,
    lineHeight: 20,
  },
});

export default DataMigrationScreen;

