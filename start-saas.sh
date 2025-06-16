#!/bin/bash

echo "========================================"
echo "   WHATSAPP SAAS - INICIANDO SERVIDOR"
echo "========================================"
echo

echo "1. Instalando dependências..."
npm install
echo

echo "2. Iniciando servidor WhatsApp SaaS..."
gnome-terminal -- bash -c "npm run whatsapp-saas; exec bash" &
sleep 3

echo "3. Aguardando servidor inicializar..."
sleep 5

echo "4. Abrindo painel administrativo..."
xdg-open http://localhost:3001 &

echo "5. Abrindo interface do sistema..."
gnome-terminal -- bash -c "npm run dev; exec bash" &

echo
echo "========================================"
echo "  WHATSAPP SAAS INICIADO COM SUCESSO!"
echo "========================================"
echo
echo "Painel Admin: http://localhost:3001"
echo "Interface: http://localhost:5173"
echo
echo "Para criar clientes:"
echo "1. Acesse o painel admin"
echo "2. Clique em 'Criar Novo Cliente'"
echo "3. Compartilhe o link gerado"
echo