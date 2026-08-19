from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'assigned_to', 'assigned_to_name', 'status', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'assigned_to_name']

    def get_assigned_to_name(self, obj):
        user = obj.assigned_to
        return user.name or user.username

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'USER':
            self.fields['assigned_to'].read_only = True
