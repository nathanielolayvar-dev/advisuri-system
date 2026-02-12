from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'messages', views.MessageViewSet, basename='message')
router.register(r'groups', views.GroupViewSet, basename='group')

urlpatterns = [
    path("notes/", views.NoteListCreate.as_view(), name="note-list"),
    path("notes/delete/<int:pk>/", views.NoteDelete.as_view(), name="delete-note"), 
    path("tasks/", views.TaskListCreate.as_view(), name="task-list"),
    path("user/profile/", views.get_user_profile, name="user_profile"),
    path("documents/", views.DocumentListCreate.as_view(), name="document-list"),
    path("documents/delete/<int:pk>/", views.DocumentDelete.as_view(), name="delete-document"),
    path("", include(router.urls)),
]
