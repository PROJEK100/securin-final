FROM python:3.9-slim

# Set working directory\ nWORKDIR /app

# Install dependensi sistem dan CMake untuk dlib
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential cmake libatlas-base-dev \
      libglib2.0-0 libsm6 libxrender1 libxext6 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

# Expose port Flask
EXPOSE 5002

CMD ["python", "drowsiness.py"]
