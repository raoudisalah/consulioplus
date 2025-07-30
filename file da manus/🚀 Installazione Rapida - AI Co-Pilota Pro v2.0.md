# 🚀 Installazione Rapida - AI Co-Pilota Pro v2.0

Questa guida ti permetterà di avere AI Co-Pilota Pro v2.0 funzionante in meno di 10 minuti.

## ✅ Checklist Prerequisiti

Prima di iniziare, assicurati di avere:

- [ ] **PHP 8.0+** con estensioni: mbstring, openssl, PDO, tokenizer, XML, JSON, BCMath, ctype, fileinfo, GD
- [ ] **MySQL 8.0+** o MariaDB 10.5+
- [ ] **Redis 6.0+**
- [ ] **Node.js 16+** con npm
- [ ] **Composer** (dependency manager PHP)
- [ ] **Web Server** (Apache/Nginx)
- [ ] **Google Cloud Account** per API AI

## 🔧 Setup in 5 Passi

### Passo 1: Download e Dipendenze

```bash
# Clone del repository
git clone https://github.com/consulio/ai-copilot-pro.git
cd ai-copilot-pro

# Installazione dipendenze PHP
composer install --optimize-autoloader

# Installazione dipendenze Node.js
npm install
```

### Passo 2: Configurazione Base

```bash
# Copia file di configurazione
cp .env.example .env

# Genera chiave applicazione
php artisan key:generate

# Imposta permessi
chmod -R 755 storage bootstrap/cache
sudo chown -R www-data:www-data storage bootstrap/cache
```

### Passo 3: Database Setup

```bash
# Crea database MySQL
mysql -u root -p -e "CREATE DATABASE ai_copilot_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Configura .env (modifica con i tuoi dati)
sed -i 's/DB_DATABASE=.*/DB_DATABASE=ai_copilot_pro/' .env
sed -i 's/DB_USERNAME=.*/DB_USERNAME=your_username/' .env
sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=your_password/' .env

# Esegui migrazioni
php artisan migrate
```

### Passo 4: Configurazione API AI

Modifica il file `.env` con le tue API keys:

```env
# Google Speech-to-Text
GOOGLE_SPEECH_API_KEY=your_speech_api_key
GOOGLE_SPEECH_PROJECT_ID=your_project_id

# Google Gemini AI
GOOGLE_AI_API_KEY=your_gemini_api_key

# Redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

### Passo 5: Build e Avvio

```bash
# Build assets per produzione
npm run production

# Ottimizzazione Laravel
php artisan optimize

# Avvia server di sviluppo
php artisan serve
```

## 🌐 Accesso all'Applicazione

Apri il browser e vai a: `http://localhost:8000`

Dovresti vedere l'interfaccia di AI Co-Pilota Pro v2.0!

## ⚡ Setup Produzione (Opzionale)

Per ambiente di produzione, configura anche:

### Web Server (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/ai-copilot-pro/public;
    
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### SSL/HTTPS

```bash
# Installa Certbot
sudo apt install certbot python3-certbot-nginx

# Ottieni certificato SSL
sudo certbot --nginx -d your-domain.com
```

### Ottimizzazioni Produzione

```bash
# Cache configurazione
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Ottimizzazione Composer
composer install --no-dev --optimize-autoloader

# Configurazione .env produzione
APP_ENV=production
APP_DEBUG=false
LOG_LEVEL=warning
```

## 🧪 Test Installazione

Verifica che tutto funzioni:

```bash
# Test sistema completo
php artisan ai-copilot:system-check

# Test connessioni AI
php artisan ai-copilot:test-ai-services

# Test audio (richiede browser)
# Vai su http://localhost:8000 e testa il microfono
```

## 🔍 Troubleshooting Rapido

### Errore: "Class 'Redis' not found"
```bash
sudo apt-get install php-redis
sudo systemctl restart apache2
```

### Errore: "CSRF token mismatch"
```bash
php artisan config:clear
php artisan cache:clear
```

### Errore: "Permission denied"
```bash
sudo chown -R www-data:www-data storage bootstrap/cache
chmod -R 755 storage bootstrap/cache
```

### Audio non funziona
- Verifica che il sito sia servito via HTTPS
- Controlla permessi microfono nel browser
- Testa con Chrome (raccomandato)

## 📚 Prossimi Passi

1. **Leggi la [Documentazione Completa](AI_COPILOT_PRO_V2_DOCUMENTATION.md)**
2. **Configura utenti e permessi**
3. **Personalizza l'interfaccia**
4. **Integra con il tuo CRM**
5. **Configura backup automatici**

## 🆘 Serve Aiuto?

- **Documentazione**: [AI_COPILOT_PRO_V2_DOCUMENTATION.md](AI_COPILOT_PRO_V2_DOCUMENTATION.md)
- **Email**: support@consulio.com
- **Issues**: [GitHub Issues](https://github.com/consulio/ai-copilot-pro/issues)

---

**🎉 Congratulazioni! AI Co-Pilota Pro v2.0 è ora installato e pronto all'uso!**

