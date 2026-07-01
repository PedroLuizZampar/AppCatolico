import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getActiveUser, saveLocalUser, clearActiveUser, LocalDbUser, seedDefaultActivities } from '../sqlite/sqliteDatabase';
import { migrationService } from '../sync/MigrationService';
import { syncEngine } from '../sync/SyncEngine';

interface AuthContextType {
  user: LocalDbUser | null;
  loading: boolean;
  avatarUpdatedAt: number;
  login: (email: string, password: string) => Promise<void>;
  register: (nome: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => Promise<void>;
  apiUrl: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_API_URL = 'https://api-sanctus.onrender.com';
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalDbUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [avatarUpdatedAt, setAvatarUpdatedAt] = useState<number>(Date.now());

  // Carregar usuário ativo ao inicializar o app
  useEffect(() => {
    async function loadActiveSession() {
      try {
        // Garantir que as tabelas SQLite locais foram inicializadas antes de carregar o usuário
        const { initializeDatabase } = await import('../sqlite/sqliteDatabase');
        await initializeDatabase();

        const activeUser = await getActiveUser();
        if (activeUser) {
          setUser(activeUser);
          console.log('[AuthContext] Sessão ativa carregada para:', activeUser.email);
          // Sincronizar dados em background ao carregar sessão ativa
          syncEngine.sync().catch(err => console.error('[AuthContext] Erro ao sincronizar na inicialização:', err));
        }
      } catch (error) {
        console.error('[AuthContext] Erro ao carregar sessão ativa:', error);
      } finally {
        setLoading(false);
      }
    }
    loadActiveSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao realizar login.');
      }

      const loggedUser = {
        id: data.user.id,
        nome: data.user.nome,
        email: data.user.email,
        token: data.token,
        avatar_url: data.user.avatar_url,
      };

      // Salvar no SQLite local
      await saveLocalUser(loggedUser);

      // Migrar dados antigos se houver
      await migrationService.migrateLegacyDataIfNeeded(loggedUser.id);

      setUser({
        ...loggedUser,
        last_sync_timestamp: 0,
      });
      setAvatarUpdatedAt(Date.now());

      // Disparar sincronização pós-login em background
      syncEngine.sync().catch(err => console.error('[AuthContext] Erro ao sincronizar pós-login:', err));

      console.log('[AuthContext] Login efetuado com sucesso:', loggedUser.email);
    } catch (error) {
      console.error('[AuthContext] Erro no login:', error);
      throw error;
    }
  };

  const register = async (nome: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao realizar cadastro.');
      }

      const registeredUser = {
        id: data.user.id,
        nome: data.user.nome,
        email: data.user.email,
        token: data.token,
        avatar_url: data.user.avatar_url,
      };

      // Salvar no SQLite local
      await saveLocalUser(registeredUser);

      // Migrar dados antigos se houver
      await migrationService.migrateLegacyDataIfNeeded(registeredUser.id);

      setUser({
        ...registeredUser,
        last_sync_timestamp: 0,
      });
      setAvatarUpdatedAt(Date.now());

      // Disparar sincronização pós-cadastro em background
      syncEngine.sync().catch(err => console.error('[AuthContext] Erro ao sincronizar pós-cadastro:', err));

      console.log('[AuthContext] Cadastro efetuado com sucesso:', registeredUser.email);
    } catch (error) {
      console.error('[AuthContext] Erro no registro:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Limpa dados locais da conta ativa do SQLite
      await clearActiveUser();
      setUser(null);
      console.log('[AuthContext] Logout efetuado com sucesso.');
    } catch (error) {
      console.error('[AuthContext] Erro no logout:', error);
      throw error;
    }
  };

  const updateUserEmail = async (newEmail: string) => {
    if (!user) return;
    const updated = {
      id: user.id,
      nome: user.nome,
      email: newEmail,
      token: user.token,
      avatar_url: user.avatar_url,
    };
    await saveLocalUser(updated);
    setUser({
      ...user,
      email: newEmail
    });
  };

  const updateUserAvatar = async (avatarUrl: string) => {
    if (!user) return;
    const updated = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      token: user.token,
      avatar_url: avatarUrl,
    };
    await saveLocalUser(updated);
    setUser({
      ...user,
      avatar_url: avatarUrl
    });
    setAvatarUpdatedAt(Date.now());
  };

  return (
    <AuthContext.Provider value={{ user, loading, avatarUpdatedAt, login, register, logout, updateUserEmail, updateUserAvatar, apiUrl: API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
