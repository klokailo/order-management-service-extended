FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000
CMD ["npm", "start"]
