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
import { copyToClipboard } from '@/lib/webShare';
import { toastService } from '@/lib/toastService';

export default function ForgotPasswordScreen() {
  const { apiUrl } = useAuth();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const router = useRouter();
  const { showAlert } = useAlert();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleRecoverPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      showAlert({
        title: 'Erro',
        message: 'Por favor, digite o seu e-mail.'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Este e-mail não está cadastrado no aplicativo.');
        }
        throw new Error(data.detail || 'Erro ao enviar solicitação.');
      }

      if (data && data.temp_password) {
        setTempPassword(data.temp_password);
      } else {
        throw new Error('Falha ao receber a nova senha do servidor.');
      }
    } catch (error: any) {
      showAlert({
        title: 'Erro',
        message: error.message || 'Erro ao solicitar recuperação de senha.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (tempPassword) {
      try {
        await copyToClipboard(tempPassword);
        setIsCopied(true);
        toastService.show('Senha copiada com sucesso!');
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('[Forgot Password] Erro ao copiar senha:', err);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Botão de Voltar */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back-outline" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons 
              name={tempPassword ? "shield-checkmark-outline" : "key-outline"} 
              size={40} 
              color={colors.primary} 
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {tempPassword ? 'Nova Senha Gerada' : 'Esqueceu a Senha?'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {tempPassword 
              ? 'Sua nova senha temporária foi criada com sucesso. Utilize o botão abaixo para copiá-la.' 
              : 'Digite o seu e-mail cadastrado para redefinir sua senha para uma nova combinação aleatória de 6 dígitos.'
            }
          </Text>
        </View>

        {!tempPassword ? (
          /* PASSO 1: Form para digitar e-mail */
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.text }]}>E-mail</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Digite seu e-mail cadastrado"
                placeholderTextColor={colors.textSecondary + '80'}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleRecoverPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Gerar Nova Senha</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* PASSO 2: Exibição da Senha Gerada com Botão de Copiar */
          <View style={styles.resultContainer}>
            <Text style={[styles.label, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>Nova Senha Temporária</Text>
            
            <View style={[styles.passwordBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.passwordText, { color: colors.primary }]}>{tempPassword}</Text>
              
              <TouchableOpacity 
                style={[styles.copyButton, { backgroundColor: colors.primary + '15' }]} 
                onPress={handleCopy}
              >
                <Ionicons 
                  name={isCopied ? "checkmark-outline" : "copy-outline"} 
                  size={20} 
                  color={colors.primary} 
                />
                <Text style={[styles.copyButtonText, { color: colors.primary }]}>
                  {isCopied ? 'Copiado!' : 'Copiar'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.primary, marginTop: spacing.xl }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Ir para o Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: typography.fontBold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fontRegular,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  resultContainer: {
    width: '100%',
    alignItems: 'stretch',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.fontSemiBold,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  button: {
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordBox: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  passwordText: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: typography.fontBold,
    letterSpacing: 4,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    gap: 6,
  },
  copyButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
});
