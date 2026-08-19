import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):
    initial=True
    dependencies=[migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations=[migrations.CreateModel(name='Task',fields=[
        ('id',models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name='ID')),
        ('title',models.CharField(max_length=200)),
        ('description',models.TextField(blank=True)),
        ('assigned_to',models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name='tasks',to=settings.AUTH_USER_MODEL)),
        ('status',models.CharField(choices=[('TODO','To Do'),('IN_PROGRESS','In Progress'),('DONE','Done')],default='TODO',max_length=20)),
        ('created_at',models.DateTimeField(auto_now_add=True)),
        ('updated_at',models.DateTimeField(auto_now=True)),])]
