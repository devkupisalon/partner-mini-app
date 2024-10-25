#  partners (partners-web-app)

partners web app for kupisalon company

## 1. Install the dependencies
```bash
cat modules.txt | xargs npm install
```

### 2. Create .env file with secrets

### 3. Config partners-web-app.service

### 4. Copy partners-web-app.service to /etc/systemd/system

### 5. Start service
```bash
sudo systemctl daemon-reload
sudo systemctl start partners-web-app
sudo systemctl enable partners-web-app
```
