
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Ticket
from .serializers import TicketSerializer
from .ai_service import generate_ai_response


class TicketViewSet(viewsets.ModelViewSet):

    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser or user.role == 'ADMIN':
            return Ticket.objects.all()

        if user.role == 'TECHNICIAN':
            return Ticket.objects.filter(assigned_to=user)

        return Ticket.objects.filter(created_by=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AIAssistantView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        title = request.data.get('title', '').strip()
        description = request.data.get('description', '').strip()

        if not title or not description:
            return Response(
                {
                    'error': 'Title and description are required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        prompt = f"""
        You are an intelligent IT HelpDesk assistant.

        Analyze the following support ticket.

        Title: {title}
        Description: {description}

        Provide:
        1. Suggested category: HARDWARE, SOFTWARE, NETWORK, ACCOUNT or OTHER.
        2. Suggested priority: LOW, MEDIUM, HIGH or CRITICAL.
        3. Possible cause of the issue.
        4. Recommended troubleshooting steps.
        5. Suggested solution.

        Explain clearly using simple language.
        Do not claim that the issue has been fixed.
        """

        ai_response = generate_ai_response(prompt)

        return Response({
            'success': True,
            'title': title,
            'ai_analysis': ai_response
        })
