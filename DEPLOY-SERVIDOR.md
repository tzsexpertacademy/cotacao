# 🚀 Deploy do WhatsApp SaaS em Servidor

## 📋 **Requisitos do Servidor**

### **Especificações Mínimas:**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ ou CentOS 7+
- **Node.js**: 18.x ou superior
- **PM2**: Para gerenciar processos

### **Portas Necessárias:**
- **3001**: Servidor SaaS
- **5173**: Interface (opcional, pode usar Nginx)
- **80/443**: Para domínio público

## 🔧 **Instalação no Servidor**

### **1. Preparar Servidor:**
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Instalar dependências do sistema
sudo apt-get install -y chromium-browser xvfb
```

### **2. Upload do Projeto:**
```bash
# Fazer upload dos arquivos para /var/www/whatsapp-saas/
sudo mkdir -p /var/www/whatsapp-saas
cd /var/www/whatsapp-saas

# Instalar dependências
npm install

# Dar permissões
sudo chown -R $USER:$USER /var/www/whatsapp-saas
```

### **3. Configurar PM2:**
```bash
# Criar arquivo ecosystem
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'whatsapp-saas',
      script: 'server/whatsapp-saas-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
EOF

# Criar pasta de logs
mkdir -p logs

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### **4. Configurar Nginx (Opcional):**
```bash
# Instalar Nginx
sudo apt install nginx -y

# Configurar site
sudo cat > /etc/nginx/sites-available/whatsapp-saas << 'EOF'
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Ativar site
sudo ln -s /etc/nginx/sites-available/whatsapp-saas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### **5. SSL com Let's Encrypt:**
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado
sudo certbot --nginx -d seu-dominio.com

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔒 **Segurança**

### **Firewall:**
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### **Backup Automático:**
```bash
# Script de backup
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backup/whatsapp-saas-$DATE.tar.gz /var/www/whatsapp-saas/whatsapp-sessions/
find /backup -name "whatsapp-saas-*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Cron para backup diário
crontab -e
# Adicionar: 0 2 * * * /var/www/whatsapp-saas/backup.sh
```

## 📊 **Monitoramento**

### **PM2 Monitoring:**
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs whatsapp-saas

# Restart se necessário
pm2 restart whatsapp-saas

# Monitoramento web
pm2 install pm2-server-monit
```

### **Logs do Sistema:**
```bash
# Ver logs em tempo real
tail -f logs/combined.log

# Verificar erros
grep ERROR logs/err.log
```

## 🎯 **URLs Finais**

Após deploy completo:
- **Painel Admin**: `https://seu-dominio.com`
- **API**: `https://seu-dominio.com/api/`
- **Cliente**: `https://seu-dominio.com/client/{ID}`

## 🚨 **Troubleshooting**

### **Problemas Comuns:**

1. **Puppeteer não funciona:**
```bash
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

2. **Memória insuficiente:**
```bash
# Aumentar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

3. **Muitas instâncias:**
```bash
# Limitar número de clientes simultâneos no código
# Adicionar no whatsapp-saas-server.js:
const MAX_CLIENTS = 50; // Ajustar conforme servidor
```

## 💰 **Custos Estimados**

### **VPS Recomendados:**
- **DigitalOcean**: $20/mês (4GB RAM)
- **Vultr**: $20/mês (4GB RAM)
- **Linode**: $20/mês (4GB RAM)
- **AWS EC2**: $25-30/mês (t3.medium)

### **Capacidade:**
- **50-100 clientes** simultâneos
- **Escalável** conforme necessidade
- **Backup automático** incluído

---

🎉 **Agora você tem um SaaS WhatsApp profissional pronto para produção!**