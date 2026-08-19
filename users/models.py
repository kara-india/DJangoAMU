from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (('ADMIN','Admin'),('MANAGER','Manager'),('USER','User'))
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='USER')
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='team_members')
    name = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return self.username
