FROM node:18.10

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm ci --omit=dev
COPY . . 
RUN npm run build

