@echo off
echo ========================================
echo    SISTEMA WHATSAPP - INICIANDO
echo ========================================
echo.
echo 1. Iniciando servidor WhatsApp...
start cmd /k "npm run whatsapp-server"
timeout /t 3 /nobreak >nul

echo 2. Aguardando servidor inicializar...
timeout /t 5 /nobreak >nul

echo 3. Abrindo interface do sistema...
start cmd /k "npm run dev"

echo.
echo ========================================
echo   SISTEMA INICIADO COM SUCESSO!
echo ========================================
echo.
echo O navegador abrira automaticamente
echo Va na aba "WhatsApp QR" para conectar
echo.
pause