@echo off
echo ========================================
echo    WHATSAPP SAAS - INICIANDO SERVIDOR
echo ========================================
echo.
echo 1. Instalando dependencias...
call npm install
echo.
echo 2. Iniciando servidor WhatsApp SaaS...
start cmd /k "npm run whatsapp-saas"
timeout /t 3 /nobreak >nul

echo 3. Aguardando servidor inicializar...
timeout /t 5 /nobreak >nul

echo 4. Abrindo painel administrativo...
start http://localhost:3001

echo 5. Abrindo interface do sistema...
start cmd /k "npm run dev"

echo.
echo ========================================
echo   WHATSAPP SAAS INICIADO COM SUCESSO!
echo ========================================
echo.
echo Painel Admin: http://localhost:3001
echo Interface: http://localhost:5173
echo.
echo Para criar clientes:
echo 1. Acesse o painel admin
echo 2. Clique em "Criar Novo Cliente"
echo 3. Compartilhe o link gerado
echo.
pause