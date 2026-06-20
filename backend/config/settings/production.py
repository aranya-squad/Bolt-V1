import sentry_sdk

from .base import *  # noqa: F401, F403
from .base import env

DEBUG = False

# HTTPS enforcement defaults ON; disable via env for HTTP-only bring-up before
# TLS (a domain + ALB/CDN) is in front. Flip these back on once TLS terminates.
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
# TLS is terminated at the load balancer / CDN; trust its forwarded-proto header
# so SECURE_SSL_REDIRECT does not loop on requests Django sees as plain HTTP.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

sentry_dsn = env("SENTRY_DSN", default="")
if sentry_dsn:
    sentry_sdk.init(dsn=sentry_dsn, traces_sample_rate=0.1)

# ─── Email ────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="smtp.sendgrid.net")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="apikey")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")

# ─── S3 storage (static files + media) ───────────────────────────────────────
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "bucket_name": env("AWS_STORAGE_BUCKET_NAME"),
            "region_name": env("AWS_S3_REGION_NAME", default="ap-south-1"),
            # No ACL: modern buckets disable ACLs. Media bucket stays private via
            # its Block-Public-Access setting (see deploy plan Track B3).
            "object_parameters": {"CacheControl": "max-age=86400"},
        },
    },
    "staticfiles": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "bucket_name": env("AWS_STATIC_BUCKET_NAME", default=env("AWS_STORAGE_BUCKET_NAME")),
            "region_name": env("AWS_S3_REGION_NAME", default="ap-south-1"),
            "location": "static",
            # No ACL: static bucket is made public via a bucket policy (Track B3).
            # querystring_auth=False yields clean, cacheable public URLs.
            "querystring_auth": False,
            "object_parameters": {"CacheControl": "max-age=86400, immutable"},
        },
    },
}

# Leave unset to use the EC2 instance IAM role (boto3 default credential chain).
# Set them only when running outside AWS, or with a dedicated S3-only IAM user.
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default=None)
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default=None)
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="ap-south-1")

# STATIC_URL points at S3 when deployed; override via env if using CloudFront.
STATIC_URL = env(
    "STATIC_URL",
    default=(
        "https://"
        + env("AWS_STATIC_BUCKET_NAME", default=env("AWS_STORAGE_BUCKET_NAME"))
        + ".s3."
        + env("AWS_S3_REGION_NAME", default="ap-south-1")
        + ".amazonaws.com/static/"
    ),
)
