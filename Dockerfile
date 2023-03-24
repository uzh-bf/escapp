FROM node:10-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV=development
ENV PORT=80
ENV DATABASE_URL=postgres://postgres:postgres@db:5432/postgres
ENV APP_NAME=localhost

CMD npm run migrate_local && npm run seed_local && npm run start
