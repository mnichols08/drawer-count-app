# Server Setup and Self-Hosting Guide

This document provides comprehensive instructions for setting up and deploying the drawer-count-app on your own server infrastructure.

## 📋 Overview

The drawer-count-app can be deployed as a self-hosted solution with full control over the infrastructure, data, and customization. This guide covers various hosting options from simple static hosting to full-stack deployment with MongoDB backend.

## 🚀 Deployment Options

### Static Hosting (Frontend Only)

Simple deployment with client-side storage only.

**Pros:**
- Minimal server requirements
- Fast deployment
- Low cost
- High availability

**Cons:**
- No data synchronization
- Local storage only
- No multi-device sync

### Full-Stack Deployment

Complete deployment with Node.js backend and MongoDB database.

**Pros:**
- Data synchronization across devices
- Centralized data management
- Multi-user support
- Advanced features

**Cons:**
- Higher server requirements
- Database management needed
- Increased complexity

## 🏗️ Server Requirements

### Minimum Requirements (Static)

```
CPU: 1 vCPU
RAM: 512 MB
Storage: 5 GB
Bandwidth: 100 GB/month
```

### Recommended Requirements (Full-Stack)

```
CPU: 2 vCPU
RAM: 2 GB
Storage: 20 GB SSD
Bandwidth: 500 GB/month
Database: MongoDB 4.4+
```

### Operating System Support

- **Linux** (Ubuntu 20.04+ recommended)
- **CentOS** 8+
- **Debian** 11+
- **Docker** containers
- **Windows Server** (with Node.js)

## 🔧 Static Hosting Setup

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Root directory
    root /var/www/drawer-count-app/dist;
    index index.html;
    
    # Static files with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # Service worker with no cache
    location /sw.js {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri =404;
    }
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### Apache Configuration

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    DocumentRoot /var/www/drawer-count-app/dist
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem
    
    # Static file caching
    <LocationMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|webp)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 year"
        Header append Cache-Control "public, immutable"
    </LocationMatch>
    
    # Service worker - no cache
    <LocationMatch "sw\.js$">
        ExpiresActive On
        ExpiresDefault "access plus -1 seconds"
        Header set Cache-Control "no-cache, no-store, must-revalidate"
    </LocationMatch>
    
    # SPA routing
    <Directory "/var/www/drawer-count-app/dist">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "no-referrer-when-downgrade"
</VirtualHost>
```

## 🗄️ Full-Stack Deployment

### Node.js Application Setup

```bash
# 1. Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Create application directory
sudo mkdir -p /var/www/drawer-count-app
sudo chown $USER:$USER /var/www/drawer-count-app
cd /var/www/drawer-count-app

# 3. Clone and setup application
git clone https://github.com/username/drawer-count-app.git .
npm install
npm run build

# 4. Setup environment variables
cat > .env << EOF
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/drawer-count-app
MONGODB_DB=drawer-count-app
MONGODB_TLS=false
API_BASE=https://your-domain.com/api
EOF

# 5. Test application
npm start
```

### MongoDB Setup

```bash
# Install MongoDB (Ubuntu 20.04)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongo << EOF
use drawer-count-app
db.createUser({
  user: "drawer-app",
  pwd: "secure-password-here",
  roles: [ { role: "readWrite", db: "drawer-count-app" } ]
})
EOF
```

### Process Management with PM2

```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'drawer-count-app',
    script: 'server.js',
    cwd: '/var/www/drawer-count-app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/drawer-count-app/error.log',
    out_file: '/var/log/drawer-count-app/access.log',
    log_file: '/var/log/drawer-count-app/combined.log',
    time: true
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/drawer-count-app
sudo chown $USER:$USER /var/log/drawer-count-app

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Reverse Proxy Configuration

```nginx
# Add to nginx configuration
upstream drawer_count_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration (same as above)
    
    # Serve static files directly
    location /assets/ {
        root /var/www/drawer-count-app/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://drawer_count_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # SPA application
    location / {
        proxy_pass http://drawer_count_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/server.js ./

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/drawer-count-app
      - MONGODB_DB=drawer-count-app
      - MONGODB_TLS=false
    depends_on:
      - mongo
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongo:
    image: mongo:6.0-focal
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=drawer-count-app
    volumes:
      - mongo_data:/data/db
      - ./init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    restart: unless-stopped
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongo localhost:27017/test --quiet
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
```

### Database Initialization

```javascript
// init-mongo.js
db.createUser({
  user: 'drawer-app',
  pwd: 'secure-password-here',
  roles: [
    {
      role: 'readWrite',
      db: 'drawer-count-app'
    }
  ]
});
```

## 🔒 Security Configuration

### SSL/TLS Setup

```bash
# Using Let's Encrypt (Certbot)
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# For MongoDB (if external access needed)
sudo ufw allow from trusted.ip.address to any port 27017
```

### Application Security

```javascript
// Additional security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

## 📊 Monitoring and Logging

### Application Monitoring

```javascript
// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await mongoose.connection.db.admin().ping();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealth.ok ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Log Management

```bash
# Logrotate configuration
sudo cat > /etc/logrotate.d/drawer-count-app << EOF
/var/log/drawer-count-app/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    copytruncate
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### System Monitoring

```bash
# Install monitoring tools
sudo apt-get install htop iotop netstat-nat

# Monitor application
pm2 monit

# Monitor system resources
htop

# Monitor network
sudo netstat -tulpn | grep :3000
```

## 🔄 Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/drawer-count-app"
DB_NAME="drawer-count-app"

mkdir -p $BACKUP_DIR

# MongoDB backup
mongodump --db $DB_NAME --out $BACKUP_DIR/mongodb_$DATE

# Compress backup
tar -czf $BACKUP_DIR/mongodb_$DATE.tar.gz -C $BACKUP_DIR mongodb_$DATE
rm -rf $BACKUP_DIR/mongodb_$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "mongodb_*.tar.gz" -mtime +7 -delete

echo "Database backup completed: mongodb_$DATE.tar.gz"
```

### Application Backup

```bash
#!/bin/bash
# backup-app.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/drawer-count-app"
APP_DIR="/var/www/drawer-count-app"

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C $APP_DIR \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  .

echo "Application backup completed: app_$DATE.tar.gz"
```

### Automated Backups

```bash
# Add to crontab
crontab -e

# Daily database backup at 2 AM
0 2 * * * /var/www/drawer-count-app/scripts/backup-db.sh

# Weekly application backup on Sunday at 3 AM
0 3 * * 0 /var/www/drawer-count-app/scripts/backup-app.sh
```

## 🚀 Performance Optimization

### Node.js Optimization

```javascript
// server.js optimizations
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Worker processes
  require('./app.js');
}
```

### Database Optimization

```javascript
// MongoDB optimizations
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  bufferCommands: false
};

// Index optimization
db.profiles.createIndex({ "userId": 1 });
db.days.createIndex({ "date": 1, "profileId": 1 });
```

### Caching Strategy

```nginx
# Nginx caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m use_temp_path=off;

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_lock on;
    
    proxy_pass http://drawer_count_app;
}
```

## 📝 Deployment Checklist

### Pre-deployment

- [ ] Server provisioned and configured
- [ ] SSL certificates installed
- [ ] Database setup and secured
- [ ] Application built and tested
- [ ] Environment variables configured
- [ ] Firewall rules configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented

### Post-deployment

- [ ] Application accessible via domain
- [ ] SSL certificate valid
- [ ] Database connectivity verified
- [ ] API endpoints functional
- [ ] PWA features working
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Monitoring alerts configured

## 🔗 Related Documentation

- [GitHub Pages Deployment](github-pages.md) - Alternative hosting option
- [Testing Guide](../testing/README.md) - Pre-deployment testing
- [Build Scripts](../scripts/build.md) - Production build process

## 📚 External Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [MongoDB Production Deployment](https://docs.mongodb.com/manual/administration/production-checklist/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Let's Encrypt](https://letsencrypt.org/getting-started/)

## 🎯 Next Steps

1. **Container Orchestration**: Consider Kubernetes for large-scale deployments
2. **Load Balancing**: Implement load balancing for high availability
3. **CDN Integration**: Add CDN for global content delivery
4. **Monitoring Enhancement**: Implement comprehensive monitoring with Prometheus/Grafana
5. **Automated Deployment**: Set up CI/CD pipelines for automated deployments