"""
Django management command to seed mock data for testing the Groups functionality.

Usage:
    python manage.py seed_mock_data

This creates:
    - 3 Mock Users (1 Teacher, 2 Students)
    - 2 Mock Groups with users as members
    - 1 Task and 1 Message per group
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Group, Task, Message
from datetime import date, timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds mock data for testing Groups functionality'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting mock data seeding...'))
        
        # Clean up existing data
        self._cleanup()
        
        # Create users
        users = self._create_users()
        self.stdout.write(self.style.SUCCESS(f'Created {len(users)} users'))
        
        # Create groups
        groups = self._create_groups(users)
        self.stdout.write(self.style.SUCCESS(f'Created {len(groups)} groups'))
        
        # Create tasks and messages
        self._create_tasks(groups, users)
        self._create_messages(groups, users)
        self.stdout.write(self.style.SUCCESS('Created tasks and messages'))
        
        self.stdout.write(self.style.SUCCESS('\nMock data seeding completed!'))
        self._print_summary(users, groups)

    def _cleanup(self):
        """Clean up existing data"""
        self.stdout.write('Cleaning up existing data...')
        Message.objects.all().delete()
        Task.objects.all().delete()
        Group.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    def _create_users(self):
        """Create mock users"""
        users_data = [
            {
                'username': 'teacher_john',
                'email': 'john@school.edu',
                'password': 'testpass123',
                'first_name': 'John',
                'last_name': 'Smith',
                'role': 'teacher'
            },
            {
                'username': 'student_alice',
                'email': 'alice@school.edu',
                'password': 'testpass123',
                'first_name': 'Alice',
                'last_name': 'Johnson',
                'role': 'student'
            },
            {
                'username': 'student_bob',
                'email': 'bob@school.edu',
                'password': 'testpass123',
                'first_name': 'Bob',
                'last_name': 'Williams',
                'role': 'student'
            },
        ]
        
        users = []
        for data in users_data:
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                role=data['role']
                # supabase_id remains null for Django-only testing
            )
            users.append(user)
            self.stdout.write(f'  Created user: {user.username} ({user.role})')
        
        return users

    def _create_groups(self, users):
        """Create mock groups with members"""
        teacher = users[0]
        students = users[1:]
        
        groups_data = [
            {
                'name': 'Advanced Mathematics',
                'course': 'MATH401',
                'members': [teacher] + students,
                'description': 'Advanced calculus and linear algebra'
            },
            {
                'name': 'Introduction to Programming',
                'course': 'CS101',
                'members': [teacher] + students,
                'description': 'Learn Python programming basics'
            },
        ]
        
        groups = []
        for data in groups_data:
            group = Group.objects.create(
                name=data['name'],
                course=data['course']
            )
            # Add members
            for member in data['members']:
                group.members.add(member)
            groups.append(group)
            self.stdout.write(f'  Created group: {group.name} with {len(data["members"])} members')
        
        return groups

    def _create_tasks(self, groups, users):
        """Create one task per group"""
        task_templates = [
            {
                'task_name': 'Complete Chapter 5 Exercises',
                'days_from_now_start': 0,
                'days_from_now_end': 7,
                'progress': 0,
                'color': '#2563EB'
            },
            {
                'task_name': 'Submit Final Project',
                'days_from_now_start': 14,
                'days_from_now_end': 21,
                'progress': 25,
                'color': '#7C3AED'
            },
        ]
        
        students = users[1:]  # Use students as assignees
        
        for i, group in enumerate(groups):
            template = task_templates[i % len(task_templates)]
            start_date = date.today() + timedelta(days=template['days_from_now_start'])
            end_date = date.today() + timedelta(days=template['days_from_now_end'])
            
            task = Task.objects.create(
                task_name=template['task_name'],
                assignee=random.choice(students),  # Random student as assignee
                start_date=start_date,
                end_date=end_date,
                progress_percentage=template['progress'],
                hex_color=template['color'],
                group=group
            )
            self.stdout.write(f'  Created task: {task.task_name} for {group.name}')

    def _create_messages(self, groups, users):
        """Create one message per group"""
        message_templates = [
            {
                'text': 'Welcome to Advanced Mathematics! Please review the syllabus before our first class.',
            },
            {
                'text': 'Don\'t forget to install Python 3.9+ on your computers before our next session.',
            },
        ]
        
        teacher = users[0]
        
        for i, group in enumerate(groups):
            template = message_templates[i % len(message_templates)]
            message = Message.objects.create(
                author=teacher,
                group=group,
                text=template['text']
            )
            self.stdout.write(f'  Created message in {group.name}: "{template["text"][:50]}..."')

    def _print_summary(self, users, groups):
        """Print summary of created data"""
        self.stdout.write(self.style.SUCCESS('\n' + '='*50))
        self.stdout.write(self.style.SUCCESS('SUMMARY'))
        self.stdout.write(self.style.SUCCESS('='*50))
        self.stdout.write(f'Users: {len(users)}')
        for user in users:
            self.stdout.write(f'  - {user.username} ({user.role})')
        self.stdout.write(f'Groups: {len(groups)}')
        for group in groups:
            self.stdout.write(f'  - {group.name} ({group.course})')
        self.stdout.write(f'Tasks: {Task.objects.count()}')
        self.stdout.write(f'Messages: {Message.objects.count()}')
        self.stdout.write(self.style.SUCCESS('='*50))
