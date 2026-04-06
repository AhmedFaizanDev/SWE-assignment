"""
Django settings for ERMS (EngInventory) API.
Database: PostgreSQL (Docker Compose locally, RDS on AWS).
Cache: Redis (Docker Compose locally, ElastiCache on AWS).
"""
import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')

_secret = os.getenv('SECRET_KEY', '')
if not _secret:
    if DEBUG:
        import warnings
        _secret = 'insecure-dev-key-DO-NOT-USE-IN-PRODUCTION'
        warnings.warn('SECRET_KEY is not set — using insecure default. Set it in .env for production.', stacklevel=1)
    else:
        raise ImproperlyConfigured('SECRET_KEY is required when DEBUG=False.')
SECRET_KEY = _secret

ALLOWED_HOSTS = [
    h.strip() for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'core',
    'suppliers',
    'inventory',
    'item_requests',
    'borrowed',
    'activity',
    'analytics',
    'ai',
    'alerts',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Database — always PostgreSQL; falls back to SQLite only when DATABASE_URL is
# unset AND running outside Docker (bare `runserver` during local dev).
# ---------------------------------------------------------------------------
_default_db = dj_database_url.config(
    default=os.getenv('DATABASE_URL'),
    conn_max_age=600,
)
if _default_db:
    DATABASES = {'default': _default_db}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ---------------------------------------------------------------------------
# Cache — Redis via django-redis; falls back to local-memory when no URL set.
# ---------------------------------------------------------------------------
_redis_url = os.getenv('REDIS_URL')
if _redis_url:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': _redis_url,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            },
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# Default includes Vite’s common ports (5173) and this repo’s vite.config port (8080).
_default_cors = (
    'http://localhost:5173,http://127.0.0.1:5173,'
    'http://localhost:8080,http://127.0.0.1:8080,'
    'http://localhost:4173,http://127.0.0.1:4173'
)
_default_cors_list = [o.strip() for o in _default_cors.split(',') if o.strip()]
_cors_env = os.getenv('CORS_ALLOWED_ORIGINS', '').strip()
if not _cors_env:
    CORS_ALLOWED_ORIGINS = _default_cors_list
else:
    _cors_from_env = [o.strip() for o in _cors_env.split(',') if o.strip()]
    if DEBUG:
        # Union with defaults so a partial .env (e.g. only :5173) cannot break :8080 or vice versa.
        CORS_ALLOWED_ORIGINS = list(dict.fromkeys(_cors_from_env + _default_cors_list))
    else:
        CORS_ALLOWED_ORIGINS = _cors_from_env

# ---------------------------------------------------------------------------
# REST Framework
# ---------------------------------------------------------------------------
_AI_INSIGHTS_READ_PER_MIN = int(os.getenv('AI_INSIGHTS_READ_PER_MIN', '300'))
_AI_WRITE_PER_MIN = int(os.getenv('AI_RATE_LIMIT_PER_MIN', '30'))

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '200/minute',
        # Cheap DB reads (GET /ai/insights/) — high limit so dev refetch / tab focus does not 429.
        'ai_insights_read': f'{_AI_INSIGHTS_READ_PER_MIN}/minute',
        # OpenAI-backed POSTs: query, simulate, generate insights.
        'ai_write': f'{_AI_WRITE_PER_MIN}/minute',
    },
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}

# ---------------------------------------------------------------------------
# Security — production hardening when behind ALB / reverse proxy
# ---------------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# ---------------------------------------------------------------------------
# OpenAI / AI Configuration
# ---------------------------------------------------------------------------
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
AI_EMBEDDING_MODEL = os.getenv('AI_EMBEDDING_MODEL', 'text-embedding-3-small')
AI_MAX_TOKENS = int(os.getenv('AI_MAX_TOKENS', '1024'))
AI_REQUEST_TIMEOUT_MS = int(os.getenv('AI_REQUEST_TIMEOUT_MS', '30000'))
AI_RATE_LIMIT_PER_MIN = _AI_WRITE_PER_MIN
AI_INSIGHTS_READ_PER_MIN = _AI_INSIGHTS_READ_PER_MIN

if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').lower() in ('true', '1', 'yes')
    CSRF_TRUSTED_ORIGINS = [
        origin.strip()
        for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')
        if origin.strip()
    ]
