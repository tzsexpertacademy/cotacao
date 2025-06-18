#!/bin/bash

echo "========================================"
echo "   WHATSAPP STANDALONE - INICIANDO"
echo "========================================"
echo

echo "1. Instalando dependências..."
npm install
echo

echo "2. Iniciando servidor WhatsApp..."
npm start

echo
echo "========================================"
echo "  WHATSAPP STANDALONE FUNCIONANDO!"
echo "========================================"
echo
echo "🌐 Painel: http://146.59.227.248:3001"
echo "📱 API: http://146.59.227.248:3001/api/whatsapp/"
echo