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
  const [rowWidth, setRowWidth] = useState(0);
  const isInitialRender = useRef(true);

  const segmentWidth = rowWidth > 0 ? rowWidth / tabs.length : 0;

  useEffect(() => {
    if (segmentWidth > 0) {
      let tabIndex = 0;
      if (activeTab === 'available') tabIndex = 0;
      else if (activeTab === 'active') tabIndex = 1;
      else if (activeTab === 'completed') tabIndex = 2;

      const targetValue = tabIndex * segmentWidth;

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
  }, [activeTab, segmentWidth]);

  return (
    <View style={styles.tabContainer}>
      <View
        style={styles.glassRadioGroup}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w !== rowWidth) {
            setRowWidth(w);
          }
        }}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.glassRadioOption}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.8}
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
        {segmentWidth > 0 && (
          <Animated.View
            style={[
              styles.glassGlider,
              {
                width: segmentWidth,
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
      borderRadius: 18,
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
      minWidth: 92,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      paddingHorizontal: UI_CONFIG.spacing.md,
      zIndex: 2,
    },
    glassRadioLabel: {
      fontSize: 15,
      lineHeight: 20,
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
      left: 0,
      top: 5,
      bottom: 5,
      borderRadius: 13,
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
    },
  });
}

export default OrdersFilter;
