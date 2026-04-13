from django.contrib import admin
from .models import Message, Group, User, Task, TaskNote

# Register your models here.
@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('author', 'group', 'text', 'created_at')
    list_filter = ('group', 'author')

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    # This will let you see the supabase_id in the admin list
    list_display = ('username', 'email', 'role', 'supabase_id')
    search_fields = ('email', 'supabase_id')

@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'id')
    # This creates a nice UI to manage which users are in which group
    filter_horizontal = ('members',)