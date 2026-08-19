from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User

class AuthorizationTests(APITestCase):
    def setUp(self):
        self.admin=User.objects.create_user(username='admin',password='Admin123!',role='ADMIN',name='Admin')
        self.manager=User.objects.create_user(username='manager',password='Manager123!',role='MANAGER',name='Manager')
        self.user=User.objects.create_user(username='user',password='User123!',role='USER',name='User',manager=self.manager)
    def auth(self, user):
        token=str(RefreshToken.for_user(user).access_token); self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    def test_user_cannot_promote_self(self):
        self.auth(self.user)
        r=self.client.patch(f'/api/users/{self.user.id}/',{'role':'ADMIN'},format='json')
        self.assertEqual(r.status_code,200)
        self.user.refresh_from_db(); self.assertEqual(self.user.role,'USER')
    def test_admin_can_list_everyone(self):
        self.auth(self.admin); r=self.client.get('/api/users/'); self.assertEqual(r.status_code,200); self.assertEqual(len(r.data),3)
