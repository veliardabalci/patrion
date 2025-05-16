FROM node:20-alpine AS base

# Çalışma dizinini oluştur
WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package.json package-lock.json* ./
RUN npm ci

# Kaynak kodları kopyala
COPY . .

# Derleme işlemi
RUN npm run build

# Çalıştırma için hafif imaj oluştur
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Next.js çalışması için gerekli kullanıcı
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Derleme çıktılarını ve gerekli dosyaları kopyala
COPY --from=base /app/public ./public
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"] 