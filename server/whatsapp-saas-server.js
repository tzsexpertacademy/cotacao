import express from 'express';
import cors from 'cors';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { Server } from 'socket.io';
import http from 'http';
import crypto from 'crypto';

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

// Armazenar instâncias de clientes por tenant
const clientInstances = new Map();
const clientStatus = new Map();
const qrCodes = new Map();

console.log('🚀 Iniciando servidor WhatsApp SaaS Multi-Tenant...');

// Gerar ID único para cada cliente
const generateTenantId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Criar nova instância WhatsApp para um cliente
const createWhatsAppInstance = (tenantId) => {
  console.log(`📱 Criando instância WhatsApp para cliente: ${tenantId}`);
  
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `whatsapp-saas-${tenantId}`,
      dataPath: `./whatsapp-sessions/${tenantId}`
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

  // QR Code para este cliente específico
  client.on('qr', (qr) => {
    console.log(`📱 QR Code gerado para cliente ${tenantId}`);
    qrcode.generate(qr, { small: true });
    
    qrCodes.set(tenantId, qr);
    clientStatus.set(tenantId, { isReady: false, hasQR: true });
    
    // Emitir QR apenas para este cliente
    io.to(`tenant-${tenantId}`).emit('qr', qr);
  });

  // WhatsApp conectado para este cliente
  client.on('ready', async () => {
    console.log(`✅ WhatsApp conectado para cliente ${tenantId}!`);
    
    const info = client.info;
    clientStatus.set(tenantId, { 
      isReady: true, 
      hasQR: false,
      user: {
        name: info.pushname,
        number: info.wid.user
      }
    });
    
    qrCodes.delete(tenantId);
    
    io.to(`tenant-${tenantId}`).emit('ready', { 
      status: 'connected',
      user: {
        name: info.pushname,
        number: info.wid.user
      }
    });

    // Carregar chats para este cliente
    try {
      const chats = await client.getChats();
      console.log(`💬 ${chats.length} conversas carregadas para ${tenantId}`);
      
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

      io.to(`tenant-${tenantId}`).emit('chats', chatList);
    } catch (error) {
      console.error(`Erro ao carregar chats para ${tenantId}:`, error);
    }
  });

  // Eventos específicos do cliente
  client.on('authenticated', () => {
    console.log(`🔐 Cliente ${tenantId} autenticado!`);
    io.to(`tenant-${tenantId}`).emit('authenticated');
  });

  client.on('auth_failure', (msg) => {
    console.error(`❌ Falha na autenticação para ${tenantId}:`, msg);
    clientStatus.set(tenantId, { isReady: false, hasQR: false, error: msg });
    io.to(`tenant-${tenantId}`).emit('auth_failure', { error: msg });
  });

  client.on('disconnected', (reason) => {
    console.log(`📱 Cliente ${tenantId} desconectado:`, reason);
    clientStatus.set(tenantId, { isReady: false, hasQR: false });
    io.to(`tenant-${tenantId}`).emit('disconnected', { reason });
  });

  // Nova mensagem para este cliente
  client.on('message', async (message) => {
    console.log(`💬 Nova mensagem para ${tenantId} de ${message.from}: ${message.body}`);
    
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

      io.to(`tenant-${tenantId}`).emit('message', messageData);

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
            console.log(`📤 Auto-resposta enviada para ${tenantId}`);
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
        
        io.to(`tenant-${tenantId}`).emit('message_sent', messageData);
      } catch (error) {
        console.error('Erro ao processar mensagem enviada:', error);
      }
    }
  });

  // Armazenar instância
  clientInstances.set(tenantId, client);
  clientStatus.set(tenantId, { isReady: false, hasQR: false });

  // Inicializar
  client.initialize();
  
  return client;
};

// Rota para criar nova instância de cliente (SaaS)
app.post('/api/saas/create-tenant', (req, res) => {
  const tenantId = generateTenantId();
  
  try {
    createWhatsAppInstance(tenantId);
    
    // 🔥 CORREÇÃO: SEMPRE usar IP público com porta 5173
    const accessUrl = `http://146.59.227.248:5173?tenant=${tenantId}`;
    
    res.json({
      success: true,
      tenantId,
      message: 'Instância WhatsApp criada com sucesso',
      accessUrl: accessUrl
    });
    
    console.log(`🎉 Nova instância criada para cliente: ${tenantId}`);
    console.log(`🔗 Link do cliente: ${accessUrl}`);
  } catch (error) {
    console.error('Erro ao criar instância:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🎯 ROTA CORRIGIDA - Redireciona direto para frontend com tenant
app.get('/client/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  
  // Verificar se tenant existe
  if (!clientInstances.has(tenantId)) {
    return res.status(404).send(`
      <html>
        <head><title>Cliente não encontrado</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Cliente não encontrado</h1>
          <p>O ID do cliente "${tenantId}" não existe ou expirou.</p>
          <p>Entre em contato com o suporte para obter um novo link.</p>
        </body>
      </html>
    `);
  }
  
  // 🔥 SEMPRE redirecionar para IP público com porta 5173
  const frontendUrl = `http://146.59.227.248:5173?tenant=${tenantId}`;
  
  console.log(`🔗 Redirecionando cliente ${tenantId} para: ${frontendUrl}`);
  
  res.redirect(frontendUrl);
});

// Rotas da API específicas por tenant
app.get('/api/whatsapp/:tenantId/status', (req, res) => {
  const { tenantId } = req.params;
  const status = clientStatus.get(tenantId) || { isReady: false, hasQR: false };
  res.json(status);
});

app.get('/api/whatsapp/:tenantId/qr', (req, res) => {
  const { tenantId } = req.params;
  const qr = qrCodes.get(tenantId);
  
  if (qr) {
    res.json({ qr });
  } else {
    res.status(404).json({ error: 'QR Code não disponível' });
  }
});

app.post('/api/whatsapp/:tenantId/send', async (req, res) => {
  const { tenantId } = req.params;
  const client = clientInstances.get(tenantId);
  const status = clientStatus.get(tenantId);
  
  if (!client || !status?.isReady) {
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

  const { to, message } = req.body;

  try {
    const result = await client.sendMessage(to, message);
    console.log(`📤 Mensagem enviada para ${tenantId}: ${to} - ${message}`);
    
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

app.get('/api/whatsapp/:tenantId/chats', async (req, res) => {
  const { tenantId } = req.params;
  const client = clientInstances.get(tenantId);
  const status = clientStatus.get(tenantId);
  
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

app.get('/api/whatsapp/:tenantId/messages/:chatId', async (req, res) => {
  const { tenantId, chatId } = req.params;
  const client = clientInstances.get(tenantId);
  const status = clientStatus.get(tenantId);
  
  if (!client || !status?.isReady) {
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

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

app.get('/api/whatsapp/:tenantId/contacts', async (req, res) => {
  const { tenantId } = req.params;
  const client = clientInstances.get(tenantId);
  const status = clientStatus.get(tenantId);
  
  if (!client || !status?.isReady) {
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

app.post('/api/whatsapp/:tenantId/restart', async (req, res) => {
  const { tenantId } = req.params;
  const client = clientInstances.get(tenantId);
  
  try {
    console.log(`🔄 Reiniciando WhatsApp para cliente ${tenantId}...`);
    
    if (client) {
      await client.destroy();
    }
    
    clientInstances.delete(tenantId);
    clientStatus.delete(tenantId);
    qrCodes.delete(tenantId);
    
    setTimeout(() => {
      createWhatsAppInstance(tenantId);
    }, 2000);
    
    res.json({ success: true, message: 'WhatsApp reiniciado' });
  } catch (error) {
    console.error('Erro ao reiniciar WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Página inicial do SaaS
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WhatsApp SaaS - Sistema Multi-Tenant</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
          .btn { background: #25D366; color: white; padding: 15px 30px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin: 10px; }
          .btn:hover { background: #128C7E; }
          .info { background: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .tenant-list { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>🚀 WhatsApp SaaS - Sistema Multi-Tenant</h1>
        
        <div class="info">
          <h3>📊 Status do Sistema</h3>
          <p><strong>Clientes ativos:</strong> ${clientInstances.size}</p>
          <p><strong>Servidor:</strong> Online ✅</p>
          <p><strong>IP:</strong> 146.59.227.248</p>
          <p><strong>Porta:</strong> 3001</p>
        </div>

        <div class="tenant-list">
          <h3>👥 Clientes Conectados</h3>
          ${Array.from(clientInstances.keys()).map(tenantId => {
            const status = clientStatus.get(tenantId);
            return `
              <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 3px;">
                <strong>Cliente:</strong> ${tenantId}<br>
                <strong>Status:</strong> ${status?.isReady ? '✅ Conectado' : '⏳ Aguardando'}<br>
                <strong>Usuário:</strong> ${status?.user?.name || 'N/A'}<br>
                <strong>Link:</strong> <a href="http://146.59.227.248:5173?tenant=${tenantId}" target="_blank">🔗 Acessar Cliente</a>
              </div>
            `;
          }).join('')}
        </div>

        <button class="btn" onclick="createNewTenant()">➕ Criar Novo Cliente</button>
        
        <div class="info">
          <h3>📋 Como Usar</h3>
          <ol>
            <li>Clique em "Criar Novo Cliente" para gerar uma nova instância</li>
            <li>Compartilhe o link gerado com seu cliente</li>
            <li>Cliente acessa o link e escaneia o QR Code</li>
            <li>WhatsApp conecta automaticamente!</li>
          </ol>
        </div>

        <script>
          async function createNewTenant() {
            try {
              const response = await fetch('/api/saas/create-tenant', { method: 'POST' });
              const data = await response.json();
              
              if (data.success) {
                alert('✅ Novo cliente criado!\\n\\nID: ' + data.tenantId + '\\n\\nLink: ' + data.accessUrl);
                window.open(data.accessUrl, '_blank');
                location.reload();
              } else {
                alert('❌ Erro ao criar cliente');
              }
            } catch (error) {
              alert('❌ Erro: ' + error.message);
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Socket.IO com namespaces por tenant
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // Cliente se junta ao room do seu tenant
  socket.on('join-tenant', (tenantId) => {
    socket.join(`tenant-${tenantId}`);
    console.log(`👤 Cliente ${socket.id} entrou no tenant ${tenantId}`);
    
    // Enviar status atual
    const status = clientStatus.get(tenantId) || { isReady: false, hasQR: false };
    socket.emit('status', status);

    const qr = qrCodes.get(tenantId);
    if (qr) {
      socket.emit('qr', qr);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Inicializar servidor
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor WhatsApp SaaS rodando na porta ${PORT}`);
  console.log(`🌐 Painel Admin: http://146.59.227.248:${PORT}`);
  console.log(`📱 Interface Cliente: http://146.59.227.248:5173`);
  console.log('');
  console.log('🔥 SISTEMA SAAS MULTI-TENANT PRONTO!');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor...');
  
  // Destruir todas as instâncias
  for (const [tenantId, client] of clientInstances) {
    try {
      await client.destroy();
      console.log(`✅ Cliente ${tenantId} desconectado`);
    } catch (error) {
      console.error(`❌ Erro ao desconectar ${tenantId}:`, error);
    }
  }
  
  process.exit(0);
});