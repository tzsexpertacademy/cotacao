@echo off
echo ========================================
echo    WHATSAPP REAL - INICIANDO SERVIDOR
echo ========================================
echo.
echo 1. Instalando dependencias...
call npm install
echo.
echo 2. Iniciando servidor WhatsApp REAL...
start cmd /k "npm run whatsapp-server"
timeout /t 3 /nobreak >nul

echo 3. Aguardando servidor inicializar...
timeout /t 5 /nobreak >nul

echo 4. Abrindo interface do sistema...
start cmd /k "npm run dev"

echo.
echo ========================================
echo   WHATSAPP REAL INICIADO COM SUCESSO!
echo ========================================
echo.
echo O navegador abrira automaticamente
echo Va na aba "WhatsApp Real" para conectar
echo Escaneie o QR Code com seu celular
echo.
pause