import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { Typography, Card, Button, Input, AdminMenuDrawer } from '../../components/common';
import { ExpenseType, Expense } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { ValidationUtils, SanitizationUtils } from '../../utils';
import { ExpenseService, StorageService } from '../../services';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type ExpenseScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Expenses'>;

type ViewMode = 'add' | 'manage';

const ExpenseScreen: React.FC = () => {
  const navigation = useNavigation<ExpenseScreenNavigationProp>();
  const { user, logout } = useAuthStore();
  const [menuVisible, setMenuVisible] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('add');
  
  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    expenseDate: '',
    receiptImageUri: null as string | null,
    receiptImageUrl: null as string | null,
  });

  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Manage expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<ExpenseType | null>(null);

  // Format date to DD/MM/YYYY
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Initialize expense date to today
  React.useEffect(() => {
    if (!formData.expenseDate) {
      setFormData(prev => ({ ...prev, expenseDate: formatDate(new Date()) }));
    }
  }, []);

  // Load expenses when switching to manage view
  useEffect(() => {
    if (viewMode === 'manage' && user?.id) {
      loadExpenses();
    }
  }, [viewMode, user?.id]);

  const loadExpenses = async () => {
    if (!user?.id) return;
    
    setIsLoadingExpenses(true);
    try {
      const allExpenses = await ExpenseService.getAllExpenses(user.id);
      setExpenses(allExpenses);
    } catch (error) {
      Alert.alert('Error', 'Failed to load expenses. Please try again.');
    } finally {
      setIsLoadingExpenses(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
  };

  // Filter expenses based on selected filter
  const filteredExpenses = selectedFilter
    ? expenses.filter(expense => expense.expenseType === selectedFilter)
    : expenses;

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              await ExpenseService.deleteExpense(expenseId, user.id);
              Alert.alert('Success', 'Expense deleted successfully');
              await loadExpenses();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleExpenseTypeSelect = (type: ExpenseType) => {
    setSelectedExpenseType(type);
    // Clear error when type is selected
    if (formErrors.expenseType) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.expenseType;
        return newErrors;
      });
    }
  };

  const handleFormChange = (field: string, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePickReceiptImage = async () => {
    try {
      const imageUri = await StorageService.pickImage();
      if (imageUri) {
        handleFormChange('receiptImageUri', imageUri);
        handleFormChange('receiptImageUrl', null); // Clear existing URL when new image is picked
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pick image';
      Alert.alert('Error', errorMessage);
    }
  };

  // Format date input to automatically add slashes
  const formatDateInput = (text: string) => {
    const sanitized = SanitizationUtils.sanitizeDateString(text);
    const numbers = sanitized.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!selectedExpenseType) {
      errors.expenseType = 'Please select an expense type';
    }

    if (!formData.amount || formData.amount.trim() === '') {
      errors.amount = 'Amount is required';
    } else {
      const amountValue = parseFloat(formData.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        errors.amount = 'Amount must be a positive number';
      }
    }

    if (!formData.expenseDate || formData.expenseDate.trim() === '') {
      errors.expenseDate = 'Expense date is required';
    } else {
      const sanitized = SanitizationUtils.sanitizeDateString(formData.expenseDate);
      const validation = ValidationUtils.validateExpenseDateString(sanitized);
      if (!validation.isValid) {
        errors.expenseDate = validation.error || 'Invalid date format';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user?.id || !selectedExpenseType) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload receipt image if a new one was picked
      let receiptImageUrl = formData.receiptImageUrl;
      if (formData.receiptImageUri) {
        const uploadResult = await StorageService.uploadExpenseReceiptImage(
          formData.receiptImageUri,
          user.id
        );
        receiptImageUrl = uploadResult.url;
      }

      // Parse date from DD/MM/YYYY format
      const dateParts = formData.expenseDate.split('/').map(Number);
      const day = dateParts[0];
      const month = dateParts[1];
      const year = dateParts[2];
      
      if (!day || !month || !year) {
        throw new Error('Invalid date format');
      }
      
      const expenseDate = new Date(year, month - 1, day);

      const descriptionValue = formData.description.trim();
      const expenseData = {
        expenseType: selectedExpenseType,
        amount: parseFloat(formData.amount),
        ...(descriptionValue ? { description: descriptionValue } : {}),
        ...(receiptImageUrl ? { receiptImageUrl } : {}),
        expenseDate,
      };

      await ExpenseService.createExpense(expenseData, user.id);

      Alert.alert('Success', 'Expense saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setSelectedExpenseType(null);
            setFormData({
              amount: '',
              description: '',
              expenseDate: formatDate(new Date()),
              receiptImageUri: null,
              receiptImageUrl: null,
            });
            setFormErrors({});
          },
        },
      ]);
      
      // Refresh expenses list if in manage view
      if (viewMode === 'manage') {
        await loadExpenses();
      }
    } catch (error) {
      // Extract more detailed error information
      let errorMessage = 'Failed to save expense. Please try again.';
      if (error instanceof Error) {
        // Check if it's a DataAccessError with details
        if ((error as any).details && (error as any).details.error) {
          const supabaseError = (error as any).details.error;
          if (supabaseError.message) {
            errorMessage = supabaseError.message;
          } else if (supabaseError.hint) {
            errorMessage = supabaseError.hint;
          } else {
            errorMessage = error.message;
          }
        } else {
          errorMessage = error.message;
        }
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigate = (route: keyof AdminStackParamList) => {
    navigation.navigate(route);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
        </TouchableOpacity>
        <Typography variant="h1" style={styles.headerTitle}>
          Expenses
        </Typography>
        <View style={styles.headerRight} />
      </View>

      {/* View Mode Toggle Buttons */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'add' && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode('add')}
          activeOpacity={0.7}
        >
          <Typography
            variant="body"
            style={[
              styles.viewModeButtonText,
              viewMode === 'add' && styles.viewModeButtonTextActive,
            ]}
          >
            Add Expense
          </Typography>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === 'manage' && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode('manage')}
          activeOpacity={0.7}
        >
          <Typography
            variant="body"
            style={[
              styles.viewModeButtonText,
              viewMode === 'manage' && styles.viewModeButtonTextActive,
            ]}
          >
            Manage Expense
          </Typography>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {viewMode === 'add' ? (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
          {/* Expense Type Selection */}
          <Card style={styles.typeSelectionCard}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Select Expense Type
            </Typography>
            <View style={styles.typeButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedExpenseType === 'diesel' && styles.typeButtonActive,
                ]}
                onPress={() => handleExpenseTypeSelect('diesel')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={selectedExpenseType === 'diesel' ? 'car' : 'car-outline'}
                  size={32}
                  color={selectedExpenseType === 'diesel' ? UI_CONFIG.colors.textLight : UI_CONFIG.colors.text}
                />
                <Typography
                  variant="body"
                  style={[
                    styles.typeButtonText,
                    selectedExpenseType === 'diesel' && styles.typeButtonTextActive,
                  ]}
                >
                  Diesel Expense
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedExpenseType === 'maintenance' && styles.typeButtonActive,
                ]}
                onPress={() => handleExpenseTypeSelect('maintenance')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={selectedExpenseType === 'maintenance' ? 'construct' : 'construct-outline'}
                  size={32}
                  color={selectedExpenseType === 'maintenance' ? UI_CONFIG.colors.textLight : UI_CONFIG.colors.text}
                />
                <Typography
                  variant="body"
                  style={[
                    styles.typeButtonText,
                    selectedExpenseType === 'maintenance' && styles.typeButtonTextActive,
                  ]}
                >
                  Maintenance Expense
                </Typography>
              </TouchableOpacity>
            </View>
            {formErrors.expenseType && (
              <Typography variant="caption" style={styles.errorText}>
                {formErrors.expenseType}
              </Typography>
            )}
          </Card>

          {/* Expense Form */}
          <Card style={styles.formCard}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Expense Details
            </Typography>

            <View style={styles.formField}>
              <Input
                label="Amount (₹) *"
                value={formData.amount}
                onChangeText={(value) => handleFormChange('amount', value)}
                placeholder="Enter amount"
                {...(formErrors.amount ? { error: formErrors.amount } : {})}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="Description"
                value={formData.description}
                onChangeText={(value) => handleFormChange('description', value)}
                placeholder="Enter description (optional)"
                {...(formErrors.description ? { error: formErrors.description } : {})}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formField}>
              <Input
                label="Expense Date (DD/MM/YYYY) *"
                value={formData.expenseDate}
                onChangeText={(value) => handleFormChange('expenseDate', formatDateInput(value))}
                placeholder="DD/MM/YYYY"
                {...(formErrors.expenseDate ? { error: formErrors.expenseDate } : {})}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>

            <View style={styles.formField}>
              <Typography variant="body" style={styles.imageLabel}>
                Receipt Photo (Optional)
              </Typography>
              <Typography variant="caption" style={styles.imageHint}>
                Upload a photo of the expense receipt
              </Typography>
              
              {(formData.receiptImageUri || (formData.receiptImageUrl && typeof formData.receiptImageUrl === 'string' && formData.receiptImageUrl.trim() !== '')) ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: formData.receiptImageUri || formData.receiptImageUrl || '' }}
                    style={styles.receiptPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => {
                      handleFormChange('receiptImageUri', null);
                      handleFormChange('receiptImageUrl', null);
                    }}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close-circle" size={24} color={UI_CONFIG.colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handlePickReceiptImage}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-outline" size={48} color={UI_CONFIG.colors.primary} />
                  <Typography variant="body" style={styles.imagePickerText}>
                    Tap to select receipt photo
                  </Typography>
                </TouchableOpacity>
              )}
            </View>
          </Card>

          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Button
              title={isSubmitting ? 'Saving...' : 'Submit Expense'}
              onPress={handleSubmit}
              variant="primary"
              disabled={isSubmitting}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === 'diesel' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(selectedFilter === 'diesel' ? null : 'diesel')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={selectedFilter === 'diesel' ? 'car' : 'car-outline'}
                size={20}
                color={selectedFilter === 'diesel' ? UI_CONFIG.colors.textLight : UI_CONFIG.colors.text}
              />
              <Typography
                variant="body"
                style={[
                  styles.filterButtonText,
                  selectedFilter === 'diesel' && styles.filterButtonTextActive,
                ]}
              >
                Diesel
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === 'maintenance' && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(selectedFilter === 'maintenance' ? null : 'maintenance')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={selectedFilter === 'maintenance' ? 'construct' : 'construct-outline'}
                size={20}
                color={selectedFilter === 'maintenance' ? UI_CONFIG.colors.textLight : UI_CONFIG.colors.text}
              />
              <Typography
                variant="body"
                style={[
                  styles.filterButtonText,
                  selectedFilter === 'maintenance' && styles.filterButtonTextActive,
                ]}
              >
                Maintenance
              </Typography>
            </TouchableOpacity>
          </View>

          {isLoadingExpenses && expenses.length === 0 ? (
            <Card style={styles.emptyState}>
              <Typography variant="body" style={styles.loadingText}>
                Loading expenses...
              </Typography>
            </Card>
          ) : filteredExpenses.length === 0 ? (
            <Card style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyText}>
                {selectedFilter ? `No ${selectedFilter} expenses found` : 'No expenses found'}
              </Typography>
              <Typography variant="caption" style={styles.emptySubtext}>
                {selectedFilter ? 'Try selecting a different filter' : 'Add your first expense to get started'}
              </Typography>
            </Card>
          ) : (
            <>
              <Typography variant="h3" style={styles.sectionTitle}>
                {selectedFilter ? `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Expenses` : 'All Expenses'} ({filteredExpenses.length})
              </Typography>
              {filteredExpenses.map((expense) => (
                <Card key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseCardHeader}>
                    <View style={styles.expenseCardLeft}>
                      <View style={styles.expenseTypeBadge}>
                        <Ionicons
                          name={expense.expenseType === 'diesel' ? 'car' : 'construct'}
                          size={20}
                          color={UI_CONFIG.colors.textLight}
                        />
                        <Typography variant="caption" style={styles.expenseTypeText}>
                          {expense.expenseType === 'diesel' ? 'Diesel' : 'Maintenance'}
                        </Typography>
                      </View>
                      <Typography variant="h3" style={styles.expenseAmount}>
                        ₹{expense.amount.toFixed(2)}
                      </Typography>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteExpense(expense.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={20} color={UI_CONFIG.colors.error} />
                    </TouchableOpacity>
                  </View>
                  {expense.description && (
                    <Typography variant="body" style={styles.expenseDescription}>
                      {expense.description}
                    </Typography>
                  )}
                  {expense.receiptImageUrl && (
                    <View style={styles.receiptImageContainer}>
                      <Image
                        source={{ uri: expense.receiptImageUrl }}
                        style={styles.receiptImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  <View style={styles.expenseCardFooter}>
                    <Typography variant="caption" style={styles.expenseDate}>
                      Date: {formatDate(expense.expenseDate)}
                    </Typography>
                    <Typography variant="caption" style={styles.expenseDate}>
                      Added: {formatDate(expense.createdAt)}
                    </Typography>
                  </View>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Menu Drawer */}
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleNavigate}
        onLogout={logout}
        currentRoute="Expenses"
      />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  typeSelectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.border,
  },
  typeButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  typeButtonText: {
    marginTop: 8,
    textAlign: 'center',
    color: UI_CONFIG.colors.text,
  },
  typeButtonTextActive: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
  },
  formCard: {
    marginBottom: 16,
    padding: 16,
  },
  formField: {
    marginBottom: 16,
  },
  errorText: {
    color: UI_CONFIG.colors.error,
    marginTop: 4,
  },
  submitContainer: {
    paddingVertical: 16,
  },
  submitButton: {
    width: '100%',
  },
  viewModeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
    gap: 12,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  viewModeButtonText: {
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
  },
  viewModeButtonTextActive: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  loadingText: {
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    color: UI_CONFIG.colors.textSecondary,
  },
  expenseCard: {
    marginBottom: 12,
    padding: 16,
  },
  expenseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseCardLeft: {
    flex: 1,
  },
  expenseTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI_CONFIG.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  expenseTypeText: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  expenseAmount: {
    fontSize: 22
    ,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.background,
  },
  expenseDescription: {
    marginBottom: 8,
    color: UI_CONFIG.colors.textSecondary,
  },
  expenseCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: UI_CONFIG.colors.border,
  },
  expenseDate: {
    color: UI_CONFIG.colors.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: UI_CONFIG.colors.primary,
    borderColor: UI_CONFIG.colors.primary,
  },
  filterButtonText: {
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: '600',
  },
  imageLabel: {
    marginBottom: 8,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
  },
  imageHint: {
    marginBottom: 12,
    color: UI_CONFIG.colors.textSecondary,
  },
  imagePickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 12,
    backgroundColor: UI_CONFIG.colors.background,
    borderWidth: 2,
    borderColor: UI_CONFIG.colors.border,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    marginTop: 8,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: UI_CONFIG.colors.surface,
    borderRadius: 20,
    padding: 4,
  },
  receiptImageContainer: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
});

export default ExpenseScreen;
