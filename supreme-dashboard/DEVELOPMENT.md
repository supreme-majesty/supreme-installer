# Supreme Dashboard Development Guide

## 🚀 Quick Start

### Stable Development Environment
```bash
# Use the stable startup script (recommended)
npm run dev:stable

# Or use the regular dev command
npm run dev
```

### Clean Restart
```bash
# Clean all processes and restart
npm run clean
npm run dev:stable
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Port Conflicts
**Problem**: "Port X is in use" errors
**Solution**: 
```bash
npm run clean
npm run dev:stable
```

#### 2. Server Restarting Constantly
**Problem**: Server keeps restarting due to file changes
**Solution**: 
- Use `npm run dev:stable` instead of `npm run dev`
- Check for syntax errors in your code
- Ensure all dependencies are installed

#### 3. MySQL2 Configuration Warnings
**Problem**: "Ignoring invalid configuration option" warnings
**Solution**: ✅ **FIXED** - Removed invalid MySQL2 options

#### 4. Fastify Deprecation Warnings
**Problem**: "request.routerPath" deprecation warnings
**Solution**: ✅ **FIXED** - Updated to use `request.routeOptions?.url`

#### 5. Authentication Errors
**Problem**: 500 Internal Server Error on login
**Solution**: 
- Ensure server is running on port 3001
- Check that all dependencies are installed
- Use the stable startup script

## 📋 Available Scripts

- `npm run dev:stable` - Start development with stability checks
- `npm run dev` - Start development (may have port conflicts)
- `npm run clean` - Kill all running processes
- `npm run build` - Build for production
- `npm run start` - Start production server

## 🌐 URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Login**: admin / admin123

## 🛠️ Development Tips

1. **Always use `npm run dev:stable`** for the most reliable development experience
2. **If you see warnings**, they're likely fixed in the latest version
3. **Port conflicts** are automatically handled by the stable script
4. **File watching** works correctly with the updated configuration

## 🔍 Debugging

### Check Server Status
```bash
# Check if server is running
curl http://localhost:3001/api/auth/login

# Check port usage
netstat -tlnp | grep :3001
```

### View Logs
The server logs are displayed in the terminal where you started `npm run dev:stable`.

### Common Error Messages
- **"Port in use"** → Run `npm run clean` then `npm run dev:stable`
- **"Connection refused"** → Server not running, restart with stable script
- **"Invalid token"** → Normal for test requests, login through UI for real tokens
