// 🔍 SCRIPT DE DIAGNÓSTICO COMPLETO
const SERVER_URL = 'http://146.59.227.248:3001';

console.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO DO SISTEMA');
console.log('='.repeat(60));

// 1. TESTE DE CONECTIVIDADE DO SERVIDOR
async function testServerConnectivity() {
  console.log('\n📡 1. TESTANDO CONECTIVIDADE DO SERVIDOR');
  console.log('-'.repeat(40));
  
  try {
    const response = await fetch(SERVER_URL);
    console.log('✅ Servidor respondendo:', response.status);
    
    if (response.ok) {
      const html = await response.text();
      console.log('✅ HTML recebido, tamanho:', html.length, 'chars');
      console.log('✅ Contém "WhatsApp SaaS":', html.includes('WhatsApp SaaS'));
    }
  } catch (error) {
    console.error('❌ ERRO DE CONECTIVIDADE:', error.message);
  }
}

// 2. TESTE DE CRIAÇÃO DE TENANT
async function testTenantCreation() {
  console.log('\n👥 2. TESTANDO CRIAÇÃO DE TENANT');
  console.log('-'.repeat(40));
  
  try {
    const response = await fetch(`${SERVER_URL}/api/saas/create-tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('📊 Status da criação:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Tenant criado:', data.tenantId);
      console.log('🔗 URL de acesso:', data.accessUrl);
      return data.tenantId;
    } else {
      const error = await response.text();
      console.error('❌ Erro na criação:', error);
    }
  } catch (error) {
    console.error('❌ ERRO NA CRIAÇÃO DE TENANT:', error.message);
  }
  return null;
}

// 3. TESTE DE STATUS DO TENANT
async function testTenantStatus(tenantId) {
  if (!tenantId) return;
  
  console.log('\n📊 3. TESTANDO STATUS DO TENANT');
  console.log('-'.repeat(40));
  
  try {
    const response = await fetch(`${SERVER_URL}/api/whatsapp/${tenantId}/status`);
    console.log('📊 Status response:', response.status);
    
    if (response.ok) {
      const status = await response.json();
      console.log('✅ Status do tenant:', JSON.stringify(status, null, 2));
    } else {
      console.error('❌ Erro no status:', await response.text());
    }
  } catch (error) {
    console.error('❌ ERRO NO STATUS:', error.message);
  }
}

// 4. TESTE DE QR CODE
async function testQRCode(tenantId) {
  if (!tenantId) return;
  
  console.log('\n📱 4. TESTANDO QR CODE');
  console.log('-'.repeat(40));
  
  try {
    const response = await fetch(`${SERVER_URL}/api/whatsapp/${tenantId}/qr`);
    console.log('📱 QR response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ QR Code recebido, tamanho:', data.qr?.length || 0);
      console.log('✅ QR Code preview:', data.qr?.substring(0, 50) + '...');
    } else if (response.status === 404) {
      console.log('⏳ QR Code ainda não disponível (404)');
    } else {
      console.error('❌ Erro no QR:', await response.text());
    }
  } catch (error) {
    console.error('❌ ERRO NO QR CODE:', error.message);
  }
}

// 5. TESTE DE SOCKET.IO
function testSocketConnection(tenantId) {
  if (!tenantId) return;
  
  console.log('\n🔌 5. TESTANDO CONEXÃO SOCKET.IO');
  console.log('-'.repeat(40));
  
  // Simular conexão Socket.IO
  console.log('🔌 Tentando conectar Socket.IO...');
  console.log('🌐 URL:', SERVER_URL);
  console.log('👤 Tenant ID:', tenantId);
}

// EXECUTAR TODOS OS TESTES
async function runFullDiagnosis() {
  await testServerConnectivity();
  const tenantId = await testTenantCreation();
  await testTenantStatus(tenantId);
  await testQRCode(tenantId);
  testSocketConnection(tenantId);
  
  console.log('\n🏁 DIAGNÓSTICO COMPLETO FINALIZADO');
  console.log('='.repeat(60));
}

// Executar se estiver no browser
if (typeof window !== 'undefined') {
  runFullDiagnosis();
}

module.exports = { runFullDiagnosis };