# Production Configuration

## Environment Variables

Để frontend hoạt động với production backend, bạn cần set environment variable trong Vercel:

### Vercel Environment Variables

1. Vào Vercel Dashboard → Project Settings → Environment Variables
2. Thêm biến sau:

```
VITE_API_BASE_URL=https://ai-agent-doc-manage.onrender.com
```

### Hoặc trong `.env.production` (nếu build local)

```bash
VITE_API_BASE_URL=https://ai-agent-doc-manage.onrender.com
```

## Cách hoạt động

- **Development**: Frontend tự động dùng relative paths (`/api/...`) và Vite proxy sẽ forward đến `http://localhost:5000`
- **Production**: Frontend sẽ dùng `VITE_API_BASE_URL` hoặc mặc định là `https://ai-agent-doc-manage.onrender.com`

## Files đã được cập nhật

- `frontend/src/config.js` - File config chính
- Tất cả các pages và components đã được cập nhật để dùng `getApiUrl()` helper

## Kiểm tra

Sau khi deploy, kiểm tra:
1. Mở DevTools → Network tab
2. Thực hiện một action (upload file, etc.)
3. Xem các API calls có đang gọi đến `https://ai-agent-doc-manage.onrender.com` không

