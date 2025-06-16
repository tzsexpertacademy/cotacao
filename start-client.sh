#!/bin/bash

echo "========================================"
echo "   SISTEMA WHATSAPP - INICIANDO"
echo "========================================"
echo

echo "1. Iniciando servidor WhatsApp..."
gnome-terminal -- bash -c "npm run whatsapp-server; exec bash" &
sleep 3

echo "2. Aguardando servidor inicializar..."
sleep 5

echo "3. Abrindo interface do sistema..."
gnome-terminal -- bash -c "npm run dev; exec bash" &

echo
echo "========================================"
echo "  SISTEMA INICIADO COM SUCESSO!"
echo "========================================"
echo
echo "O navegador abrirá automaticamente"
echo "Vá na aba 'WhatsApp QR' para conectar"
echo