import multiprocessing

# 2×vCPU+1 is the standard starting point for CPU-bound workers.
# Tune up (toward 4×vCPU) if response times are I/O-bound.
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gthread"
threads = 2

timeout = 30
bind = "0.0.0.0:8000"
# Safe only after port 8000 is closed to the public and only Caddy reaches gunicorn.
# Without this, DRF throttle keys on the Caddy container IP rather than the real client.
forwarded_allow_ips = "*"
# Load the app once in the master process; workers copy via fork (CoW).
preload_app = True
accesslog = "-"
errorlog = "-"
loglevel = "info"


def post_fork(server, worker):
    # preload_app=True loads Django (and may open connections) in the master process.
    # Close any inherited connections so each worker gets a clean slate.
    from django.core.cache import cache
    from django.db import connections
    cache.close()
    for conn in connections.all():
        conn.close()
