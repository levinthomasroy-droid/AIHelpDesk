
import requests

from django.db import transaction

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import ChatMessage


SYSTEM_PROMPT = """
You are a professional AI IT HelpDesk Assistant.

Your responsibilities:
1. Identify and troubleshoot IT problems.
2. Provide clear step-by-step solutions.
3. Help with Windows, Linux, networking,
   software, hardware and security issues.
4. Ask questions when information is missing.
5. Explain technical concepts in simple language.
6. Never invent technical information.
7. Warn users before potentially risky operations.
8. Never request passwords or private credentials.

Always respond professionally and helpfully.
"""


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat(request):

    message = request.data.get('message', '').strip()

    if not message:
        return Response(
            {'error': 'Message cannot be empty.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = request.user

    # Retrieve recent conversation history for this user
    history = ChatMessage.objects.filter(
        user=user
    ).order_by('-created_at')[:10]

    history = list(reversed(history))

    messages = [
        {
            'role': 'system',
            'content': SYSTEM_PROMPT
        }
    ]

    for item in history:
        messages.append({
            'role': 'user' if item.role == 'USER' else 'assistant',
            'content': item.content
        })

    messages.append({
        'role': 'user',
        'content': message
    })

    try:
        ollama_response = requests.post(
            'http://localhost:11434/api/chat',
            json={
                'model': 'llama3.2:3b',
                'messages': messages,
                'stream': False
            },
            timeout=120
        )

        ollama_response.raise_for_status()

        data = ollama_response.json()
        reply = data.get('message', {}).get('content', '').strip()

        if not reply:
            return Response(
                {'error': 'AI returned an empty response.'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        # Save both messages only after successful AI response
        with transaction.atomic():
            ChatMessage.objects.bulk_create([
                ChatMessage(
                    user=user,
                    role='USER',
                    content=message
                ),
                ChatMessage(
                    user=user,
                    role='ASSISTANT',
                    content=reply
                )
            ])

        return Response({'reply': reply})

    except requests.exceptions.ConnectionError:
        return Response(
            {'error': 'Cannot connect to Ollama. Please start Ollama.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    except requests.exceptions.Timeout:
        return Response(
            {'error': 'AI response timed out. Please try again.'},
            status=status.HTTP_504_GATEWAY_TIMEOUT
        )

    except requests.exceptions.RequestException:
        return Response(
            {'error': 'Ollama request failed.'},
            status=status.HTTP_502_BAD_GATEWAY
        )
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history(request):
    messages = ChatMessage.objects.filter(
        user=request.user
    ).order_by('created_at')

    data = [
        {
            'id': item.id,
            'role': item.role,
            'content': item.content,
            'created_at': item.created_at
        }
        for item in messages
    ]

    return Response(data)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_chat_history(request):
    ChatMessage.objects.filter(
        user=request.user
    ).delete()

    return Response({
        'message': 'Chat history cleared successfully.'
    })