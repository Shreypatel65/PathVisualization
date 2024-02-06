import os
from django.urls import path
from pathapp.consumers import PathConsumer
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'socketpath.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter([
        path('ws/path/', PathConsumer.as_asgi()),
    ]),
})

