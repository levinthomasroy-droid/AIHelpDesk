
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):

    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('TECHNICIAN', 'Technician'),
        ('EMPLOYEE', 'Employee'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='EMPLOYEE'
    )

    department = models.CharField(
        max_length=100,
        blank=True
    )

    phone = models.CharField(
        max_length=15,
        blank=True
    )

    def __str__(self):
        return f"{self.username} - {self.role}"
