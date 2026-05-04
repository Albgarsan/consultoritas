from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Document, InvoiceData
from .serializers import DocumentSerializer, InvoiceDataSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(business__users__user=self.request.user)


class InvoiceDataViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceDataSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return InvoiceData.objects.filter(
            document__business__users__user=self.request.user
        )
