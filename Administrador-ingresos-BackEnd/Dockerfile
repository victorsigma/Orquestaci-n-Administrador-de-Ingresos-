# Usar la imagen base de Node.js
FROM node:22.8.0-alpine3.20

# Crear un directorio para la aplicación
WORKDIR /usr/src/app

# Copiar los archivos de configuración de npm
COPY package.json package-lock.json ./

# Instalar las dependencias
RUN npm install

# Copiar todo el directorio del proyecto al contenedor
COPY . .

# Exponer el puerto 3000
EXPOSE 3000

# Comando por defecto para ejecutar la aplicación
CMD ["node", "index.js"]