#!/bin/bash

echo "========================================"
echo "   WHATSAPP SAAS - PRODUÇÃO COMPLETA"
echo "========================================"
echo

echo "1. Instalando dependências..."
npm install
echo

echo "2. Iniciando servidor WhatsApp SaaS..."
nohup npm run whatsapp-saas > saas-server.log 2>&1 &
SAAS_PID=$!
echo "Servidor SaaS iniciado (PID: $SAAS_PID)"
sleep 3

echo "3. Iniciando servidor WhatsApp Integrated..."
nohup npm run whatsapp-integrated > integrated-server.log 2>&1 &
INTEGRATED_PID=$!
echo "Servidor Integrated iniciado (PID: $INTEGRATED_PID)"
sleep 3

echo "4. Iniciando interface frontend..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend iniciado (PID: $FRONTEND_PID)"
sleep 5

echo
echo "========================================"
echo "  WHATSAPP SAAS PRODUÇÃO ATIVO!"
echo "========================================"
echo
echo "🌐 Painel Admin: http://146.59.227.248:3002"
echo "📱 Interface Cliente: http://146.59.227.248:5173"
echo "🔗 WhatsApp Integrated: http://146.59.227.248:3005"
echo
echo "📋 PIDs dos processos:"
echo "   - SaaS Server: $SAAS_PID"
echo "   - Integrated Server: $INTEGRATED_PID"
echo "   - Frontend: $FRONTEND_PID"
echo
echo "📊 Para monitorar logs:"
echo "   - tail -f saas-server.log"
echo "   - tail -f integrated-server.log"
echo "   - tail -f frontend.log"
echo
echo "🛑 Para parar os serviços:"
echo "   - kill $SAAS_PID $INTEGRATED_PID $FRONTEND_PID"
echo

# Salvar PIDs para facilitar gerenciamento
echo "$SAAS_PID" > saas-server.pid
echo "$INTEGRATED_PID" > integrated-server.pid
echo "$FRONTEND_PID" > frontend.pid

echo "PIDs salvos em arquivos .pid"
echo "Sistema rodando em background!"