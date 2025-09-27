# GitHub Container Registry의 공식 Puppeteer 이미지를 사용합니다.
FROM ghcr.io/puppeteer/puppeteer:22.10.0

# Puppeteer 이미지는 보안을 위해 non-root 'pptruser'로 실행됩니다.
# 작업 폴더를 해당 사용자의 홈으로 변경하고 파일 소유권을 지정합니다.
WORKDIR /home/pptruser

COPY --chown=pptruser:pptruser package*.json ./
RUN npm install

COPY --chown=pptruser:pptruser . .

CMD ["npm", "start"]