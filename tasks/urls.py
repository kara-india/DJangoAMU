from django.urls import path
from .views import TaskDetailView, TaskListCreateView
urlpatterns=[path('tasks/',TaskListCreateView.as_view()),path('tasks/<int:pk>/',TaskDetailView.as_view())]
