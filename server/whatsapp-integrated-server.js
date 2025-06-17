const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Server } = require('socket.io');
const http = require('http');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Armazenar instâncias de clientes por usuário
const userInstances = new Map();
const userStatus = new Map();
const userQRCodes = new Map();

console.log('🚀 Iniciando servidor WhatsApp Integrado...');

// Gerar ID único para cada usuário
const generateUserId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Criar nova instância WhatsApp para um usuário
const createUserWhatsAppInstance = (userId) => {
  console.log(`📱 Criando instância WhatsApp para usuário: ${userId}`);
  
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `whatsapp-user-${userId}`,
      dataPath: `./whatsapp-sessions/${userId}`
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    }
  });

  // QR Code para este usuário específico
  client.on('qr', (qr) => {
    console.log(`📱 QR Code gerado para usuário ${userId}`);
    qrcode.generate(qr, { small: true });
    
    userQRCodes.set(userId, qr);
    userStatus.set(userId, { isReady: false, hasQR: true });
    
    // Emitir QR apenas para este usuário
    io.to(`user-${userId}`).emit('qr', qr);
  });

  // WhatsApp conectado para este usuário
  client.on('ready', async () => {
    console.log(`✅ WhatsApp conectado para usuário ${userId}!`);
    
    const info = client.info;
    userStatus.set(userId, { 
      isReady: true, 
      hasQR: false,
      user: {
        name: info.pushname,
        number: info.wid.user
      }
    });
    
    userQRCodes.delete(userId);
    
    io.to(`user-${userId}`).emit('ready', { 
      status: 'connected',
      user: {
        name: info.pushname,
        number: info.wid.user
      }
    });

    // Carregar chats para este usuário
    try {
      const chats = await client.getChats();
      console.log(`💬 ${chats.length} conversas carregadas para ${userId}`);
      
      const chatList = chats.slice(0, 20).map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        lastMessage: chat.lastMessage ? {
          body: chat.lastMessage.body,
          timestamp: chat.lastMessage.timestamp,
          fromMe: chat.lastMessage.fromMe
        } : null,
        unreadCount: chat.unreadCount
      }));

      io.to(`user-${userId}`).emit('chats', chatList);
    } catch (error) {
      console.error(`Erro ao carregar chats para ${userId}:`, error);
    }
  });

  // Eventos específicos do usuário
  client.on('authenticated', () => {
    console.log(`🔐 Usuário ${userId} autenticado!`);
    io.to(`user-${userId}`).emit('authenticated');
  });

  client.on('auth_failure', (msg) => {
    console.error(`❌ Falha na autenticação para ${userId}:`, msg);
    userStatus.set(userId, { isReady: false, hasQR: false, error: msg });
    io.to(`user-${userId}`).emit('auth_failure', { error: msg });
  });

  client.on('disconnected', (reason) => {
    console.log(`📱 Usuário ${userId} desconectado:`, reason);
    userStatus.set(userId, { isReady: false, hasQR: false });
    io.to(`user-${userId}`).emit('disconnected', { reason });
  });

  // Nova mensagem para este usuário
  client.on('message', async (message) => {
    console.log(`💬 Nova mensagem para ${userId} de ${message.from}: ${message.body}`);
    
    try {
      const contact = await message.getContact();
      const chat = await message.getChat();
      
      const messageData = {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp,
        fromMe: message.fromMe,
        hasMedia: message.hasMedia,
        type: message.type,
        contact: {
          name: contact.name || contact.pushname || contact.number,
          number: contact.number,
          profilePicUrl: await contact.getProfilePicUrl().catch(() => null)
        },
        chat: {
          name: chat.name,
          isGroup: chat.isGroup
        }
      };

      io.to(`user-${userId}`).emit('message', messageData);

      // Auto-resposta para cotações (opcional)
      if (message.body.toLowerCase().includes('cotação') || 
          message.body.toLowerCase().includes('cotacao') ||
          message.body.toLowerCase().includes('orçamento')) {
        
        setTimeout(async () => {
          try {
            await client.sendMessage(message.from, 
              '✅ *Cotação Recebida!*\n\n' +
              'Sua cotação foi recebida e está sendo processada pelo nosso sistema de análise.\n\n' +
              'Nossa equipe analisará sua proposta e entrará em contato em breve.\n\n' +
              'Obrigado! 🙏'
            );
            console.log(`📤 Auto-resposta enviada para ${userId}`);
          } catch (error) {
            console.error('Erro ao enviar auto-resposta:', error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  // Armazenar instância
  userInstances.set(userId, client);
  userStatus.set(userId, { isReady: false, hasQR: false });

  // Inicializar
  client.initialize();
  
  return client;
};

// API para criar/obter instância do usuário
app.post('/api/user/whatsapp/init', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }
  
  try {
    // Se já existe instância, retornar status
    if (userInstances.has(userId)) {
      const status = userStatus.get(userId) || { isReady: false, hasQR: false };
      return res.json({
        success: true,
        message: 'Instância já existe',
        status
      });
    }
    
    // Criar nova instância
    createUserWhatsAppInstance(userId);
    
    res.json({
      success: true,
      message: 'Instância WhatsApp criada com sucesso',
      userId
    });
    
    console.log(`🎉 Nova instância criada para usuário: ${userId}`);
  } catch (error) {
    console.error('Erro ao criar instância:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rotas da API específicas por usuário
app.get('/api/user/:userId/whatsapp/status', (req, res) => {
  const { userId } = req.params;
  const status = userStatus.get(userId) || { isReady: false, hasQR: false };
  res.json(status);
});

app.get('/api/user/:userId/whatsapp/qr', (req, res) => {
  const { userId } = req.params;
  const qr = userQRCodes.get(userId);
  
  if (qr) {
    res.json({ qr });
  } else {
    res.status(404).json({ error: 'QR Code não disponível' });
  }
});

app.post('/api/user/:userId/whatsapp/send', async (req, res) => {
  const { userId } = req.params;
  const client = userInstances.get(userId);
  const status = userStatus.get(userId);
  
  if (!client || !status?.isReady) {
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

  const { to, message } = req.body;

  try {
    const result = await client.sendMessage(to, message);
    console.log(`📤 Mensagem enviada para ${userId}: ${to} - ${message}`);
    
    res.json({ 
      success: true, 
      messageId: result.id._serialized,
      timestamp: result.timestamp 
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user/:userId/whatsapp/chats', async (req, res) => {
  const { userId } = req.params;
  const client = userInstances.get(userId);
  const status = userStatus.get(userId);
  
  if (!client || !status?.isReady) {
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

  try {
    const chats = await client.getChats();
    const chatList = chats.slice(0, 50).map(chat => ({
      id: chat.id._serialized,
      name: chat.name,
      isGroup: chat.isGroup,
      lastMessage: chat.lastMessage ? {
        body: chat.lastMessage.body,
        timestamp: chat.lastMessage.timestamp,
        fromMe: chat.lastMessage.fromMe
      } : null,
      unreadCount: chat.unreadCount
    }));

    res.json(chatList);
  } catch (error) {
    console.error('Erro ao buscar chats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/:userId/whatsapp/restart', async (req, res) => {
  const { userId } = req.params;
  const client = userInstances.get(userId);
  
  try {
    console.log(`🔄 Reiniciando WhatsApp para usuário ${userId}...`);
    
    if (client) {
      await client.destroy();
    }
    
    userInstances.delete(userId);
    userStatus.delete(userId);
    userQRCodes.delete(userId);
    
    setTimeout(() => {
      createUserWhatsAppInstance(userId);
    }, 2000);
    
    res.json({ success: true, message: 'WhatsApp reiniciado' });
  } catch (error) {
    console.error('Erro ao reiniciar WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO com namespaces por usuário
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // Cliente se junta ao room do seu usuário
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 Cliente ${socket.id} entrou no usuário ${userId}`);
    
    // Enviar status atual
    const status = userStatus.get(userId) || { isReady: false, hasQR: false };
    socket.emit('status', status);

    const qr = userQRCodes.get(userId);
    if (qr) {
      socket.emit('qr', qr);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Página inicial simples
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WhatsApp Integrado - Sistema de Análise</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>🚀 WhatsApp Integrado - Sistema de Análise</h1>
        
        <div class="success">
          <h3>✅ SISTEMA INTEGRADO FUNCIONANDO!</h3>
          <p><strong>Cada usuário tem seu WhatsApp próprio integrado na plataforma!</strong></p>
        </div>
        
        <div>
          <h3>📊 Como Funciona</h3>
          <ol>
            <li>Usuário faz login na plataforma</li>
            <li>Clica na aba "WhatsApp"</li>
            <li>QR Code aparece automaticamente</li>
            <li>Escaneia e conecta seu WhatsApp</li>
            <li>Tudo integrado na mesma interface!</li>
          </ol>
        </div>

        <div>
          <h3>🌐 Acesso</h3>
          <p><strong>Interface Principal:</strong> <a href="http://146.59.227.248:5173" target="_blank">http://146.59.227.248:5173</a></p>
        </div>
      </body>
    </html>
  `);
});

// Usar porta 3005 para evitar conflitos
const PORT = process.env.PORT || 3005;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor WhatsApp Integrado rodando na porta ${PORT}`);
  console.log(`🌐 Interface: http://146.59.227.248:5173`);
  console.log(`📱 API: http://146.59.227.248:${PORT}`);
  console.log('');
  console.log('🔥 SISTEMA WHATSAPP INTEGRADO PRONTO!');
  console.log('✅ PORTA 3005 - SEM CONFLITOS!');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor...');
  
  // Destruir todas as instâncias
  for (const [userId, client] of userInstances) {
    try {
      await client.destroy();
      console.log(`✅ Usuário ${userId} desconectado`);
    } catch (error) {
      console.error(`❌ Erro ao desconectar ${userId}:`, error);
    }
  }
  
  process.exit(0);
});