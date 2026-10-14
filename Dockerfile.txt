# Etapa 1: build do React
FROM --platform=linux/amd64 node:20-alpine3.20 as build

WORKDIR /app

COPY . .

RUN npm install -g npm && \
    npm install
RUN npm run build

# Etapa 2: nginx
FROM --platform=linux/amd64 nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]