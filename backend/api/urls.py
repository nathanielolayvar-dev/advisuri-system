from django.urls import path
from . import views
from .views import NoteListCreate, NoteDelete, CreateUserView, get_user_profile, google_auth #for the google authentication

urlpatterns = [
    path("notes/", views.NoteListCreate.as_view(), name="note-list"),
    path("notes/delete/<int:pk>/", views.NoteDelete.as_view(), name="delete-note"), 
    path("user/register/", CreateUserView.as_view(), name="register"),
    path("user/profile/", get_user_profile, name="user_profile"),
    # This is the endpoint for backend
    path('auth/google/', google_auth, name='google_auth'),
]