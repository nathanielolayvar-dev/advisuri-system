from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.contrib.auth import get_user_model
from datetime import date

# Create your models here.
class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('teacher', 'Teacher'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')
# This helps link your Django user to Supabase Auth if needed later
    supabase_id = models.CharField(max_length=255, unique=True, null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

class Group(models.Model):
    name = models.CharField(max_length=255)
    course = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    # Use the User model defined at the top of your file
    members = models.ManyToManyField(User, related_name="chat_groups")

    def __str__(self):
        return self.name

class TaskNote(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Existing author field using settings.AUTH_USER_MODEL
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="notes"
    )

    #Link to Group model
    # null=True, blank=True allows existing notes to remain without a group initially
    group = models.ForeignKey(
        'Group', # Use the name of group model
        on_delete=models.CASCADE, 
        related_name="group_notes",
        null=True, 
        blank=True
    )

    def __str__(self):
        #return f"{self.title} - {self.author.username}"
        # This makes it show "Note Title (Group Name)" in the Django Admin
        group_name = self.group.name if self.group else "No Group"
        return f"{self.title} - {group_name}"
    
class Task(models.Model):
    task_name = models.CharField(max_length=200)
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    progress_percentage = models.IntegerField(default=0)
    hex_color = models.CharField(max_length=7, default="#2563EB") # Default Blue
    group = models.ForeignKey('Group', on_delete=models.CASCADE, related_name="tasks")

    def __str__(self):
        return self.task_name

    @property
    def duration_days(self):
        # Calculates the difference between dates (adding 1 to be inclusive)
        return (self.end_date - self.start_date).days + 1

class Message(models.Model):
    # Link to the user who sent it
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    # Link to the group where the message was sent
    group = models.ForeignKey(
        'Group', 
        on_delete=models.CASCADE, 
        related_name='chat_messages'
    )
    # The actual chat text
    text = models.TextField()
    # Auto-set the time when created
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at'] # Ensures messages appear in order

    def __str__(self):
        return f"{self.author.username}: {text[:20]}"

def document_file_path(instance, filename):
    """Generate file path for new document"""
    group_id = instance.group.id if instance.group else 'temp'
    return f'documents/group_{group_id}/{filename}'

class Document(models.Model):
    DOCUMENT_TYPES = (
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('code', 'Code'),
        ('doc', 'Document'),
        ('image', 'Image'),
        ('other', 'Other'),
    )
    
    group = models.ForeignKey(
        'Group', 
        on_delete=models.CASCADE, 
        related_name='documents'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='uploaded_documents'
    )
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to=document_file_path)
    file_type = models.CharField(max_length=10, choices=DOCUMENT_TYPES, default='other')
    file_size = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
