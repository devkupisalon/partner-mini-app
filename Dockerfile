# Используем базовый образ Python
FROM python:3.9

# Устанавливаем базовый образ Node.js
FROM node:20

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем файл зависимостей
COPY requirements.txt .

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

RUN npm install

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Устанавливаем Gunicorn
RUN pip install gunicorn

# Копируем файлы проекта в контейнер
COPY . .

# Запускаем приложение с использованием Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "main:app"]