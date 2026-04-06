from django.core.cache import cache
from django.db import IntegrityError
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Supplier
from .serializers import SupplierSerializer

SUPPLIERS_CACHE_KEY = 'suppliers_list'
SUPPLIERS_CACHE_TTL = 60
INVENTORY_CACHE_PREFIX = 'inv_list'
SUPPLIERS_KEYS_KEY = f'{SUPPLIERS_CACHE_KEY}:__keys__'
INVENTORY_KEYS_KEY = f'{INVENTORY_CACHE_PREFIX}:__keys__'


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


def _invalidate_suppliers_cache():
    if hasattr(cache, 'delete_pattern'):
        cache.delete_pattern(f'{SUPPLIERS_CACHE_KEY}:*')
        cache.delete_pattern(f'{INVENTORY_CACHE_PREFIX}:*')
    else:
        _delete_cached_keys(SUPPLIERS_KEYS_KEY)
        _delete_cached_keys(INVENTORY_KEYS_KEY)


@api_view(['GET', 'POST'])
def supplier_list(request):
    if request.method == 'GET':
        q = request.query_params.get('q', '').strip()
        ordering = request.query_params.get('ordering', '').strip()
        cache_key = f'{SUPPLIERS_CACHE_KEY}:{q}:{ordering}'

        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        qs = Supplier.objects.all()
        if q:
            from django.db.models import Q
            qs = qs.filter(Q(name__icontains=q) | Q(contact_person__icontains=q) | Q(email__icontains=q))

        ALLOWED_ORDERINGS = {'name', '-name', 'rating', '-rating', 'total_orders', '-total_orders'}
        if ordering and ordering in ALLOWED_ORDERINGS:
            qs = qs.order_by(ordering)

        data = SupplierSerializer(qs, many=True).data
        cache.set(cache_key, data, SUPPLIERS_CACHE_TTL)
        _track_cache_key(SUPPLIERS_KEYS_KEY, cache_key)
        return Response(data)

    elif request.method == 'POST':
        serializer = SupplierSerializer(data=request.data)
        if serializer.is_valid():
            try:
                serializer.save()
            except IntegrityError:
                return Response(
                    {'detail': 'A supplier with this name already exists.'},
                    status=status.HTTP_409_CONFLICT,
                )
            _invalidate_suppliers_cache()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
def supplier_detail(request, pk):
    try:
        supplier = Supplier.objects.get(pk=pk)
    except Supplier.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(SupplierSerializer(supplier).data)
    elif request.method == 'PATCH':
        serializer = SupplierSerializer(supplier, data=request.data, partial=True)
        if serializer.is_valid():
            try:
                serializer.save()
            except IntegrityError:
                return Response(
                    {'detail': 'A supplier with this name already exists.'},
                    status=status.HTTP_409_CONFLICT,
                )
            _invalidate_suppliers_cache()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        supplier.delete()
        _invalidate_suppliers_cache()
        return Response(status=status.HTTP_204_NO_CONTENT)
