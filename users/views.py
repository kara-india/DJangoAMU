from django.db.models import Q
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User
from .permissions import IsAdmin
from .serializers import UserSerializer

class RegisterView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        u=request.user
        return Response({'id':u.id,'username':u.username,'name':u.name,'email':u.email,'role':u.role,'manager':u.manager.username if u.manager else None})

class UserListView(generics.ListAPIView):
    serializer_class=UserSerializer
    permission_classes=[IsAuthenticated]
    def get_queryset(self):
        u=self.request.user
        if u.role=='ADMIN': return User.objects.all().select_related('manager')
        if u.role=='MANAGER': return User.objects.filter(Q(manager=u)|Q(id=u.id)).select_related('manager')
        return User.objects.filter(id=u.id)

class UserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class=UserSerializer
    permission_classes=[IsAuthenticated]
    def get_queryset(self):
        u=self.request.user
        if u.role=='ADMIN': return User.objects.all()
        if u.role=='MANAGER': return User.objects.filter(Q(manager=u)|Q(id=u.id))
        return User.objects.filter(id=u.id)

class UserDeleteView(generics.DestroyAPIView):
    queryset=User.objects.all(); serializer_class=UserSerializer; permission_classes=[IsAdmin]
