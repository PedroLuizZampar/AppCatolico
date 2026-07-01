import React, { useState } from 'react';
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

interface CalendarModalProps {
  visible: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
}) => {
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

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
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onSelectDate(newDate);
    onClose();
  };

  const handleQuickSelect = (date: Date) => {
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    onSelectDate(date);
    onClose();
  };

  const getNextSunday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday;
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextSunday = getNextSunday();

  const renderCalendarDays = () => {
    const days = [];

    // Espaços vazios antes do primeiro dia
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        day === selectedDate.getDate() &&
        currentMonth.getMonth() === selectedDate.getMonth() &&
        currentMonth.getFullYear() === selectedDate.getFullYear();

      const isToday =
        day === new Date().getDate() &&
        currentMonth.getMonth() === new Date().getMonth() &&
        currentMonth.getFullYear() === new Date().getFullYear();

      days.push(
        <Pressable
          key={day}
          style={[
            styles.calendarDay,
            isSelected && { backgroundColor: colors.primary, borderRadius: borderRadius.sm }
          ]}
          onPress={() => handleSelectDate(day)}
        >
          <Text
            style={[
              styles.calendarDayText,
              { color: isSelected ? '#fff' : colors.text },
              isToday && !isSelected && {
                color: colors.primary,
                fontWeight: 'bold',
                textDecorationLine: 'underline'
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
          {/* Atalhos Rápidos */}
          <View style={styles.quickSelectContainer}>
            <Pressable
              style={[styles.quickSelectButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
              onPress={() => handleQuickSelect(new Date())}
            >
              <Ionicons name="today" size={18} color={colors.primary} />
              <Text style={[styles.quickSelectText, { color: colors.primary }]}>Hoje</Text>
            </Pressable>
            <Pressable
              style={[styles.quickSelectButton, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              onPress={() => handleQuickSelect(tomorrow)}
            >
              <Ionicons name="sunny" size={18} color={colors.text} />
              <Text style={[styles.quickSelectText, { color: colors.text }]}>Amanhã</Text>
            </Pressable>
            <Pressable
              style={[styles.quickSelectButton, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              onPress={() => handleQuickSelect(nextSunday)}
            >
              <Ionicons name="medal" size={18} color={colors.text} />
              <Text style={[styles.quickSelectText, { color: colors.text }]}>Domingo</Text>
            </Pressable>
          </View>

          {/* Header do calendário */}
          <View style={styles.calendarHeader}>
            <Pressable onPress={handlePrevMonth} hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.calendarMonth, { color: colors.text }]}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable onPress={handleNextMonth} hitSlop={10}>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </Pressable>
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

          {/* Botão fechar */}
          <Pressable
            style={[styles.closeButton, { backgroundColor: colors.surfaceLight }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: colors.text }]}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickSelectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  quickSelectText: {
    ...typography.small,
    fontWeight: '600',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  calendarMonth: {
    ...typography.h3,
    fontWeight: 'bold',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  weekDay: {
    ...typography.small,
    fontWeight: '600',
    width: '14.28%',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
  },
  calendarDayText: {
    ...typography.body,
  },
  closeButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  closeButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
});
