import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Typography from './Typography';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  text,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const indicatorColor = color ?? colors.accent;

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={indicatorColor} />
      {text && (
        <Typography variant="body" style={styles.text}>
          {text}
        </Typography>
      )}
    </View>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    text: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}

export default LoadingSpinner;
