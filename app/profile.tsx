import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator
} from 'react-native';
import { useAuth } from '@/lib/context/AuthContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAlert } from '@/lib/context/AlertContext';
import { getColors, spacing, typography, borderRadius } from '@/lib/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout, updateUserEmail, apiUrl } = useAuth();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const router = useRouter();
  const { showAlert } = useAlert();

  // Estados do formulário de email
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Estados do formulário de senha
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.infoText, { color: colors.text }]}>Você precisa estar logado para acessar esta página.</Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary, marginTop: 16 }]}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.buttonText}>Ir para o Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Função para mudar o e-mail
  const handleUpdateEmail = async () => {
    const trimmedEmail = newEmail.trim().lower();
    if (!trimmedEmail) {
      showAlert({ title: 'Erro', message: 'Por favor, digite o novo e-mail.' });
      return;
    }
    if (trimmedEmail === user.email.toLowerCase()) {
      showAlert({ title: 'Aviso', message: 'O e-mail digitado é igual ao e-mail atual.' });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/user/update-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ new_email: trimmedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao atualizar e-mail.');
      }

      await updateUserEmail(trimmedEmail);
      showAlert({ title: 'Sucesso', message: 'E-mail atualizado com sucesso!' });
      setNewEmail('');
      setShowEmailForm(false);
    } catch (error: any) {
      showAlert({ title: 'Erro', message: error.message || 'Ocorreu um erro ao atualizar o e-mail.' });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Função para mudar a senha
  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert({ title: 'Erro', message: 'Por favor, preencha todos os campos de senha.' });
      return;
    }
    if (newPassword.length < 6) {
      showAlert({ title: 'Erro', message: 'A nova senha deve possuir no mínimo 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert({ title: 'Erro', message: 'A nova senha e a confirmação não coincidem.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/user/update-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao atualizar senha.');
      }

      showAlert({ title: 'Sucesso', message: 'Senha atualizada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error: any) {
      showAlert({ title: 'Erro', message: error.message || 'Ocorreu um erro ao atualizar a senha.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };



  // Confirmar logout
  const handleLogoutPress = () => {
    showAlert({
      title: 'Sair da Conta',
      message: 'Tem certeza que deseja sair? Os seus dados locais continuarão salvos online, mas você precisará fazer login novamente para acessá-los.',
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    });
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Card do Usuário */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{getInitials(user.nome)}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user.nome}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
        </View>

        {/* Opção: Alterar E-mail */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity 
            style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowEmailForm(!showEmailForm)}
          >
            <View style={styles.row}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.icon} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Alterar E-mail</Text>
            </View>
            <Ionicons 
              name={showEmailForm ? 'chevron-up-outline' : 'chevron-down-outline'} 
              size={18} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          {showEmailForm && (
            <View style={[styles.formBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Novo E-mail</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background, 
                  borderColor: colors.border, 
                  color: colors.text 
                }]}
                placeholder="exemplo@email.com"
                placeholderTextColor={colors.textSecondary + '80'}
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleUpdateEmail}
                disabled={isUpdatingEmail}
              >
                {isUpdatingEmail ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Salvar E-mail</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Opção: Alterar Senha */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity 
            style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowPasswordForm(!showPasswordForm)}
          >
            <View style={styles.row}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.icon} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Alterar Senha</Text>
            </View>
            <Ionicons 
              name={showPasswordForm ? 'chevron-up-outline' : 'chevron-down-outline'} 
              size={18} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          {showPasswordForm && (
            <View style={[styles.formBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Senha Atual</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background, 
                  borderColor: colors.border, 
                  color: colors.text 
                }]}
                placeholder="Digite a senha atual"
                placeholderTextColor={colors.textSecondary + '80'}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Nova Senha</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background, 
                  borderColor: colors.border, 
                  color: colors.text 
                }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textSecondary + '80'}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Confirmar Nova Senha</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background, 
                  borderColor: colors.border, 
                  color: colors.text 
                }]}
                placeholder="Confirme a nova senha"
                placeholderTextColor={colors.textSecondary + '80'}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleUpdatePassword}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Salvar Senha</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Botão Sair da Conta */}
        <TouchableOpacity 
          style={[styles.logoutButton, { borderColor: '#E53935' }]} 
          onPress={handleLogoutPress}
        >
          <Ionicons name="log-out-outline" size={20} color="#E53935" />
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  infoText: {
    fontFamily: typography.fontRegular,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  userCard: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: typography.fontBold,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: typography.fontRegular,
  },
  sectionContainer: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: typography.fontSemiBold,
  },
  formBody: {
    borderWidth: 1,
    borderTopWidth: 0,
    padding: spacing.md,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    fontFamily: typography.fontMedium,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    fontSize: 15,
  },
  submitButton: {
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    marginTop: spacing.sm,
    backgroundColor: '#E53935',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
