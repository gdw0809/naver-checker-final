FROM ghcr.io/puppeteer/puppeteer:22.10.0
WORKDIR /home/pptruser
COPY --chown=pptruser:pptruser package*.json ./
RUN npm install
COPY --chown=pptruser:pptruser . .
CMD ["npm", "start"]