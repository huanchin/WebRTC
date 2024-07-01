# 拉取需要的映像
FROM node:22-alpine3.19 AS node_image
FROM python:3.12.4-alpine AS python_image

FROM docker:latest

# 安裝 Docker
RUN apk add --update nodejs npm &&\
    apk add --update npm

# 設定環境變量和工作目錄
ENV NODE_ENV=production
WORKDIR /usr/src/app

# 複製依賴文件並安裝依賴
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../

# 複製應用程序代碼
COPY . .

# 暴露端口
EXPOSE 8080

# 啟動應用程序
CMD ["sh", "-c", "dockerd & sleep 5 && npm start"]
