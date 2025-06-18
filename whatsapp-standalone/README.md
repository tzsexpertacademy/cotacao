# 📱 WhatsApp Standalone Server

## 🎯 Servidor Dedicado Apenas para WhatsApp

Este é um servidor **minimalista** que roda **apenas** o WhatsApp, sem toda a complexidade do projeto principal.

## 🚀 Como Usar

### 1. No Servidor (onde você está):

```bash
# Navegar para a pasta standalone
cd whatsapp-standalone

# Instalar dependências
npm install

# Iniciar servidor
npm start
```

### 2. URLs de Acesso:

- **Painel**: http://146.59.227.248:3001
- **API Status**: http://146.59.227.248:3001/api/whatsapp/status
- **API QR Code**: http://146.59.227.248:3001/api/whatsapp/qr

## ✅ Vantagens desta Abordagem:

1. **Servidor Limpo**: Apenas WhatsApp, sem outras dependências
2. **Menos Conflitos**: Sem interferência de outros componentes
3. **Mais Estável**: Foco único no WhatsApp
4. **Fácil Debug**: Logs claros e diretos
5. **Menor Uso de Recursos**: Apenas o necessário

## 🔧 Arquivos Incluídos:

- `server.js` - Servidor WhatsApp completo
- `package.json` - Dependências mínimas
- `README.md` - Este guia

## 📊 APIs Disponíveis:

- `GET /api/whatsapp/status` - Status da conexão
- `GET /api/whatsapp/qr` - QR Code para conectar
- `GET /api/whatsapp/chats` - Lista de conversas
- `POST /api/whatsapp/send` - Enviar mensagem
- `POST /api/whatsapp/restart` - Reiniciar WhatsApp

## 🎯 Resultado Esperado:

Depois de rodar `npm start`, você deve ver:
- QR Code no terminal
- Servidor rodando na porta 3001
- APIs funcionando
- Frontend conseguindo conectar

## 🔥 Próximos Passos:

1. Suba apenas esta pasta no servidor
2. Execute `npm install && npm start`
3. Teste no frontend se conecta
4. Se funcionar, você pode excluir o projeto grande