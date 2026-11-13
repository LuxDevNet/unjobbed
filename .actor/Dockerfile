FROM apify/actor-node-playwright-chrome:22 AS builder
COPY --chown=myuser package*.json ./
RUN npm install --include=dev --audit=false
COPY --chown=myuser . ./
RUN npx tsc --noEmit

FROM apify/actor-node-playwright-chrome:22
COPY --chown=myuser package*.json ./
RUN npm install --include=dev --audit=false \
    && npm i apify@^3.7.2 apify-client@^2.25.0 crawlee@^3.18.1 playwright@^1.63.0 \
    && rm -r ~/.npm
COPY --chown=myuser . ./
CMD npx tsx src/main.ts
