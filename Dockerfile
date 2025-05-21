# Stage 1: Build Angular app in development mode
FROM node:24.0.2-slim AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npx ng build bux-frontend --configuration=development

# Stage 2: Serve with Nginx (still okay for local)
FROM nginx:1.28.0-alpine-slim
COPY --from=builder /app/dist/bux-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
