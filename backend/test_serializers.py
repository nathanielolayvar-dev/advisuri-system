"""
Test script to verify GroupSerializer member_details field.

This script tests that when fetching a Group, the member_details field
correctly returns the list of user objects.

Usage:
    python test_serializers.py

Prerequisites:
    Run `python manage.py seed_mock_data` first to create test data.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from api.models import Group
from api.serializers import GroupSerializer, UserSerializer


def test_group_serializer():
    """Test that GroupSerializer returns correct member_details"""
    print("=" * 60)
    print("Testing GroupSerializer - member_details field")
    print("=" * 60)
    
    # Get all groups
    groups = Group.objects.prefetch_related('members').all()
    
    if not groups:
        print("\n❌ No groups found. Please run `python manage.py seed_mock_data` first.")
        return False
    
    print(f"\nFound {groups.count()} groups:\n")
    
    all_tests_passed = True
    
    for group in groups:
        print(f"Group: {group.name} ({group.course})")
        print("-" * 40)
        
        # Serialize the group
        serializer = GroupSerializer(group)
        serialized_data = serializer.data
        
        print(f"  ID: {serialized_data['id']}")
        print(f"  Name: {serialized_data['name']}")
        print(f"  Course: {serialized_data['course']}")
        print(f"  Created At: {serialized_data['created_at']}")
        
        # Check members
        members = serialized_data.get('members', [])
        member_details = serialized_data.get('member_details', [])
        
        print(f"\n  Members (IDs): {members}")
        print(f"  Member Details: {member_details}")
        
        # Test validations
        tests = [
            ('Has members list', len(members) > 0),
            ('Has member_details list', len(member_details) > 0),
            ('Member details is a list', isinstance(member_details, list)),
            ('Each member_detail has id', all('id' in m for m in member_details)),
            ('Each member_detail has username', all('username' in m for m in member_details)),
            ('Number of members matches', len(members) == len(member_details)),
        ]
        
        print("\n  Test Results:")
        for test_name, passed in tests:
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"    {status}: {test_name}")
            if not passed:
                all_tests_passed = False
        
        # Verify member objects
        db_members = list(group.members.all())
        print(f"\n  Database Members:")
        for member in db_members:
            print(f"    - ID: {member.id}, Username: {member.username}, Role: {member.role}")
        
        # Verify member_details matches database
        detail_usernames = [m['username'] for m in member_details]
        db_usernames = [m.username for m in db_members]
        if set(detail_usernames) == set(db_usernames):
            print(f"\n  ✓ member_details usernames match database")
        else:
            print(f"\n  ✗ member_details usernames DO NOT match database")
            all_tests_passed = False
        
        print("\n" + "=" * 60)
    
    return all_tests_passed


def test_user_serializer():
    """Test UserSerializer"""
    print("\n" + "=" * 60)
    print("Testing UserSerializer")
    print("=" * 60)
    
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    users = User.objects.all()
    
    if not users:
        print("\n❌ No users found. Please run `python manage.py seed_mock_data` first.")
        return False
    
    print(f"\nFound {users.count()} users:\n")
    
    all_tests_passed = True
    
    for user in users:
        serializer = UserSerializer(user)
        serialized_data = serializer.data
        
        print(f"User: {user.username}")
        print(f"  ID: {serialized_data['id']}")
        print(f"  Username: {serialized_data['username']}")
        print(f"  Email: {serialized_data.get('email', 'N/A')}")
        print(f"  Role: {serialized_data.get('role', 'N/A')}")
        print(f"  Supabase ID: {serialized_data.get('supabase_id', 'NULL')}")
        print()
        
        # Test validations
        tests = [
            ('Has id', 'id' in serialized_data),
            ('Has username', 'username' in serialized_data),
            ('Has role', 'role' in serialized_data or 'role' in serialized_data),
        ]
        
        for test_name, passed in tests:
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"  {status}: {test_name}")
            if not passed:
                all_tests_passed = False
        
        print()
    
    return all_tests_passed


def print_model_relationships():
    """Print the model relationships for reference"""
    print("\n" + "=" * 60)
    print("MODEL RELATIONSHIPS")
    print("=" * 60)
    print("""
User (AbstractUser)
├── role: CharField ('student' or 'teacher')
├── supabase_id: CharField (null for Django-only testing)
└── groups (ManyToManyField to Group, via 'members')

Group
├── name: CharField
├── course: CharField (optional)
├── created_at: DateTimeField
└── members (ManyToManyField to User)

Task
├── task_name: CharField
├── assignee: ForeignKey to User
├── start_date: DateField
├── end_date: DateField
├── progress_percentage: IntegerField
├── hex_color: CharField
└── group: ForeignKey to Group

Message
├── author: ForeignKey to User
├── group: ForeignKey to Group
├── text: TextField
└── created_at: DateTimeField
""")


def main():
    """Main test runner"""
    print("\n" + "=" * 60)
    print("DJANGO SERIALIZER TEST SUITE")
    print("=" * 60)
    print("\nThis script tests the GroupSerializer and UserSerializer")
    print("to verify member_details field returns correct data.\n")
    
    # Print model relationships
    print_model_relationships()
    
    # Run tests
    group_tests_passed = test_group_serializer()
    user_tests_passed = test_user_serializer()
    
    # Summary
    print("=" * 60)
    print("FINAL RESULTS")
    print("=" * 60)
    
    if group_tests_passed and user_tests_passed:
        print("\n✓ ALL TESTS PASSED!")
        print("\nThe GroupSerializer correctly returns:")
        print("  - members (list of IDs)")
        print("  - member_details (list of user objects with id and username)")
        return 0
    else:
        print("\n✗ SOME TESTS FAILED!")
        print("Please check the output above for details.")
        return 1


if __name__ == '__main__':
    sys.exit(main())
