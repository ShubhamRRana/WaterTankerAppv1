import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Typography from './Typography';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

export interface MenuItem<T extends string> {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: T;
  onPress: () => void;
  /** Optional section label. Ungrouped items render standalone below grouped sections. */
  group?: string;
}

export interface MenuDrawerProps<T extends string> {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: T) => void;
  onLogout: () => void;
  currentRoute?: T;
  menuItems: MenuItem<T>[];
  /** Short text (e.g. initials) shown inside the header badge. */
  headerBadgeText?: string;
  /** Primary header title. Falls back to "Menu" when omitted. */
  headerTitle?: string;
  /** Secondary line under the header title. */
  headerSubtitle?: string;
}

const DRAWER_WIDTH = Math.min(300, Math.round(Dimensions.get('window').width * 0.82));
const ANIMATION_DURATION = 260;

const MenuDrawer = <T extends string>({
  visible,
  onClose,
  onNavigate: _onNavigate,
  onLogout,
  currentRoute,
  menuItems,
  headerBadgeText,
  headerTitle,
  headerSubtitle,
}: MenuDrawerProps<T>) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  // Keep the drawer mounted during the exit animation.
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const { groupedSections, standaloneItems } = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, MenuItem<T>[]>();
    const standalone: MenuItem<T>[] = [];

    menuItems.forEach((item) => {
      if (item.group) {
        if (!byGroup.has(item.group)) {
          byGroup.set(item.group, []);
          order.push(item.group);
        }
        byGroup.get(item.group)!.push(item);
      } else {
        standalone.push(item);
      }
    });

    return {
      groupedSections: order.map((group) => ({ group, items: byGroup.get(group)! })),
      standaloneItems: standalone,
    };
  }, [menuItems]);

  const title = headerTitle ?? 'Menu';
  const badgeText = (headerBadgeText ?? title).slice(0, 2).toUpperCase();

  const renderItem = (item: MenuItem<T>) => {
    const isActive = currentRoute === item.route;
    return (
      <TouchableOpacity
        key={String(item.route)}
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        onPress={item.onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: isActive }}
      >
        <View style={[styles.iconChip, isActive && styles.iconChipActive]}>
          <Ionicons
            name={isActive ? (item.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : item.icon}
            size={20}
            color={isActive ? colors.onAccent : colors.textSecondary}
          />
        </View>
        <Typography
          variant="body"
          style={[styles.menuItemText, isActive && styles.menuItemTextActive]}
        >
          {item.label}
        </Typography>
        {isActive && <View style={styles.activeDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.scrim, { opacity: progress }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
              <View style={styles.badge}>
                <View style={styles.badgeRing} />
                <Typography variant="h3" style={styles.badgeText}>
                  {badgeText}
                </Typography>
              </View>
              <View style={styles.headerTextGroup}>
                <Typography variant="h3" numberOfLines={1} style={styles.headerTitle}>
                  {title}
                </Typography>
                {headerSubtitle ? (
                  <Typography variant="caption" numberOfLines={1} style={styles.headerSubtitle}>
                    {headerSubtitle}
                  </Typography>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              {groupedSections.map((section) => (
                <View key={section.group} style={styles.section}>
                  <Typography variant="caption" style={styles.sectionLabel}>
                    {section.group.toUpperCase()}
                  </Typography>
                  {section.items.map(renderItem)}
                </View>
              ))}

              {standaloneItems.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionDivider} />
                  {standaloneItems.map(renderItem)}
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  Alert.alert(
                    'Logout',
                    'Are you sure you want to logout?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Logout',
                        style: 'destructive',
                        onPress: () => {
                          onLogout();
                          onClose();
                        },
                      },
                    ]
                  );
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Logout"
              >
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
                <Typography variant="body" style={styles.logoutText}>
                  Logout
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: 'row',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlayDark,
    },
    drawer: {
      width: DRAWER_WIDTH,
      height: '100%',
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 16,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    badge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeRing: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    badgeText: {
      fontFamily: 'PlayfairDisplay-Regular',
      fontSize: 18,
      fontWeight: '600',
      color: colors.accent,
    },
    headerTextGroup: {
      flex: 1,
      marginLeft: 14,
    },
    headerTitle: {
      fontFamily: 'PlayfairDisplay-Regular',
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    headerSubtitle: {
      marginTop: 2,
      color: colors.textSecondary,
    },
    closeButton: {
      padding: 4,
      marginLeft: 8,
    },
    body: {
      flex: 1,
      paddingTop: 16,
    },
    section: {
      marginBottom: 8,
    },
    sectionLabel: {
      paddingHorizontal: 20,
      marginBottom: 4,
      fontSize: 11,
      letterSpacing: 1.2,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 20,
      marginBottom: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 12,
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderRadius: 14,
    },
    menuItemActive: {
      backgroundColor: colors.surfaceLight,
    },
    iconChip: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconChipActive: {
      backgroundColor: colors.accent,
    },
    menuItemText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 14,
      fontWeight: '500',
    },
    menuItemTextActive: {
      color: colors.text,
      fontWeight: '600',
    },
    activeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.error,
    },
    logoutText: {
      fontSize: 16,
      color: colors.error,
      fontWeight: '600',
    },
  });
}

export default MenuDrawer;
