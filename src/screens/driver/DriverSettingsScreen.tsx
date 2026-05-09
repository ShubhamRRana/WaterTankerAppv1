import React, { useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography } from '../../components/common';
import AppearanceSettingsSection from '../../components/settings/AppearanceSettingsSection';
import { UI_CONFIG } from '../../constants/config';
import { DriverStackParamList } from '../../navigation/DriverNavigator';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

export type DriverSettingsScreenNav = StackNavigationProp<
  DriverStackParamList,
  'Settings'
>;

interface Props {
  navigation: DriverSettingsScreenNav;
}

const DriverSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Typography variant="h3" style={styles.headerTitle}>
          Settings
        </Typography>
        <View style={styles.headerPlaceholder} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppearanceSettingsSection />
      </ScrollView>
    </SafeAreaView>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: UI_CONFIG.spacing.sm,
      paddingVertical: UI_CONFIG.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: UI_CONFIG.spacing.sm,
      width: 48,
      alignItems: 'flex-start',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: colors.text,
    },
    headerPlaceholder: {
      width: 48,
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: UI_CONFIG.spacing.md,
      paddingVertical: UI_CONFIG.spacing.lg,
    },
  });
}

export default DriverSettingsScreen;
