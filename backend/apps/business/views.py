from rest_framework import viewsets

from .models import Business, UserBusiness
from .serializers import BusinessSerializer, UserBusinessSerializer


class BusinessViewSet(viewsets.ModelViewSet):
    queryset = Business.objects.all()
    serializer_class = BusinessSerializer


class UserBusinessViewSet(viewsets.ModelViewSet):
    queryset = UserBusiness.objects.all()
    serializer_class = UserBusinessSerializer
