import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Image,
  TextInput,
  Modal,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Button, Card, LoadingSpinner } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../types';

const { width } = Dimensions.get('window');

const ProfileScreen: React.FC = () => {
  const { user, updateUser, logout, isLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const updates: Partial<User> = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
      };

      await updateUser(updates);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setEditForm({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: handleLogout },
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date | string) => {
    try {
      // Handle both Date objects and date strings
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Unknown date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
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
        <View style={styles.errorContainer}>
          <Typography variant="h3" style={styles.errorTitle}>
            Profile Not Found
          </Typography>
          <Typography variant="body" style={styles.errorText}>
            Unable to load your profile. Please try logging in again.
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {user.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Typography variant="h3" style={styles.avatarText}>
                    {getInitials(user.name)}
                  </Typography>
                </View>
              )}
            </View>
            
            <View style={styles.profileInfo}>
              <Typography variant="h3" style={styles.userName}>
                {user.name}
              </Typography>
              <Typography variant="body" style={styles.userPhone}>
                {user.phone}
              </Typography>
              <Typography variant="caption" style={styles.memberSince}>
                Member since {formatDate(user.createdAt)}
              </Typography>
            </View>
          </View>

          <View style={styles.editButtonContainer}>
            <Button
              title={isEditing ? "Cancel" : "Edit Profile"}
              onPress={isEditing ? handleCancelEdit : handleEditProfile}
              variant={isEditing ? "outline" : "primary"}
              style={styles.editButton}
            />
            {isEditing && (
              <Button
                title="Save"
                onPress={handleSaveProfile}
                variant="primary"
                style={styles.saveButton}
              />
            )}
          </View>
        </Card>

        {/* Edit Profile Form */}
        {isEditing && (
          <Card style={styles.editCard}>
            <Typography variant="h3" style={styles.editTitle}>
              Edit Profile Information
            </Typography>
            
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>
                Full Name
              </Typography>
              <TextInput
                style={styles.textInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                placeholder="Enter your full name"
                placeholderTextColor="#8E8E93"
              />
            </View>

            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>
                Phone Number
              </Typography>
              <TextInput
                style={styles.textInput}
                value={editForm.phone}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                placeholder="Enter your phone number"
                placeholderTextColor="#8E8E93"
                keyboardType="phone-pad"
              />
            </View>
          </Card>
        )}

        {/* Account Statistics */}
        <Card style={styles.statsCard}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Account Statistics
          </Typography>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Typography variant="h2" style={styles.statNumber}>
                0
              </Typography>
              <Typography variant="body" style={styles.statLabel}>
                Total Orders
              </Typography>
            </View>
            
            <View style={styles.statItem}>
              <Typography variant="h2" style={styles.statNumber}>
                0
              </Typography>
              <Typography variant="body" style={styles.statLabel}>
                Completed Orders
              </Typography>
            </View>
            
            <View style={styles.statItem}>
              <Typography variant="h2" style={styles.statNumber}>
                0
              </Typography>
              <Typography variant="body" style={styles.statLabel}>
                Saved Addresses
              </Typography>
            </View>
          </View>
        </Card>

        {/* Settings */}
        <Card style={styles.settingsCard}>
          <Typography variant="h3" style={styles.sectionTitle}>
            Settings
          </Typography>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Typography variant="body" style={styles.settingTitle}>
                Notification Preferences
              </Typography>
              <Typography variant="caption" style={styles.settingSubtitle}>
                Manage your notification settings
              </Typography>
            </View>
            <Typography variant="body" style={styles.settingArrow}>
              ›
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Typography variant="body" style={styles.settingTitle}>
                Privacy Settings
              </Typography>
              <Typography variant="caption" style={styles.settingSubtitle}>
                Control your privacy and data
              </Typography>
            </View>
            <Typography variant="body" style={styles.settingArrow}>
              ›
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Typography variant="body" style={styles.settingTitle}>
                Help & Support
              </Typography>
              <Typography variant="caption" style={styles.settingSubtitle}>
                Get help and contact support
              </Typography>
            </View>
            <Typography variant="body" style={styles.settingArrow}>
              ›
            </Typography>
          </TouchableOpacity>
        </Card>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Logout"
            onPress={confirmLogout}
            variant="outline"
            style={styles.logoutButton}
          />
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  profileCard: {
    margin: 16,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#8E8E93',
  },
  editButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
  editCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  disabledInput: {
    backgroundColor: '#F2F2F7',
    color: '#8E8E93',
  },
  disabledNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  settingsCard: {
    margin: 16,
    marginTop: 0,
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  settingArrow: {
    fontSize: 20,
    color: '#8E8E93',
    fontWeight: 'bold',
  },
  logoutContainer: {
    margin: 16,
    marginTop: 0,
  },
  logoutButton: {
    borderColor: '#FF3B30',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default ProfileScreen;
