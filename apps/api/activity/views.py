from collections import defaultdict
from datetime import timedelta
from dateutil.relativedelta import relativedelta

from django.core.cache import cache
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from django.db.models import Count, Sum

from borrowed.models import BorrowedItem
from .models import ActivityEntry
from .serializers import ActivityEntrySerializer

ACTIVITY_CACHE_PREFIX = 'activity_list'
ACTIVITY_CACHE_TTL = 15
ACTIVITY_KEYS_KEY = f'{ACTIVITY_CACHE_PREFIX}:__keys__'

MAX_ACTIVITY_LIMIT = 500


def _track_cache_key(keys_key, cache_key):
    keys = cache.get(keys_key, [])
    if cache_key not in keys:
        keys.append(cache_key)
        cache.set(keys_key, keys, None)


def _delete_cached_keys(keys_key):
    keys = cache.get(keys_key, [])
    for key in keys:
        cache.delete(key)
    cache.delete(keys_key)


@api_view(['GET'])
def activity_list(request):
    limit = request.query_params.get('limit', '')
    cache_key = f'{ACTIVITY_CACHE_PREFIX}:{limit}'

    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    qs = ActivityEntry.objects.all()
    try:
        n = max(1, min(int(limit), MAX_ACTIVITY_LIMIT)) if limit else MAX_ACTIVITY_LIMIT
    except (ValueError, TypeError):
        n = MAX_ACTIVITY_LIMIT
    qs = qs[:n]

    data = ActivityEntrySerializer(qs, many=True).data
    cache.set(cache_key, data, ACTIVITY_CACHE_TTL)
    _track_cache_key(ACTIVITY_KEYS_KEY, cache_key)
    return Response(data)


MONTHLY_CACHE_KEY = 'reports_monthly_usage'
MONTHLY_CACHE_TTL = 60

VALID_CATEGORIES = frozenset(['electronics', 'mechanical', 'tools', 'consumables'])


@api_view(['GET'])
def monthly_usage(request):
    """
    Return 12 months of borrow-event counts grouped by item category.
    Response: [{month: "Apr 2025", electronics: 3, mechanical: 1, tools: 0, consumables: 2}, ...]
    """
    cached = cache.get(MONTHLY_CACHE_KEY)
    if cached is not None:
        return Response(cached)

    now = timezone.now().date()
    start = (now.replace(day=1) - relativedelta(months=11))

    borrows = (
        BorrowedItem.objects
        .filter(borrow_date__gte=start)
        .select_related('item')
    )

    empty_bucket = lambda: {'electronics': 0, 'mechanical': 0, 'tools': 0, 'consumables': 0}
    buckets: dict[str, dict[str, int]] = defaultdict(empty_bucket)

    for b in borrows:
        key = b.borrow_date.strftime('%Y-%m')
        cat = (b.item.category or '').lower()
        if cat in VALID_CATEGORIES:
            buckets[key][cat] += b.quantity

    months = []
    cursor = start
    while cursor <= now.replace(day=1):
        key = cursor.strftime('%Y-%m')
        label = cursor.strftime('%b %Y')
        row = {'month': label, **buckets.get(key, empty_bucket())}
        months.append(row)
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)

    cache.set(MONTHLY_CACHE_KEY, months, MONTHLY_CACHE_TTL)
    return Response(months)


LEADERBOARD_CACHE_KEY = 'reports_borrow_leaderboard'
LEADERBOARD_CACHE_TTL = 60


@api_view(['GET'])
def borrow_leaderboard(request):
    """
    All-time borrow activity aggregated from BorrowedItem rows (DB source of truth).
    Query: ?limit=10 (max 50)
    """
    try:
        limit = max(1, min(int(request.query_params.get('limit', '10')), 50))
    except (ValueError, TypeError):
        limit = 10

    cache_key = f'{LEADERBOARD_CACHE_KEY}:{limit}'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    rows = (
        BorrowedItem.objects
        .values('item_id', 'item__name', 'item__category')
        .annotate(borrow_events=Count('id'), units_lent=Sum('quantity'))
        .order_by('-units_lent', '-borrow_events', 'item__name')[:limit]
    )

    data = [
        {
            'itemId': str(r['item_id']),
            'name': r['item__name'] or '',
            'category': r['item__category'] or '',
            'borrowEvents': r['borrow_events'],
            'unitsLent': r['units_lent'] or 0,
        }
        for r in rows
    ]
    cache.set(cache_key, data, LEADERBOARD_CACHE_TTL)
    return Response(data)
