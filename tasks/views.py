from django.db.models import Q
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from .models import Task
from .permissions import IsAdminOrManager
from .serializers import TaskSerializer

class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    def get_permissions(self):
        return [IsAuthenticated(), IsAdminOrManager()] if self.request.method == 'POST' else [IsAuthenticated()]
    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN': return Task.objects.select_related('assigned_to').all()
        if user.role == 'MANAGER': return Task.objects.select_related('assigned_to').filter(Q(assigned_to=user) | Q(assigned_to__manager=user))
        return Task.objects.select_related('assigned_to').filter(assigned_to=user)
    def perform_create(self, serializer):
        user = self.request.user
        assigned = serializer.validated_data['assigned_to']
        if user.role == 'MANAGER' and assigned != user and assigned.manager_id != user.id:
            raise PermissionDenied('You can only assign tasks to your team members.')
        serializer.save()

class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN': return Task.objects.select_related('assigned_to').all()
        if user.role == 'MANAGER': return Task.objects.select_related('assigned_to').filter(Q(assigned_to=user) | Q(assigned_to__manager=user))
        return Task.objects.select_related('assigned_to').filter(assigned_to=user)
    def update(self, request, *args, **kwargs):
        user = request.user
        if user.role == 'USER' and not set(request.data.keys()).issubset({'title','description','status'}):
            raise PermissionDenied('You can only update task details and status.')
        if user.role == 'MANAGER' and 'assigned_to' in request.data:
            try: target = __import__('users.models', fromlist=['User']).User.objects.get(pk=request.data['assigned_to'])
            except Exception: raise PermissionDenied('Invalid assignee.')
            if target != user and target.manager_id != user.id: raise PermissionDenied('You can only assign tasks to your team members.')
        return super().update(request, *args, **kwargs)
    def destroy(self, request, *args, **kwargs):
        if request.user.role not in ('ADMIN','MANAGER'): raise PermissionDenied('You cannot delete tasks.')
        return super().destroy(request, *args, **kwargs)
