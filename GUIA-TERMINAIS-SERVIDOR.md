# 🖥️ Guia Completo - Configuração dos Terminais no Servidor

## 📍 **IMPORTANTE: Ambos os terminais devem estar no SERVIDOR!**

### 🔧 **Passo a Passo Completo:**

#### **1️⃣ Terminal 1 - Servidor SaaS (JÁ RODANDO)**
```bash
# Este você já tem rodando
npm run whatsapp-saas
```

#### **2️⃣ Terminal 2 - Frontend (NOVO TERMINAL NO SERVIDOR)**

**Opção A - SSH Novo:**
```bash
# Abra uma NOVA conexão SSH para o servidor
ssh usuario@146.59.227.248

# Navegue para a pasta do projeto
cd /caminho/para/seu/projeto

# Execute o frontend
npm run dev
```

**Opção B - Screen/Tmux (RECOMENDADO):**
```bash
# No servidor, use screen para criar nova sessão
screen -S frontend

# Execute o frontend
npm run dev

# Para sair sem parar: Ctrl+A, depois D
# Para voltar: screen -r frontend
```

**Opção C - Nohup (Background):**
```bash
# Execute em background
nohup npm run dev > frontend.log 2>&1 &
```

### 🚀 **Script Automático (MAIS FÁCIL):**

Execute este script que criei para automatizar tudo:

```bash
# Dar permissão
chmod +x start-saas-production.sh

# Executar
./start-saas-production.sh
```

### 📊 **Verificar se está funcionando:**

```bash
# Verificar processos rodando
ps aux | grep node

# Verificar portas abertas
netstat -tlnp | grep :3001
netstat -tlnp | grep :5173
```

### 🌐 **URLs Finais:**

- **Painel Admin**: http://146.59.227.248:3001
- **Interface Cliente**: http://146.59.227.248:5173

### 💡 **Dicas Importantes:**

1. **Ambos os terminais** devem estar **no servidor**
2. **Mesma pasta** do projeto
3. **Não feche** os terminais
4. Use **screen** ou **tmux** para manter rodando mesmo se desconectar

### 🛑 **Para Parar Tudo:**
```bash
# Use o script de parada
./stop-saas-production.sh

# Ou manualmente
pkill -f "npm run"
```

## ✅ **Resumo:**
- Terminal 1: `npm run whatsapp-saas` (servidor)
- Terminal 2: `npm run dev` (frontend) - **NOVO TERMINAL NO SERVIDOR**
- Ambos na **mesma pasta** do projeto
- Ambos **no servidor**, não no seu computador local!