FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine as production

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create directories for SSL certificates and logs
RUN mkdir -p /app/ssl /app/logs && \
    chmod -R 755 /app/ssl /app/logs

EXPOSE 3001

CMD ["node", "dist/main"] 