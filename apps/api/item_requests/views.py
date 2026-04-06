from datetime import timedelta

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from activity.models import ActivityEntry
from borrowed.models import BorrowedItem
from inventory.models import InventoryItem
from .models import ItemRequest
from .serializers import ItemRequestSerializer

VALID_TRANSITIONS = {
    'Pending': {'Approved', 'Rejected'},
    'Approved': {'Issued', 'Rejected'},
}


def _add_activity(activity_type, description, user='Admin'):
    ActivityEntry.objects.create(type=activity_type, description=description, user=user)


def _invalidate_caches():
    cache.delete('reports_monthly_usage')
    if hasattr(cache, 'delete_pattern'):
        cache.delete_pattern('reports_borrow_leaderboard:*')
        for prefix in ('inv_list', 'activity_list'):
            cache.delete_pattern(f'{prefix}:*')
    else:
        for n in range(1, 51):
            cache.delete(f'reports_borrow_leaderboard:{n}')
        for keys_key in ('inv_list:__keys__', 'activity_list:__keys__'):
            keys = cache.get(keys_key, [])
            for key in keys:
                cache.delete(key)
            cache.delete(keys_key)


@api_view(['GET', 'POST'])
def request_list(request):
    if request.method == 'GET':
        qs = ItemRequest.objects.select_related('item').all()
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)

        ordering = request.query_params.get('ordering', '').strip()
        ALLOWED_ORDERINGS = {'request_date', '-request_date', 'status', '-status', 'requested_qty', '-requested_qty'}
        if ordering and ordering in ALLOWED_ORDERINGS:
            qs = qs.order_by(ordering)

        serializer = ItemRequestSerializer(qs, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = ItemRequestSerializer(data=request.data)
        if serializer.is_valid():
            req = serializer.save(status='Pending')
            _add_activity(
                'requested',
                f'{req.item.name} (x{req.requested_qty}) requested by {req.requested_by}',
                user=req.requested_by,
            )
            _invalidate_caches()
            return Response(ItemRequestSerializer(req).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
def request_detail(request, pk):
    try:
        req = ItemRequest.objects.select_related('item').get(pk=pk)
    except ItemRequest.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ItemRequestSerializer(req).data)

    new_status = request.data.get('status')
    if not new_status or new_status not in ('Pending', 'Approved', 'Rejected', 'Issued'):
        return Response(
            {'detail': 'Must be one of: Pending, Approved, Rejected, Issued.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        req = ItemRequest.objects.select_for_update().select_related('item').get(pk=pk)

        allowed = VALID_TRANSITIONS.get(req.status, set())
        if new_status not in allowed:
            return Response(
                {'detail': f'Cannot transition from {req.status} to {new_status}.'},
                status=status.HTTP_409_CONFLICT,
            )

        if new_status == 'Issued':
            item = InventoryItem.objects.select_for_update().get(pk=req.item_id)
            if item.quantity < req.requested_qty:
                return Response(
                    {'detail': 'Insufficient inventory for this request.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            item.quantity -= req.requested_qty
            item.save(update_fields=['quantity'])

            BorrowedItem.objects.create(
                item=item,
                quantity=req.requested_qty,
                borrowed_by=req.requested_by,
                borrow_date=timezone.now().date(),
                expected_return_date=timezone.now().date() + timedelta(days=14),
                status='Active',
            )
            _add_activity(
                'issued',
                f'{item.name} (x{req.requested_qty}) issued to {req.requested_by}',
                user=req.requested_by,
            )
        elif new_status == 'Approved':
            _add_activity('approved', f'{req.item.name} request approved for {req.requested_by}')
        elif new_status == 'Rejected':
            _add_activity('rejected', f'{req.item.name} request rejected for {req.requested_by}')

        req.status = new_status
        req.save(update_fields=['status'])

    _invalidate_caches()
    req.refresh_from_db()
    return Response(ItemRequestSerializer(req).data)
