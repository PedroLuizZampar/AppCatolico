import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme/ThemeContext';
import { getColors, spacing, typography, borderRadius } from '@/lib/theme/tokens';

const { width } = Dimensions.get('window');

interface PlanoCalendarModalProps {
  visible: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}

export const PlanoCalendarModal: React.FC<PlanoCalendarModalProps> = ({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
}) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date(selectedDate));

  useEffect(() => {
    if (visible) {
      setCurrentMonth(new Date(selectedDate));
      setTempSelectedDate(new Date(selectedDate));
    }
  }, [visible, selectedDate]);

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayPress = (day: number) => {
    setTempSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  };

  const handleConfirm = () => {
    onSelectDate(tempSelectedDate);
    onClose();
  };

  const renderCalendarDays = () => {
    const days = [];

    // Espaços vazios antes do primeiro dia
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        day === tempSelectedDate.getDate() &&
        currentMonth.getMonth() === tempSelectedDate.getMonth() &&
        currentMonth.getFullYear() === tempSelectedDate.getFullYear();

      const isToday =
        day === new Date().getDate() &&
        currentMonth.getMonth() === new Date().getMonth() &&
        currentMonth.getFullYear() === new Date().getFullYear();

      days.push(
        <Pressable
          key={day}
          style={[
            styles.calendarDay,
            isSelected && { backgroundColor: '#FFFFFF', borderRadius: 20 }
          ]}
          onPress={() => handleDayPress(day)}
        >
          <Text
            style={[
              styles.calendarDayText,
              { color: isSelected ? '#000000' : colors.text },
              isToday && !isSelected && {
                color: colors.primary,
                fontWeight: 'bold',
              }
            ]}
          >
            {day}
          </Text>
        </Pressable>
      );
    }

    return days;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.calendarContainer, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header do calendário */}
          <View style={styles.calendarHeader}>
            <Text style={[styles.calendarMonth, { color: colors.text }]}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <View style={styles.navigationButtons}>
              <Pressable onPress={handlePrevMonth} hitSlop={10} style={styles.navButton}>
                <Ionicons name="chevron-back" size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={handleNextMonth} hitSlop={10} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Dias da semana */}
          <View style={styles.weekDaysContainer}>
            {weekDays.map((day) => (
              <Text key={day} style={[styles.weekDay, { color: colors.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Grid de dias */}
          <View style={styles.daysGrid}>
            {renderCalendarDays()}
          </View>

          {/* Botão Confirmar */}
          <Pressable
            style={[styles.confirmButton, { backgroundColor: '#FFFFFF' }]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirmar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    width: width * 0.9,
    maxWidth: 380,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  calendarMonth: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    padding: spacing.xs,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  weekDay: {
    width: (width * 0.9 - spacing.md * 2) / 7,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  calendarDay: {
    width: (width * 0.9 - spacing.md * 2 - 10) / 7,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  calendarDayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  confirmButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
