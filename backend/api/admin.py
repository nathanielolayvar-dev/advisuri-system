from django.contrib import admin
from .models import Message, Task, TaskNote, User

# Register your models here.
@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('author', 'group', 'text', 'created_at')
    list_filter = ('group', 'author')