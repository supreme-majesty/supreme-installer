# Supreme Dashboard

A modern, glassmorphic admin dashboard for the Supreme Development Environment with React frontend and Fastify backend.

## 🚀 Features

- **Modern Glassmorphic UI**: Beautiful frosted glass design with blue/indigo accents
- **Real-time System Monitoring**: Live system stats, uptime, and performance metrics
- **Module Management**: View and manage installed Supreme modules
- **Interactive Charts**: Performance visualization with Chart.js
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Settings Management**: Comprehensive configuration options
- **Fastify Backend**: High-performance Node.js API server

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Chart.js** - Beautiful charts and visualizations
- **React Router** - Client-side routing
- **Pure CSS** - Custom glassmorphic styling (no Tailwind)

### Backend
- **Fastify** - Fast and low overhead web framework
- **CORS** - Cross-origin resource sharing
- **Static File Serving** - Production-ready file serving

## 📦 Installation

1. **Clone and navigate to the project:**
   ```bash
   cd supreme-dashboard
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

## 🎯 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run install:all` - Install dependencies for all packages

### Frontend (client/)
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend (server/)
- `npm run dev` - Start Fastify server with auto-reload
- `npm run build` - Build server (placeholder)
- `npm start` - Start production server

## 🌐 API Endpoints

The Fastify backend provides the following API routes:

- `GET /api/system` - System information and metrics
- `GET /api/modules` - List of installed modules
- `GET /api/stats` - Dashboard statistics
- `GET /api/health` - Health check endpoint
- `POST /api/settings` - Save configuration settings

## 🎨 UI Components

### Pages
- **Dashboard** - Overview with stats cards and charts
- **System Info** - Real-time system monitoring
- **Modules** - Module management and configuration
- **Settings** - Application configuration

### Components
- **Sidebar** - Collapsible navigation with glassmorphic design
- **Header** - Top bar with system status and user info
- **Glass Cards** - Reusable glassmorphic card components

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 5000)
- `HOST` - Server host (default: 0.0.0.0)

### Settings
The dashboard includes comprehensive settings for:
- **General**: Theme, language, timezone, notifications
- **Development**: Hot reload, debug mode, logging
- **Security**: HTTPS, CORS, session management
- **Database**: Connection settings and configuration

## 🚀 Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

3. **Access the dashboard:**
   - Frontend: http://localhost:5000
   - API: http://localhost:5000/api

## 🎨 Design System

### Colors
- **Primary**: #4f46e5 (Indigo)
- **Secondary**: #7c3aed (Purple)
- **Success**: #10b981 (Emerald)
- **Error**: #ef4444 (Red)
- **Warning**: #f59e0b (Amber)

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

### Glassmorphic Effects
- **Backdrop Filter**: blur(20px)
- **Background**: rgba(255, 255, 255, 0.1)
- **Border**: rgba(255, 255, 255, 0.2)
- **Shadow**: Multiple layered shadows for depth

## 🔮 Future Enhancements

- [ ] Real-time WebSocket connections
- [ ] User authentication and authorization
- [ ] Database integration
- [ ] Plugin system for custom modules
- [ ] Dark/light theme toggle
- [ ] Export/import settings
- [ ] Advanced analytics and reporting
- [ ] Mobile app companion

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository.

---

**Supreme Dashboard** - Built with ❤️ for the Supreme Development Environment
