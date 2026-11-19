# Build the static site
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The API is reverse-proxied by nginx on the same origin, so a relative path works.
ARG VITE_API=/api
ARG VITE_RAZORPAY_KEY=
ENV VITE_API=$VITE_API VITE_RAZORPAY_KEY=$VITE_RAZORPAY_KEY
RUN npm run build

# Serve it with nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
