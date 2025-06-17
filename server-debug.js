// 🔍 SCRIPT DE DEBUG DO SERVIDOR
const express = require('express');
const cors = require('cors');

// Middleware de debug detalhado
function debugMiddleware(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`\n🔍 [${timestamp}] ${req.method} ${req.url}`);
  console.log('📊 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  console.log('🌐 IP:', req.ip);
  console.log('🔗 Origin:', req.get('Origin'));
  
  // Log da resposta
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📤 Response Status: ${res.statusCode}`);
    console.log(`📤 Response Data: ${typeof data === 'string' ? data.substring(0, 200) + '...' : JSON.stringify(data).substring(0, 200) + '...'}`);
    console.log('-'.repeat(50));
    originalSend.call(this, data);
  };
  
  next();
}

// Função para verificar estado do servidor
function checkServerState() {
  console.log('\n🔍 ESTADO ATUAL DO SERVIDOR');
  console.log('='.repeat(50));
  console.log('📊 Memória:', process.memoryUsage());
  console.log('⏰ Uptime:', process.uptime(), 'segundos');
  console.log('🌐 Porta:', process.env.PORT || 3001);
  console.log('📁 Diretório:', process.cwd());
  console.log('🔧 Node Version:', process.version);
}

// Função para verificar instâncias WhatsApp
function checkWhatsAppInstances() {
  console.log('\n📱 INSTÂNCIAS WHATSAPP ATIVAS');
  console.log('='.repeat(50));
  
  // Estas variáveis devem estar disponíveis no servidor principal
  if (typeof clientInstances !== 'undefined') {
    console.log('👥 Total de instâncias:', clientInstances.size);
    console.log('📋 IDs dos clientes:', Array.from(clientInstances.keys()));
    
    clientInstances.forEach((client, tenantId) => {
      console.log(`\n🏢 Cliente: ${tenantId}`);
      console.log(`📊 Status: ${clientStatus.get(tenantId)?.isReady ? 'Conectado' : 'Desconectado'}`);
      console.log(`📱 QR Code: ${qrCodes.has(tenantId) ? 'Disponível' : 'Não disponível'}`);
    });
  } else {
    console.log('❌ Variáveis de instância não encontradas');
  }
}

// Função para testar APIs
async function testAPIs() {
  console.log('\n🧪 TESTANDO APIs INTERNAS');
  console.log('='.repeat(50));
  
  const testUrls = [
    '/',
    '/api/saas/create-tenant',
    '/api/whatsapp/test-tenant/status',
    '/api/whatsapp/test-tenant/qr'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`\n🔍 Testando: ${url}`);
      // Aqui você faria requisições internas se necessário
    } catch (error) {
      console.error(`❌ Erro em ${url}:`, error.message);
    }
  }
}

module.exports = {
  debugMiddleware,
  checkServerState,
  checkWhatsAppInstances,
  testAPIs
};