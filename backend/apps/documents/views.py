from rest_framework import viewsets

from .models import Document, InvoiceData
from .serializers import DocumentSerializer, InvoiceDataSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer


class InvoiceDataViewSet(viewsets.ModelViewSet):
    queryset = InvoiceData.objects.all()
    serializer_class = InvoiceDataSerializer
