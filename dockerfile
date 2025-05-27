# Usar una imagen oficial de Node
FROM node:22

# Establecer el directorio de trabajo dentro del contenedor, es la carpeta donde se ubicará el contenedor.
WORKDIR /appPlataformaIntegral

# Copiar los archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto que usa el backend
EXPOSE 3000

# Comando para correr el backend
CMD ["npm", "start"]
