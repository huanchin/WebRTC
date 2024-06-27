FROM node:lts-alpine

RUN apk update && \
    apk add --no-cache \
    docker \
    openrc && \
    rc-update add docker boot


WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 8080
RUN chown -R node /usr/src/app

RUN docker pull node:22-alpine3.19 && \
    docker pull python:3.12.4-alpine

USER node
CMD ["npm", "start"]
