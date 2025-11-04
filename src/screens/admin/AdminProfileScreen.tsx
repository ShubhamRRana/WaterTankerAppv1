import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button, Card, LoadingSpinner, AdminMenuDrawer } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../types';
import { UI_CONFIG } from '../../constants/config';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type AdminProfileScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'Profile'>;

const AdminProfileScreen: React.FC = () => {
  const navigation = useNavigation<AdminProfileScreenNavigationProp>();
  const { user, updateUser, logout, isLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    businessName: '',
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({
        businessName: user.businessName || '',
        name: user.name || '',
        phone: user.phone || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Validate password if provided
    if (editForm.password || editForm.confirmPassword) {
      if (!editForm.password) {
        Alert.alert('Error', 'Please enter a new password');
        return;
      }
      if (editForm.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return;
      }
      if (editForm.password !== editForm.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
    }
    
    try {
      const updates: Partial<User> = {
        businessName: editForm.businessName.trim(),
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
      };
      
      // Only update password if provided
      if (editForm.password) {
        updates.password = editForm.password; // In real app, this should be hashed
      }
      
      await updateUser(updates);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleMenuNavigate = (route: 'Bookings' | 'Drivers' | 'Vehicles' | 'Reports' | 'Profile') => {
    if (route === 'Profile') {
      // Already on Profile, just close menu
      return;
    }
    navigation.navigate(route);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBusinessInitials = (businessName: string) => {
    return businessName
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Typography variant="body" style={styles.loadingText}>
            Loading profile...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Typography variant="h3">Profile Not Found</Typography>
          <Typography variant="body" style={styles.loadingText}>Try logging in again.</Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={24} color={UI_CONFIG.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Typography variant="h2" style={styles.headerTitle}>Profile</Typography>
            </View>
          </View>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {user.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Typography variant="h3" style={styles.avatarText}>
                  {getBusinessInitials(user.businessName || user.name || 'A')}
                </Typography>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Typography variant="h3" style={styles.userName}>{user.businessName || user.name}</Typography>
              <Typography variant="body" style={styles.userPhone}>{user.phone}</Typography>
            </View>
          </View>

          {!isEditing && (
            <Button title="Edit Profile" onPress={() => setIsEditing(true)} variant="primary" />
          )}
        </Card>

        {isEditing && (
          <Card style={styles.editCard}>
            <Typography variant="h3" style={styles.sectionTitle}>Edit Profile</Typography>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Business Name</Typography>
              <TextInput
                style={styles.textInput}
                value={editForm.businessName}
                onChangeText={(t) => setEditForm(prev => ({ ...prev, businessName: t }))}
                placeholder="Enter business name"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
              />
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Full Name</Typography>
              <TextInput
                style={styles.textInput}
                value={editForm.name}
                onChangeText={(t) => setEditForm(prev => ({ ...prev, name: t }))}
                placeholder="Enter full name"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
              />
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Phone Number</Typography>
              <TextInput
                style={styles.textInput}
                value={editForm.phone}
                onChangeText={(t) => setEditForm(prev => ({ ...prev, phone: t }))}
                placeholder="Enter phone number"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Password</Typography>
              <TextInput
                style={styles.textInput}
                value={editForm.password}
                onChangeText={(t) => setEditForm(prev => ({ ...prev, password: t }))}
                placeholder="Leave blank to keep current"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                secureTextEntry
              />
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Confirm Password</Typography>
              <TextInput
                style={styles.textInput}
                value={editForm.confirmPassword}
                onChangeText={(t) => setEditForm(prev => ({ ...prev, confirmPassword: t }))}
                placeholder="Confirm new password"
                placeholderTextColor={UI_CONFIG.colors.textSecondary}
                secureTextEntry
              />
            </View>
            <View style={styles.row}>
              <Button 
                title="Cancel" 
                onPress={() => {
                  if (user) {
                    setEditForm({
                      businessName: user.businessName || '',
                      name: user.name || '',
                      phone: user.phone || '',
                      password: '',
                      confirmPassword: '',
                    });
                  }
                  setIsEditing(false);
                }} 
                variant="outline" 
                style={styles.rowButton} 
              />
              <Button title="Save" onPress={handleSaveProfile} variant="primary" style={styles.rowButton} />
            </View>
          </Card>
        )}

      </ScrollView>
      </KeyboardAvoidingView>
      <AdminMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        currentRoute="Profile"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: UI_CONFIG.spacing.lg,
    paddingVertical: UI_CONFIG.spacing.md,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  profileCard: {
    margin: 16,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI_CONFIG.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: UI_CONFIG.colors.textLight,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  userPhone: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
  },
  editCard: {
    marginHorizontal: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: UI_CONFIG.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: UI_CONFIG.colors.text,
    backgroundColor: UI_CONFIG.colors.surface,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default AdminProfileScreen;


