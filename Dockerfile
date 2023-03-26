FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV APP_NAME='localhost'
ENV APP_SSL='false'
ENV DATABASE_URL='postgres://postgres:postgres@db:5432/postgres?sslmode=disable'
ENV DATABASE_SSL='false'
ENV NODE_ENV='development'
ENV PORT='3000'

CMD npm run migrate_local && npm run start
