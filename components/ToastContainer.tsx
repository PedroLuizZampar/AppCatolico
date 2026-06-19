import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { toastService } from '@/lib/toastService';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ToastContainer() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    return toastService.subscribe((msg, duration) => {
      setMessage(msg);
      setVisible(true);
      
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    });
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.toastWrapper,
        { top: insets.top > 0 ? insets.top + 10 : 30 }
      ]}
    >
      <View style={styles.toastContent}>
        <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={styles.icon} />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  icon: {
    marginRight: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
