FROM node:14-alpine

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install --production
COPY . .

RUN npm run build

CMD ["npm", "run", "start"]

EXPOSE 3000