from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Document, InvoiceData
from .serializers import DocumentSerializer, InvoiceDataSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(
            business__users__user=self.request.user
        ).distinct()

    def perform_create(self, serializer):
        from apps.business.models import Business
        from rest_framework.exceptions import ValidationError

        business_id = self.request.data.get("business_id") or self.request.data.get(
            "business"
        )
        user_businesses = Business.objects.filter(users__user=self.request.user)

        if not user_businesses.exists():
            raise ValidationError("You must belong to a business to upload documents.")

        if business_id:
            business = user_businesses.filter(pk=business_id).first()
            if not business:
                raise ValidationError(
                    "Invalid business selection or permission denied."
                )
        else:
            if user_businesses.count() > 1:
                raise ValidationError(
                    "You belong to multiple businesses. Please specify a business ID."
                )
            business = user_businesses.first()

        serializer.save(business=business)


class InvoiceDataViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceDataSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return InvoiceData.objects.filter(
            document__business__users__user=self.request.user
        ).distinct()
