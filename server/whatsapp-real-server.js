import express from 'express';
import cors from 'cors';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { Server } from 'socket.io';
import http from 'http';

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

let client;
let isClientReady = false;
let qrCodeString = null;

console.log('🚀 Iniciando servidor WhatsApp REAL...');

// Inicializar cliente WhatsApp REAL
const initializeWhatsApp = () => {
  console.log('📱 Configurando WhatsApp Web...');
  
  client = new Client({
    authStrategy: new LocalAuth({
      clientId: "whatsapp-real-session"
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

  // QR Code - REAL
  client.on('qr', (qr) => {
    console.log('📱 QR CODE GERADO!');
    console.log('Escaneie este QR Code com seu WhatsApp:');
    qrcode.generate(qr, { small: true });
    
    qrCodeString = qr;
    io.emit('qr', qr);
  });

  // WhatsApp conectado - REAL
  client.on('ready', async () => {
    console.log('✅ WhatsApp conectado com SUCESSO!');
    isClientReady = true;
    qrCodeString = null;
    
    // Buscar informações reais
    const info = client.info;
    console.log(`📱 Conectado como: ${info.pushname}`);
    console.log(`📞 Número: ${info.wid.user}`);
    
    io.emit('ready', { 
      status: 'connected',
      user: {
        name: info.pushname,
        number: info.wid.user
      }
    });

    // Carregar chats reais
    try {
      const chats = await client.getChats();
      console.log(`💬 ${chats.length} conversas carregadas`);
      
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

      io.emit('chats', chatList);
    } catch (error) {
      console.error('Erro ao carregar chats:', error);
    }
  });

  // Autenticado
  client.on('authenticated', () => {
    console.log('🔐 WhatsApp autenticado!');
    io.emit('authenticated');
  });

  // Erro de autenticação
  client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
    io.emit('auth_failure', { error: msg });
  });

  // Desconectado
  client.on('disconnected', (reason) => {
    console.log('📱 WhatsApp desconectado:', reason);
    isClientReady = false;
    qrCodeString = null;
    io.emit('disconnected', { reason });
  });

  // Nova mensagem REAL
  client.on('message', async (message) => {
    console.log(`💬 Nova mensagem de ${message.from}: ${message.body}`);
    
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

      // Processar mídia se houver
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          messageData.media = {
            mimetype: media.mimetype,
            data: media.data,
            filename: media.filename
          };
        } catch (error) {
          console.error('Erro ao baixar mídia:', error);
        }
      }

      io.emit('message', messageData);

      // Auto-resposta para cotações
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
            console.log('📤 Auto-resposta enviada');
          } catch (error) {
            console.error('Erro ao enviar auto-resposta:', error);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  // Mensagem enviada
  client.on('message_create', async (message) => {
    if (message.fromMe) {
      try {
        const contact = await message.getContact();
        
        const messageData = {
          id: message.id._serialized,
          from: message.from,
          to: message.to,
          body: message.body,
          timestamp: message.timestamp,
          fromMe: true,
          type: message.type,
          contact: {
            name: contact.name || contact.pushname || contact.number,
            number: contact.number
          }
        };
        
        io.emit('message_sent', messageData);
      } catch (error) {
        console.error('Erro ao processar mensagem enviada:', error);
      }
    }
  });

  // Inicializar
  client.initialize();
};

// Rotas da API
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    isReady: isClientReady,
    hasQR: qrCodeString !== null
  });
});

app.get('/api/whatsapp/qr', (req, res) => {
  if (qrCodeString) {
    res.json({ qr: qrCodeString });
  } else {
    res.status(404).json({ error: 'QR Code não disponível' });
  }
});

app.post('/api/whatsapp/send', async (req, res) => {
  if (!isClientReady) {
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

  const { to, message } = req.body;

  try {
    const result = await client.sendMessage(to, message);
    console.log(`📤 Mensagem enviada para ${to}: ${message}`);
    
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

app.get('/api/whatsapp/chats', async (req, res) => {
  if (!isClientReady) {
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

app.get('/api/whatsapp/messages/:chatId', async (req, res) => {
  if (!isClientReady) {
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

  const { chatId } = req.params;
  const { limit = 50 } = req.query;

  try {
    const chat = await client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: parseInt(limit) });
    
    const messageList = await Promise.all(messages.map(async (msg) => {
      try {
        const contact = await msg.getContact();
        return {
          id: msg.id._serialized,
          body: msg.body,
          timestamp: msg.timestamp,
          fromMe: msg.fromMe,
          hasMedia: msg.hasMedia,
          type: msg.type,
          contact: {
            name: contact.name || contact.pushname || contact.number,
            number: contact.number
          }
        };
      } catch (error) {
        return {
          id: msg.id._serialized,
          body: msg.body,
          timestamp: msg.timestamp,
          fromMe: msg.fromMe,
          hasMedia: msg.hasMedia,
          type: msg.type,
          contact: {
            name: 'Desconhecido',
            number: msg.from
          }
        };
      }
    }));

    res.json(messageList);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/whatsapp/contacts', async (req, res) => {
  if (!isClientReady) {
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

  try {
    const contacts = await client.getContacts();
    const contactList = await Promise.all(
      contacts.slice(0, 100).map(async (contact) => {
        try {
          return {
            id: contact.id._serialized,
            name: contact.name || contact.pushname || 'Sem nome',
            number: contact.number,
            isMyContact: contact.isMyContact,
            profilePicUrl: await contact.getProfilePicUrl().catch(() => null)
          };
        } catch (error) {
          return {
            id: contact.id._serialized,
            name: contact.name || contact.pushname || 'Sem nome',
            number: contact.number,
            isMyContact: contact.isMyContact,
            profilePicUrl: null
          };
        }
      })
    );

    res.json(contactList);
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/whatsapp/restart', async (req, res) => {
  try {
    console.log('🔄 Reiniciando WhatsApp...');
    
    if (client) {
      await client.destroy();
    }
    
    isClientReady = false;
    qrCodeString = null;
    
    setTimeout(() => {
      initializeWhatsApp();
    }, 2000);
    
    res.json({ success: true, message: 'WhatsApp reiniciado' });
  } catch (error) {
    console.error('Erro ao reiniciar WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // Enviar status atual
  socket.emit('status', {
    isReady: isClientReady,
    hasQR: qrCodeString !== null
  });

  if (qrCodeString) {
    socket.emit('qr', qrCodeString);
  }

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Inicializar servidor
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor WhatsApp REAL rodando na porta ${PORT}`);
  console.log(`🌐 Interface: http://146.59.227.248:5173`);
  console.log(`📱 API: http://146.59.227.248:${PORT}`);
  console.log('');
  console.log('🔥 PRONTO PARA CONECTAR SEU WHATSAPP REAL!');
  console.log('');
  
  // Inicializar WhatsApp
  initializeWhatsApp();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor...');
  if (client) {
    await client.destroy();
  }
  process.exit(0);
});