from django.urls import path
from .views import MeView, RegisterView, UserDeleteView, UserDetailView, UserListView
urlpatterns=[path('register/',RegisterView.as_view()),path('me/',MeView.as_view()),path('users/',UserListView.as_view()),path('users/<int:pk>/',UserDetailView.as_view()),path('users/<int:pk>/delete/',UserDeleteView.as_view())]
