#!/bin/bash

echo "========================================"
echo "   PARANDO WHATSAPP SAAS PRODUÇÃO"
echo "========================================"
echo

if [ -f "saas-server.pid" ]; then
    SAAS_PID=$(cat saas-server.pid)
    echo "Parando servidor SaaS (PID: $SAAS_PID)..."
    kill $SAAS_PID 2>/dev/null
    rm saas-server.pid
    echo "✅ Servidor SaaS parado"
else
    echo "❌ PID do servidor SaaS não encontrado"
fi

if [ -f "integrated-server.pid" ]; then
    INTEGRATED_PID=$(cat integrated-server.pid)
    echo "Parando servidor Integrated (PID: $INTEGRATED_PID)..."
    kill $INTEGRATED_PID 2>/dev/null
    rm integrated-server.pid
    echo "✅ Servidor Integrated parado"
else
    echo "❌ PID do servidor Integrated não encontrado"
fi

if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    echo "Parando frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
    rm frontend.pid
    echo "✅ Frontend parado"
else
    echo "❌ PID do frontend não encontrado"
fi

echo
echo "🛑 Todos os serviços foram parados!"
echo