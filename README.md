# AppCatolico

Bem-vindo ao **AppCatolico**, uma aplicação móvel completa desenvolvida para auxiliar na vida espiritual diária. Este aplicativo oferece acesso fácil e intuitivo à Bíblia Sagrada, livros espirituais clássicos, liturgia diária e meditações, tudo em uma interface moderna e personalizável.

## 📱 Funcionalidades

### 📚 Biblioteca Espiritual
- **Livros de São Josemaria Escrivá:** Acesso completo às obras "Caminho", "Sulco" e "Forja".
- **Leitura Interativa:** Navegação por capítulos, seleção de parágrafos e compartilhamento.

### 📖 Bíblia Sagrada
- **Versão Ave Maria:** Texto completo da Bíblia Sagrada.
- **Navegação Intuitiva:** Seleção rápida de livros e capítulos.
- **Ferramentas de Leitura:** Destaque de versículos, cópia e compartilhamento.

### 📅 Liturgia e Meditação
- **Liturgia Diária:** Acompanhe as leituras da missa do dia.
- **Meditação Diária:** Reflexões para auxiliar na oração pessoal.

### ⭐ Favoritos e Personalização
- **Sistema de Favoritos:** Salve seus versículos e parágrafos preferidos.
- **Deep Linking:** Ao clicar em um favorito, o app abre diretamente no livro e capítulo correspondente, rolando automaticamente para o trecho e destacando-o.
- **Busca Global:** Encontre rapidamente trechos na Bíblia e nos livros.
- **Temas:** Suporte a modo Claro e Escuro (Dark Mode).
- **Acessibilidade:** Ajuste de tamanho da fonte para melhor leitura.

### 🛠️ Recursos Técnicos Avançados
- **Menu de Ações Arrastável:** Menu flutuante interativo para ações rápidas (copiar, compartilhar, favoritar) que pode ser movido livremente pela tela.
- **Animações Fluidas:** Uso de `react-native-reanimated` para transições suaves e feedback visual.
- **Gestos:** Integração com `react-native-gesture-handler` para interações naturais.

## 🚀 Tecnologias Utilizadas

Este projeto foi construído com as tecnologias mais modernas do ecossistema React Native:

- **Framework:** [Expo](https://expo.dev) (SDK 52)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Roteamento:** [Expo Router](https://docs.expo.dev/router/introduction) (File-based routing)
- **UI/UX:**
  - `react-native-reanimated` (Animações)
  - `react-native-gesture-handler` (Gestos)
  - `react-native-safe-area-context`
  - `@expo/vector-icons`
- **Armazenamento Local:** `AsyncStorage` (para persistência de favoritos e configurações)

## 📂 Estrutura do Projeto

```
AppCatolico/
├── app/                    # Rotas e Telas (Expo Router)
│   ├── (tabs)/             # Navegação principal (Abas: Livros, Bíblia, Liturgia, Config)
│   ├── biblia/             # Rotas dinâmicas da Bíblia
│   ├── livro/              # Rotas dinâmicas dos Livros
│   ├── _layout.tsx         # Layout raiz e providers
│   └── ...
├── components/             # Componentes Reutilizáveis
│   ├── ui/                 # Componentes de interface básicos
│   ├── BookCard.tsx        # Card de exibição de livros
│   ├── ChapterCard.tsx     # Card de seleção de capítulos
│   └── ...
├── constants/              # Constantes globais (Cores, Temas)
├── data/                   # Dados estáticos (JSONs da Bíblia e Livros)
├── hooks/                  # Custom Hooks (useTheme, useFavoritesSync, etc.)
├── lib/                    # Lógica de negócios e utilitários
│   ├── theme/              # Contexto e tokens de tema
│   ├── sync/               # Serviços de sincronização
│   └── ...
└── assets/                 # Imagens e ícones
```

## 🏁 Como Rodar o Projeto

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npx expo start
   ```

3. **Execute no dispositivo:**
   - Use o aplicativo **Expo Go** no seu celular (Android ou iOS) para escanear o QR Code.
   - Ou pressione `a` para abrir no emulador Android, ou `i` para o simulador iOS.

## 🔮 Próximas Implementações (Roadmap)

Para continuar evoluindo o AppCatolico, sugerimos as seguintes funcionalidades:

1.  **Áudio e Text-to-Speech:**
    -   Implementar leitura em voz alta dos capítulos e meditações para acessibilidade e uso em trânsito.

2.  **Notas Pessoais:**
    -   Permitir que o usuário adicione anotações pessoais em versículos ou parágrafos específicos.

3.  **Notificações Push:**
    -   Lembretes diários para a Liturgia e Meditação.
    -   Versículo do dia.

4.  **Sincronização em Nuvem:**
    -   Criar sistema de contas de usuário para salvar favoritos e notas na nuvem, permitindo acesso em múltiplos dispositivos.

5.  **Planos de Leitura:**
    -   Criar planos de leitura bíblica (ex: Bíblia em um ano).

6.  **Expansão da Biblioteca:**
    -   Adicionar mais clássicos da espiritualidade e documentos da Igreja.

7.  **Melhorias na Busca:**
    -   Implementar filtros avançados e histórico de busca.

---

Desenvolvido com ❤️ para a evangelização digital.
