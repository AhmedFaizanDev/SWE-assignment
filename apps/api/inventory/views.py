from django.core.cache import cache
from django.db import models
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from activity.models import ActivityEntry
from suppliers.models import Supplier
from .models import InventoryItem
from .serializers import InventoryItemSerializer

INVENTORY_CACHE_PREFIX = 'inv_list'
INVENTORY_CACHE_TTL = 30
INVENTORY_KEYS_KEY = f'{INVENTORY_CACHE_PREFIX}:__keys__'


ACTIVITY_CACHE_PREFIX = 'activity_list'
ACTIVITY_KEYS_KEY = f'{ACTIVITY_CACHE_PREFIX}:__keys__'


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


def _invalidate_inventory_cache():
    if hasattr(cache, 'delete_pattern'):
        for prefix in (INVENTORY_CACHE_PREFIX, ACTIVITY_CACHE_PREFIX):
            cache.delete_pattern(f'{prefix}:*')
    else:
        _delete_cached_keys(INVENTORY_KEYS_KEY)
        _delete_cached_keys(ACTIVITY_KEYS_KEY)


@api_view(['GET', 'POST'])
def inventory_list(request):
    if request.method == 'GET':
        q = request.query_params.get('q', '').strip()
        category = request.query_params.get('category', '').strip()
        ordering = request.query_params.get('ordering', '').strip()
        cache_key = f'{INVENTORY_CACHE_PREFIX}:{q}:{category}:{ordering}'

        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        qs = InventoryItem.objects.select_related('supplier').all()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(category__icontains=q) | Q(location__icontains=q))
        if category:
            qs = qs.filter(category=category)

        ALLOWED_ORDERINGS = {'name', '-name', 'category', '-category', 'quantity', '-quantity', 'unit_price', '-unit_price'}
        if ordering and ordering in ALLOWED_ORDERINGS:
            qs = qs.order_by(ordering)

        data = InventoryItemSerializer(qs, many=True).data
        cache.set(cache_key, data, INVENTORY_CACHE_TTL)
        _track_cache_key(INVENTORY_KEYS_KEY, cache_key)
        return Response(data)

    elif request.method == 'POST':
        serializer = InventoryItemSerializer(data=request.data)
        if serializer.is_valid():
            supplier_name = request.data.get('supplier', '')
            supplier = None
            if supplier_name:
                supplier = Supplier.objects.filter(name=supplier_name).first()
                if supplier is None:
                    return Response(
                        {'supplier': [f'Supplier "{supplier_name}" not found.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            item = serializer.save(supplier=supplier)
            ActivityEntry.objects.create(
                type='restocked',
                description=f'{item.name} added to inventory ({item.quantity} units)',
                user='Admin',
            )
            _invalidate_inventory_cache()
            return Response(InventoryItemSerializer(item).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
def inventory_detail(request, pk):
    try:
        item = InventoryItem.objects.select_related('supplier').get(pk=pk)
    except InventoryItem.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(InventoryItemSerializer(item).data)
    elif request.method == 'PATCH':
        serializer = InventoryItemSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            supplier_name = request.data.get('supplier')
            if supplier_name is not None:
                if supplier_name:
                    supplier = Supplier.objects.filter(name=supplier_name).first()
                    if supplier is None:
                        return Response(
                            {'supplier': [f'Supplier "{supplier_name}" not found.']},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    supplier = None
                item = serializer.save(supplier=supplier)
            else:
                item = serializer.save()
            _invalidate_inventory_cache()
            return Response(InventoryItemSerializer(item).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        try:
            item.delete()
        except models.ProtectedError:
            return Response(
                {'detail': 'Cannot delete: this item has related request or borrow history.'},
                status=status.HTTP_409_CONFLICT,
            )
        _invalidate_inventory_cache()
        return Response(status=status.HTTP_204_NO_CONTENT)
