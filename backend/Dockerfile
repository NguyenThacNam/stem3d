FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# /data/content: volume `content` (file mô hình GLB). Tạo sẵn và giao cho ungdung để volume mới tạo
# nhận đúng chủ sở hữu (Docker chép quyền thư mục của image sang volume rỗng ở lần gắn đầu tiên).
RUN useradd --create-home --uid 1000 ungdung \
    && mkdir -p /data/content/models /data/content/tmp \
    && chown -R ungdung /app /data/content
USER ungdung

EXPOSE 8000
# api chỉ nhận yêu cầu từ Nginx trong mạng nội bộ nên tin header X-Forwarded-*.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
