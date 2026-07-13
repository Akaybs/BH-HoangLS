# Dockerfile for SMS worker
# Build image: docker build -t gcr.io/$PROJECT_ID/sms-worker:latest .
# The container expects Application Default Credentials (ADC) in Cloud Run or VM service account.

FROM node:18-alpine
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Expose no ports (worker), but keep CMD running
ENV NODE_ENV=production

CMD ["node", "smsWorkerSample.js"]
