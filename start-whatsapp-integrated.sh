#!/bin/bash

echo "========================================"
echo "   WHATSAPP INTEGRADO - INICIANDO"
echo "========================================"
echo

echo "1. Instalando dependências..."
npm install
echo

echo "2. Iniciando servidor WhatsApp Integrado..."
nohup npm run whatsapp-integrated > whatsapp-integrated.log 2>&1 &
INTEGRATED_PID=$!
echo "Servidor Integrado iniciado (PID: $INTEGRATED_PID)"
sleep 3

echo "3. Iniciando interface frontend..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend iniciado (PID: $FRONTEND_PID)"
sleep 5

echo
echo "========================================"
echo "  WHATSAPP INTEGRADO FUNCIONANDO!"
echo "========================================"
echo
echo "🌐 Interface Principal: http://146.59.227.248:5173"
echo "📱 API WhatsApp: http://146.59.227.248:3005"
echo
echo "📋 PIDs dos processos:"
echo "   - WhatsApp Integrado: $INTEGRATED_PID"
echo "   - Frontend: $FRONTEND_PID"
echo
echo "📊 Para monitorar logs:"
echo "   - tail -f whatsapp-integrated.log"
echo "   - tail -f frontend.log"
echo
echo "🛑 Para parar os serviços:"
echo "   - kill $INTEGRATED_PID $FRONTEND_PID"
echo

# Salvar PIDs para facilitar gerenciamento
echo "$INTEGRATED_PID" > whatsapp-integrated.pid
echo "$FRONTEND_PID" > frontend.pid

echo "PIDs salvos em arquivos .pid"
echo "Sistema rodando em background!"
echo
echo "🎯 COMO USAR:"
echo "1. Acesse http://146.59.227.248:5173"
echo "2. Clique na aba 'WhatsApp'"
echo "3. Clique em 'Inicializar WhatsApp'"
echo "4. Escaneie o QR Code que aparecer"
echo "5. Pronto! WhatsApp conectado na plataforma!"