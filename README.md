# 🎨 Frontend - Unified Document Management Agent

## 📁 Cấu trúc thư mục

```
frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── App.jsx              # Main React component
│   ├── App.css              # Main CSS styles
│   ├── main.jsx             # React entry point
│   ├── index.css            # Global styles
│   └── assets/
│       └── react.svg
├── package.json             # Dependencies
├── vite.config.js           # Vite configuration
└── README.md                # This file
```

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Chạy development server
```bash
npm run dev
```
- **URL**: `http://localhost:3000`
- **Hot reload**: ✅
- **Proxy API**: `/api` → `http://localhost:5000`

### 3. Build cho production
```bash
npm run build
```

### 4. Preview production build
```bash
npm run preview
```

## 🔧 Cấu hình

### Vite Config (`vite.config.js`)
- **Port**: 3000
- **Proxy**: `/api` → `http://localhost:5000`
- **React**: Plugin enabled
- **Hot reload**: ✅

### API Integration
- **Backend**: Express server (port 5000)
- **Frontend**: Vite dev server (port 3000)
- **Proxy**: API calls tự động proxy

## 📋 Tính năng

### ✅ React Components:
- **App.jsx**: Main component với state management
- **File Upload**: Drag & drop support
- **Form Handling**: Controlled components
- **Status Polling**: Real-time updates
- **Results Display**: Dynamic rendering

### ✅ State Management:
- **useState**: Local state
- **useEffect**: Side effects
- **Form State**: Controlled inputs
- **Status State**: Processing status

### ✅ API Integration:
- **POST /api/document/process**: Upload document
- **GET /api/document/status/{id}**: Check status
- **Error Handling**: Try/catch blocks
- **Loading States**: UI feedback

## 🎯 Lợi ích của React + Vite

### ✅ Performance:
- **Fast HMR**: Hot Module Replacement
- **ES Modules**: Native browser support
- **Tree Shaking**: Optimized bundles
- **Code Splitting**: Automatic

### ✅ Developer Experience:
- **React Hooks**: Modern state management
- **JSX**: Component-based architecture
- **Hot Reload**: Instant updates
- **TypeScript**: Ready for migration

### ✅ Production Ready:
- **Optimized Build**: Rollup bundling
- **Asset Optimization**: Images, fonts
- **Code Splitting**: Automatic chunks
- **Modern JS**: ES2020+ support

## 🔗 Tích hợp với Backend

### Backend API (Express):
```javascript
// Port 5000
app.post('/api/document/process', ...)
app.get('/api/document/status/:id', ...)
```

### Frontend (React + Vite):
```javascript
// Port 3000 với proxy
fetch('/api/document/process', ...)
fetch('/api/document/status/123', ...)
```

### Proxy Configuration:
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

## 🚀 Development Workflow

### Terminal 1: Backend
```bash
cd "F:\HocTap\HK1-2025-2026\Chuyên đề 3"
npm start
# http://localhost:5000
```

### Terminal 2: Frontend
```bash
cd "F:\HocTap\HK1-2025-2026\Chuyên đề 3\frontend"
npm run dev
# http://localhost:3000
```

## 📊 So sánh với HTML tĩnh

| **Tính năng** | **HTML Static** | **React + Vite** |
|---------------|-----------------|------------------|
| **State Management** | ❌ Manual DOM | ✅ React Hooks |
| **Component Reuse** | ❌ Copy/paste | ✅ JSX Components |
| **Hot Reload** | ❌ Manual refresh | ✅ Instant updates |
| **Build Optimization** | ❌ Manual | ✅ Automatic |
| **Type Safety** | ❌ No types | ✅ TypeScript ready |

## 📝 Notes

- **Frontend**: React + Vite (port 3000)
- **Backend**: Express API (port 5000)
- **Proxy**: API calls tự động proxy
- **Components**: JSX-based, reusable
- **State**: React Hooks (useState, useEffect)
- **Styling**: CSS modules ready