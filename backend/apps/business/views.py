from rest_framework import permissions, viewsets

from .models import Business, UserBusiness
from .serializers import BusinessSerializer, UserBusinessSerializer


class BusinessViewSet(viewsets.ModelViewSet):
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Business.objects.filter(users__user=self.request.user)


class UserBusinessViewSet(viewsets.ModelViewSet):
    serializer_class = UserBusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserBusiness.objects.filter(user=self.request.user)
