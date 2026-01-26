from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import NoteListCreate, NoteDelete, CreateUserView, get_user_profile, google_auth, MessageViewSet #for the google authentication

#Initialize the router
router = DefaultRouter()
#Register the messages endpoint
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path("notes/", views.NoteListCreate.as_view(), name="note-list"),
    path("notes/delete/<int:pk>/", views.NoteDelete.as_view(), name="delete-note"), 
    path("user/register/", CreateUserView.as_view(), name="register"),
    path("user/profile/", get_user_profile, name="user_profile"),
    path("users/", views.UserListView.as_view(), name="user-list"),
    # This is the google endpoint for backend
    path('auth/google/', google_auth, name='google_auth'),
    
    #Include the router URLs
    path("", include(router.urls)),
]