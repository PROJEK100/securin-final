# Stage 1: Build React+Vite app
FROM node:18-alpine AS builder

# Jangan set NODE_ENV=production dulu, supaya devDependencies (termasuk vite) ikut terinstall
WORKDIR /app

# Copy package manifest dan install semua deps (prod + dev)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy sisa kode
COPY . .

# Baru set NODE_ENV=production sebelum build (optional, tapi build tetap butuh vite)
ENV NODE_ENV=production

# Build dengan Vite
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Ganti config nginx default dengan custom (untuk SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Salin hasil build
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Jalankan nginx
CMD ["nginx", "-g", "daemon off;"]
