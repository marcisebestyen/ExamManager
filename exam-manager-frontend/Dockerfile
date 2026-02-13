FROM node:24
RUN mkdir -p /opt/app
WORKDIR /opt/app
COPY package.json .
COPY package-lock.json .
RUN npm install --force
COPY . .
EXPOSE 7285
CMD [ "npm", "run", "dev"]