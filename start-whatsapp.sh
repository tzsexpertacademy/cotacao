#!/bin/bash

echo "========================================"
echo "   WHATSAPP REAL - INICIANDO SERVIDOR"
echo "========================================"
echo

echo "1. Instalando dependências..."
npm install
echo

echo "2. Iniciando servidor WhatsApp REAL..."
gnome-terminal -- bash -c "npm run whatsapp-server; exec bash" &
sleep 3

echo "3. Aguardando servidor inicializar..."
sleep 5

echo "4. Abrindo interface do sistema..."
gnome-terminal -- bash -c "npm run dev; exec bash" &

echo
echo "========================================"
echo "  WHATSAPP REAL INICIADO COM SUCESSO!"
echo "========================================"
echo
echo "O navegador abrirá automaticamente"
echo "Vá na aba 'WhatsApp Real' para conectar"
echo "Escaneie o QR Code com seu celular"
echo