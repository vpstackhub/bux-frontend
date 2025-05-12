# Stage 1: Build Angular app
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration=production

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/bux-frontend/browser/. /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
