import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, InteractionManager } from 'react-native';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

export type OrderTab = 'available' | 'active' | 'completed';

interface Tab {
  key: OrderTab;
  label: string;
}

interface OrdersFilterProps {
  activeTab: OrderTab;
  onTabChange: (tab: OrderTab) => void;
}

const OrdersFilter: React.FC<OrdersFilterProps> = memo(({ activeTab, onTabChange }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const tabs: Tab[] = React.useMemo(() => [
    { key: 'available', label: 'Available' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Done' },
  ], []);

  const handleTabPress = useCallback((tab: OrderTab) => {
    onTabChange(tab);
  }, [onTabChange]);

  const tabGliderAnim = useRef(new Animated.Value(0)).current;
  const [tabOptionWidth, setTabOptionWidth] = useState(0);
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (tabOptionWidth > 0) {
      let tabIndex = 0;
      if (activeTab === 'available') tabIndex = 0;
      else if (activeTab === 'active') tabIndex = 1;
      else if (activeTab === 'completed') tabIndex = 2;

      const targetValue = tabIndex * tabOptionWidth;

      if (isInitialRender.current) {
        tabGliderAnim.setValue(targetValue);
        isInitialRender.current = false;
      } else {
        InteractionManager.runAfterInteractions(() => {
          Animated.spring(tabGliderAnim, {
            toValue: targetValue,
            useNativeDriver: true,
            tension: 120,
            friction: 8,
          }).start();
        });
      }
    }
  }, [activeTab, tabOptionWidth]);

  return (
    <View style={styles.tabContainer}>
      <View style={styles.glassRadioGroup}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.glassRadioOption}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.8}
            onLayout={(e) => {
              if (index === 0 && tabOptionWidth === 0) {
                const width = e.nativeEvent.layout.width;
                setTabOptionWidth(width);
              }
            }}
          >
            <Typography 
              variant="body" 
              style={[
                styles.glassRadioLabel,
                activeTab === tab.key && styles.glassRadioLabelActive
              ]}
            >
              {tab.label}
            </Typography>
          </TouchableOpacity>
        ))}
        {tabOptionWidth > 0 && (
          <Animated.View
            style={[
              styles.glassGlider,
              {
                width: tabOptionWidth,
                transform: [{
                  translateX: tabGliderAnim,
                }],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
});

OrdersFilter.displayName = 'OrdersFilter';

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    tabContainer: {
      paddingHorizontal: UI_CONFIG.spacing.lg,
      paddingVertical: UI_CONFIG.spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    glassRadioGroup: {
      position: 'relative',
      flexDirection: 'row',
      backgroundColor: colors.overlaySubtle,
      borderRadius: 16,
      overflow: 'hidden',
      alignSelf: 'center',
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 0,
    },
    glassRadioOption: {
      flex: 1,
      minWidth: 80,
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      paddingVertical: 12.8,
      paddingHorizontal: 25.6,
      zIndex: 2,
    },
    glassRadioLabel: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600',
      letterSpacing: 0.3,
      color: colors.textSecondary,
      textAlign: 'center',
      alignSelf: 'center',
    },
    glassRadioLabelActive: {
      color: colors.text,
    },
    glassGlider: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      borderRadius: 16,
      zIndex: 1,
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 10,
      height: '80%',
    },
  });
}

export default OrdersFilter;
