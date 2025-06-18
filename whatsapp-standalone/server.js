const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["*"],
    credentials: false
  }
});

// 🔥 CORS MÁXIMO - ACEITA TUDO
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["*"],
  credentials: false,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// 🔥 MIDDLEWARE CORS MANUAL PARA GARANTIR
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Max-Age', '86400');
  
  if (req.method === 'OPTIONS') {
    console.log('🔧 Requisição OPTIONS recebida de:', req.get('Origin'));
    return res.status(200).end();
  }
  
  console.log(`📡 ${req.method} ${req.url} de ${req.get('Origin') || 'unknown'}`);
  next();
});

let client;
let isClientReady = false;
let qrCodeString = null;

console.log('🚀 Iniciando servidor WhatsApp STANDALONE...');
console.log('🔥 CORS LIBERADO PARA TODOS OS DOMÍNIOS!');

// Inicializar cliente WhatsApp
const initializeWhatsApp = () => {
  console.log('📱 Configurando WhatsApp Web...');
  
  client = new Client({
    authStrategy: new LocalAuth({
      clientId: "whatsapp-standalone-session"
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

  // QR Code
  client.on('qr', (qr) => {
    console.log('📱 QR CODE GERADO!');
    console.log('Escaneie este QR Code com seu WhatsApp:');
    qrcode.generate(qr, { small: true });
    
    qrCodeString = qr;
    io.emit('qr', qr);
    
    console.log('🔥 QR CODE DISPONÍVEL PARA FRONTEND!');
    console.log('📏 Tamanho do QR:', qr.length, 'caracteres');
  });

  // WhatsApp conectado
  client.on('ready', async () => {
    console.log('✅ WhatsApp conectado com SUCESSO!');
    isClientReady = true;
    qrCodeString = null;
    
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

    // Carregar chats
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

  // Nova mensagem
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

  // Inicializar
  client.initialize();
};

// Rotas da API com logs detalhados
app.get('/api/whatsapp/status', (req, res) => {
  console.log('📊 Status solicitado via API de:', req.get('Origin') || 'unknown');
  const status = {
    isReady: isClientReady,
    hasQR: qrCodeString !== null,
    timestamp: new Date().toISOString(),
    server: 'standalone'
  };
  console.log('📊 Retornando status:', status);
  res.json(status);
});

app.get('/api/whatsapp/qr', (req, res) => {
  console.log('📱 QR Code solicitado via API de:', req.get('Origin') || 'unknown');
  if (qrCodeString) {
    console.log('✅ QR Code disponível, enviando... Tamanho:', qrCodeString.length);
    res.json({ 
      qr: qrCodeString,
      timestamp: new Date().toISOString(),
      length: qrCodeString.length
    });
  } else {
    console.log('❌ QR Code não disponível');
    res.status(404).json({ 
      error: 'QR Code não disponível',
      isReady: isClientReady,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/whatsapp/send', async (req, res) => {
  console.log('📤 Envio de mensagem solicitado de:', req.get('Origin') || 'unknown');
  
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
  console.log('💬 Chats solicitados de:', req.get('Origin') || 'unknown');
  
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

    console.log(`💬 Retornando ${chatList.length} chats`);
    res.json(chatList);
  } catch (error) {
    console.error('Erro ao buscar chats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/whatsapp/messages/:chatId', async (req, res) => {
  console.log('📨 Mensagens solicitadas de:', req.get('Origin') || 'unknown');
  
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

app.post('/api/whatsapp/restart', async (req, res) => {
  console.log('🔄 Restart solicitado de:', req.get('Origin') || 'unknown');
  
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

// Página inicial com mais informações
app.get('/', (req, res) => {
  console.log('🏠 Página inicial acessada de:', req.get('Origin') || 'unknown');
  
  res.send(`
    <html>
      <head>
        <title>WhatsApp Standalone Server</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .status { background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .debug { background: #e2e3e5; border: 1px solid #d6d8db; padding: 15px; border-radius: 5px; margin: 20px 0; font-family: monospace; }
        </style>
      </head>
      <body>
        <h1>🚀 WhatsApp Standalone Server</h1>
        
        <div class="success">
          <h3>✅ SERVIDOR WHATSAPP FUNCIONANDO!</h3>
          <p><strong>Servidor dedicado apenas para WhatsApp!</strong></p>
          <p><strong>CORS MÁXIMO LIBERADO!</strong></p>
        </div>
        
        <div class="status">
          <h3>📊 Status Atual</h3>
          <p><strong>WhatsApp:</strong> ${isClientReady ? '✅ Conectado' : '❌ Desconectado'}</p>
          <p><strong>QR Code:</strong> ${qrCodeString ? '✅ Disponível (' + qrCodeString.length + ' chars)' : '❌ Não disponível'}</p>
          <p><strong>Porta:</strong> 3001</p>
          <p><strong>CORS:</strong> ✅ Liberado para TODOS os domínios</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>

        <div class="debug">
          <h3>🔧 Debug Info</h3>
          <p><strong>Caminho:</strong> /home/ubuntu/cotacao/whatsapp-standalone/</p>
          <p><strong>Comando:</strong> npm start</p>
          <p><strong>Headers CORS:</strong> Access-Control-Allow-Origin: *</p>
          <p><strong>Methods:</strong> GET, POST, PUT, DELETE, OPTIONS</p>
        </div>

        <div>
          <h3>🌐 APIs Disponíveis</h3>
          <ul>
            <li><a href="/api/whatsapp/status">/api/whatsapp/status</a></li>
            <li><a href="/api/whatsapp/qr">/api/whatsapp/qr</a></li>
            <li><a href="/api/whatsapp/chats">/api/whatsapp/chats</a></li>
          </ul>
        </div>
        
        <div>
          <h3>🔥 Para Apresentação</h3>
          <p>1. Frontend conecta automaticamente</p>
          <p>2. QR Code aparece na tela</p>
          <p>3. Cliente escaneia com WhatsApp</p>
          <p>4. Sistema funciona 100% real!</p>
        </div>
      </body>
    </html>
  `);
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // Enviar status atual
  socket.emit('status', {
    isReady: isClientReady,
    hasQR: qrCodeString !== null,
    timestamp: new Date().toISOString()
  });

  if (qrCodeString) {
    console.log('📱 Enviando QR Code para cliente conectado');
    socket.emit('qr', qrCodeString);
  }

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Inicializar servidor
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor WhatsApp STANDALONE rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://146.59.227.248:${PORT}`);
  console.log(`📱 API: http://146.59.227.248:${PORT}/api/whatsapp/`);
  console.log('');
  console.log('🔥 SERVIDOR DEDICADO APENAS PARA WHATSAPP!');
  console.log('🔥 CORS MÁXIMO LIBERADO PARA TODOS OS DOMÍNIOS!');
  console.log('📁 Caminho: /home/ubuntu/cotacao/whatsapp-standalone/');
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