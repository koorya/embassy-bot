from node:18.10

workdir /usr/src/app
copy package*.json ./

run npm ci
copy ./src ./src

cmd ["npm", "start"]
