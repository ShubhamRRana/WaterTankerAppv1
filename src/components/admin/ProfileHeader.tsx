import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import { AdminUser } from '../../types';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

interface ProfileHeaderProps {
  user: AdminUser;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayName = user.businessName || user.name || 'Agency';

  return (
    <View style={styles.container}>
      <Typography variant="h2" style={styles.businessName}>
        {displayName}
      </Typography>

      {user.name && user.businessName ? (
        <Typography variant="caption" style={styles.ownerName}>
          {user.name}
        </Typography>
      ) : null}

      <View style={styles.contactList}>
        {user.email ? (
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
            <Typography variant="body" style={styles.contactText}>
              {user.email}
            </Typography>
          </View>
        ) : null}
        {user.phone ? (
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
            <Typography variant="body" style={styles.contactText}>
              {user.phone}
            </Typography>
          </View>
        ) : null}
      </View>
    </View>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingTop: 4,
      paddingBottom: 4,
    },
    businessName: {
      fontFamily: 'PlayfairDisplay-Regular',
      fontSize: 24,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    ownerName: {
      color: colors.textSecondary,
      marginBottom: 12,
    },
    contactList: {
      width: '100%',
      gap: 8,
      marginTop: 4,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    contactText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
}

export default ProfileHeader;
