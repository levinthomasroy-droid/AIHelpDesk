from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.chat, name='ai-chat'),
    path('history/', views.chat_history, name='ai-chat-history'),
    path('clear/', views.clear_chat_history, name='ai-chat-clear'),
]