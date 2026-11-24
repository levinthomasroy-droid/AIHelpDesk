
from rest_framework import serializers
from .models import Ticket


class TicketSerializer(serializers.ModelSerializer):

    created_by_username = serializers.ReadOnlyField(
        source='created_by.username'
    )

    assigned_to_username = serializers.ReadOnlyField(
        source='assigned_to.username'
    )

    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = (
            'created_by',
            'created_at',
            'updated_at',
        )
