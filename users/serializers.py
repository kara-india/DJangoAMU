from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','name','username','email','password','role','manager']
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role != 'ADMIN':
            self.fields['role'].read_only = True
            self.fields['manager'].read_only = True

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password: user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items(): setattr(instance, attr, value)
        if password: instance.set_password(password)
        instance.save()
        return instance

    def validate_manager(self, value):
        if value and value.role != 'MANAGER':
            raise serializers.ValidationError('The assigned manager must have the Manager role.')
        return value
