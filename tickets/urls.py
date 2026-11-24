
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import TicketViewSet, AIAssistantView

router = DefaultRouter()

router.register(
    r'tickets',
    TicketViewSet,
    basename='ticket'
)

urlpatterns = [
    path('', include(router.urls)),
    path('ai-assistant/', AIAssistantView.as_view(), name='ai-assistant'),
]
