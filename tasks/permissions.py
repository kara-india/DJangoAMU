from rest_framework.permissions import BasePermission

class IsAdminOrManager(BasePermission):
    message = 'Only Admin or Manager can create tasks.'
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ('ADMIN','MANAGER'))
