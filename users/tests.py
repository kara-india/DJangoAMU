from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import User
from tasks.models import Task


class AuthorizationTests(APITestCase):
    """
    Security regression tests for RBAC enforcement.
    All tests that attempt unauthorized operations must fail.
    """

    def setUp(self):
        # Admin
        self.admin = User.objects.create_user(
            username='admin', password='Admin123!', role='ADMIN', name='Admin'
        )
        # Manager 1 and their team
        self.mgr1 = User.objects.create_user(
            username='manager1', password='Manager123!', role='MANAGER', name='Manager One'
        )
        self.user1 = User.objects.create_user(
            username='user1', password='User123!', role='USER', name='User One', manager=self.mgr1
        )
        self.user2 = User.objects.create_user(
            username='user2', password='User123!', role='USER', name='User Two', manager=self.mgr1
        )
        # Manager 2 and their team
        self.mgr2 = User.objects.create_user(
            username='manager2', password='Manager123!', role='MANAGER', name='Manager Two'
        )
        self.user3 = User.objects.create_user(
            username='user3', password='User123!', role='USER', name='User Three', manager=self.mgr2
        )
        # Tasks
        self.task1 = Task.objects.create(
            title='Task for user1', description='desc', assigned_to=self.user1, status='TODO'
        )
        self.task3 = Task.objects.create(
            title='Task for user3', description='desc', assigned_to=self.user3, status='TODO'
        )

    def auth(self, user):
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    # ------- ADMIN tests -------

    def test_admin_can_list_all_users(self):
        self.auth(self.admin)
        r = self.client.get('/api/users/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 6)  # admin, mgr1, mgr2, user1, user2, user3

    def test_admin_can_list_all_tasks(self):
        self.auth(self.admin)
        r = self.client.get('/api/tasks/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 2)

    def test_admin_can_delete_task(self):
        self.auth(self.admin)
        r = self.client.delete(f'/api/tasks/{self.task1.id}/')
        self.assertEqual(r.status_code, 204)

    def test_admin_can_delete_user(self):
        self.auth(self.admin)
        r = self.client.delete(f'/api/users/{self.user1.id}/delete/')
        self.assertEqual(r.status_code, 204)

    def test_admin_can_assign_task_to_any_user(self):
        self.auth(self.admin)
        r = self.client.patch(
            f'/api/tasks/{self.task1.id}/',
            {'assigned_to': self.user3.id},
            format='json',
        )
        self.assertEqual(r.status_code, 200)

    # ------- USER role-escalation tests -------

    def test_user_cannot_promote_self_to_admin(self):
        self.auth(self.user1)
        r = self.client.patch(f'/api/users/{self.user1.id}/', {'role': 'ADMIN'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.role, 'USER')  # role must remain USER

    def test_user_cannot_change_own_manager(self):
        self.auth(self.user1)
        r = self.client.patch(
            f'/api/users/{self.user1.id}/', {'manager': self.mgr2.id}, format='json'
        )
        self.assertEqual(r.status_code, 200)
        self.user1.refresh_from_db()
        # manager field is read_only for non-admin, so it must stay mgr1
        self.assertEqual(self.user1.manager_id, self.mgr1.id)

    def test_user_cannot_see_other_users_task(self):
        self.auth(self.user1)
        r = self.client.get(f'/api/tasks/{self.task3.id}/')
        self.assertEqual(r.status_code, 404)  # filtered out of queryset

    def test_user_cannot_create_task(self):
        self.auth(self.user1)
        r = self.client.post(
            '/api/tasks/',
            {'title': 'Rogue task', 'description': '', 'assigned_to': self.user1.id, 'status': 'TODO'},
            format='json',
        )
        self.assertEqual(r.status_code, 403)

    def test_user_cannot_delete_task(self):
        self.auth(self.user1)
        r = self.client.delete(f'/api/tasks/{self.task1.id}/')
        self.assertEqual(r.status_code, 403)

    def test_user_cannot_delete_user(self):
        """Non-admin must not be able to delete users through the detail delete route."""
        self.auth(self.user1)
        r = self.client.delete(f'/api/users/{self.user2.id}/delete/')
        self.assertEqual(r.status_code, 403)

    def test_user_cannot_change_task_assignee(self):
        """assigned_to is read_only for USER role in the serializer."""
        self.auth(self.user1)
        r = self.client.patch(
            f'/api/tasks/{self.task1.id}/',
            {'assigned_to': self.user2.id},
            format='json',
        )
        # Request may return 200 but assigned_to must remain user1
        self.assertIn(r.status_code, [200, 403])
        self.task1.refresh_from_db()
        self.assertEqual(self.task1.assigned_to_id, self.user1.id)

    def test_user_can_update_title_description_status(self):
        self.auth(self.user1)
        r = self.client.patch(
            f'/api/tasks/{self.task1.id}/',
            {'title': 'Updated title', 'description': 'New desc', 'status': 'IN_PROGRESS'},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.task1.refresh_from_db()
        self.assertEqual(self.task1.title, 'Updated title')
        self.assertEqual(self.task1.status, 'IN_PROGRESS')

    # ------- MANAGER tests -------

    def test_manager_sees_own_team_users(self):
        self.auth(self.mgr1)
        r = self.client.get('/api/users/')
        self.assertEqual(r.status_code, 200)
        ids = [u['id'] for u in r.data]
        self.assertIn(self.user1.id, ids)
        self.assertIn(self.user2.id, ids)
        self.assertNotIn(self.user3.id, ids)  # user3 is under mgr2

    def test_manager_sees_own_team_tasks(self):
        self.auth(self.mgr1)
        r = self.client.get('/api/tasks/')
        self.assertEqual(r.status_code, 200)
        ids = [t['id'] for t in r.data]
        self.assertIn(self.task1.id, ids)
        self.assertNotIn(self.task3.id, ids)  # task3 belongs to user3 under mgr2

    def test_manager_cannot_assign_task_to_another_teams_user_on_create(self):
        """MANAGER must not assign a NEW task to user3 who belongs to mgr2."""
        self.auth(self.mgr1)
        r = self.client.post(
            '/api/tasks/',
            {'title': 'Rogue assign', 'description': '', 'assigned_to': self.user3.id, 'status': 'TODO'},
            format='json',
        )
        self.assertEqual(r.status_code, 403)

    def test_manager_cannot_assign_existing_task_to_another_teams_user_on_patch(self):
        """MANAGER must not re-assign task1 (currently user1 under mgr1) to user3 (mgr2's team)."""
        self.auth(self.mgr1)
        r = self.client.patch(
            f'/api/tasks/{self.task1.id}/',
            {'assigned_to': self.user3.id},
            format='json',
        )
        self.assertEqual(r.status_code, 403)

    def test_manager_cannot_delete_users(self):
        self.auth(self.mgr1)
        r = self.client.delete(f'/api/users/{self.user1.id}/delete/')
        self.assertEqual(r.status_code, 403)

    def test_manager_can_assign_task_to_own_team(self):
        self.auth(self.mgr1)
        r = self.client.post(
            '/api/tasks/',
            {'title': 'Valid task', 'description': '', 'assigned_to': self.user2.id, 'status': 'TODO'},
            format='json',
        )
        self.assertEqual(r.status_code, 201)

    def test_manager_can_assign_task_to_self(self):
        self.auth(self.mgr1)
        r = self.client.post(
            '/api/tasks/',
            {'title': 'My own task', 'description': '', 'assigned_to': self.mgr1.id, 'status': 'TODO'},
            format='json',
        )
        self.assertEqual(r.status_code, 201)

    def test_manager_can_delete_own_team_task(self):
        self.auth(self.mgr1)
        r = self.client.delete(f'/api/tasks/{self.task1.id}/')
        self.assertEqual(r.status_code, 204)

    # ------- Authentication tests -------

    def test_unauthenticated_cannot_access_tasks(self):
        r = self.client.get('/api/tasks/')
        self.assertEqual(r.status_code, 401)

    def test_unauthenticated_cannot_access_users(self):
        r = self.client.get('/api/users/')
        self.assertEqual(r.status_code, 401)
