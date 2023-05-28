FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV APP_NAME='localhost'
ENV APP_SSL='false'
ENV DATABASE_USER='escapp'
ENV DATABASE_PASS='escapp'
ENV DATABASE_NAME='escapp'
ENV DATABASE_HOST='db'
ENV DATABASE_SSL='false'
ENV NODE_ENV='development'
ENV PORT='3000'

CMD npm run migrate_local && npm run start
