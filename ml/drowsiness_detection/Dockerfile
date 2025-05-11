FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies (including OpenGL libs) and CMake for dlib
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  build-essential cmake libatlas-base-dev \
  libglib2.0-0 libsm6 libxrender1 libxext6 \
  libgl1-mesa-glx && \
  rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire app into /app
COPY . /app

# Expose Flask port
EXPOSE 5002

# Default command
CMD ["python", "/app/drowsiness.py"]
