from datetime import datetime

from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from activity.models import ActivityEntry
from inventory.models import InventoryItem
from .models import BorrowedItem
from .serializers import BorrowedItemSerializer


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


@api_view(['GET'])
def borrowed_list(request):
    qs = BorrowedItem.objects.select_related('item').all()
    status_filter = request.query_params.get('status', '').strip()
    if status_filter:
        if status_filter == 'Overdue':
            today = timezone.now().date()
            qs = qs.filter(
                Q(status='Overdue') |
                Q(status='Active', expected_return_date__lt=today)
            )
        else:
            qs = qs.filter(status=status_filter)

    ordering = request.query_params.get('ordering', '').strip()
    ALLOWED_ORDERINGS = {'borrow_date', '-borrow_date', 'expected_return_date', '-expected_return_date', 'status', '-status'}
    if ordering and ordering in ALLOWED_ORDERINGS:
        qs = qs.order_by(ordering)

    serializer = BorrowedItemSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PATCH'])
def borrowed_detail(request, pk):
    try:
        borrowed = BorrowedItem.objects.select_related('item').get(pk=pk)
    except BorrowedItem.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(BorrowedItemSerializer(borrowed).data)

    action = request.data.get('action')
    expected_return_date = request.data.get('expectedReturnDate')

    if action == 'return':
        if borrowed.status == 'Returned':
            return Response(
                {'detail': 'This item has already been returned.'},
                status=status.HTTP_409_CONFLICT,
            )
        with transaction.atomic():
            borrowed = BorrowedItem.objects.select_for_update().get(pk=pk)
            if borrowed.status == 'Returned':
                return Response(
                    {'detail': 'This item has already been returned.'},
                    status=status.HTTP_409_CONFLICT,
                )
            borrowed.status = 'Returned'
            borrowed.actual_return_date = timezone.now().date()
            borrowed.save(update_fields=['status', 'actual_return_date'])

            item = InventoryItem.objects.select_for_update().get(pk=borrowed.item_id)
            item.quantity += borrowed.quantity
            item.save(update_fields=['quantity'])

            _add_activity(
                'returned',
                f'{borrowed.item.name} returned by {borrowed.borrowed_by}',
                user=borrowed.borrowed_by,
            )
        _invalidate_caches()
    elif expected_return_date:
        try:
            new_date = datetime.strptime(expected_return_date, '%Y-%m-%d').date()
            if new_date < timezone.now().date():
                return Response(
                    {'expectedReturnDate': ['Date cannot be in the past.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            borrowed.expected_return_date = new_date
            borrowed.save(update_fields=['expected_return_date'])
        except ValueError:
            return Response(
                {'expectedReturnDate': ['Invalid date format. Use YYYY-MM-DD.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        return Response(
            {'detail': 'Provide action=return or expectedReturnDate.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    borrowed.refresh_from_db()
    return Response(BorrowedItemSerializer(borrowed).data)
