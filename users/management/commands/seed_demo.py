"""
Management command to populate the database with demo data.

Usage:
    python manage.py seed_demo          # Create demo data (skips if users exist)
    python manage.py seed_demo --reset  # Delete all non-superuser data first
"""
from django.core.management.base import BaseCommand
from users.models import User
from tasks.models import Task


class Command(BaseCommand):
    help = 'Seed the database with demo users and tasks for local development.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing demo data before seeding.',
        )

    def handle(self, *args, **options):
        if options['reset']:
            Task.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write('  Cleared existing demo data.')

        # Create admin
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={'role': 'ADMIN', 'name': 'Alex Admin', 'email': 'admin@taskflow.dev'},
        )
        if created:
            admin.set_password('Admin123!')
            admin.save()

        # Create managers
        mgr1, created = User.objects.get_or_create(
            username='manager1',
            defaults={'role': 'MANAGER', 'name': 'Morgan Chen', 'email': 'morgan@taskflow.dev'},
        )
        if created:
            mgr1.set_password('Manager123!')
            mgr1.save()

        mgr2, created = User.objects.get_or_create(
            username='manager2',
            defaults={'role': 'MANAGER', 'name': 'Riley Park', 'email': 'riley@taskflow.dev'},
        )
        if created:
            mgr2.set_password('Manager123!')
            mgr2.save()

        # Create users — team 1 (under manager1)
        team1 = []
        for i, (uname, full_name) in enumerate([
            ('alice', 'Alice Okafor'),
            ('bob', 'Bob Tanaka'),
            ('carol', 'Carol Singh'),
        ]):
            u, created = User.objects.get_or_create(
                username=uname,
                defaults={'role': 'USER', 'name': full_name, 'email': f'{uname}@taskflow.dev', 'manager': mgr1},
            )
            if created:
                u.set_password('User123!')
                u.save()
            team1.append(u)

        # Create users — team 2 (under manager2)
        team2 = []
        for i, (uname, full_name) in enumerate([
            ('dave', 'Dave Müller'),
            ('eve', 'Eve Nakamura'),
            ('frank', 'Frank Reyes'),
        ]):
            u, created = User.objects.get_or_create(
                username=uname,
                defaults={'role': 'USER', 'name': full_name, 'email': f'{uname}@taskflow.dev', 'manager': mgr2},
            )
            if created:
                u.set_password('User123!')
                u.save()
            team2.append(u)

        # Create tasks
        task_specs = [
            # (title, description, assignee, status)
            ('Design login screen', 'Create wireframes for the authentication flow.', team1[0], 'DONE'),
            ('Implement JWT auth', 'Set up SimpleJWT token endpoints on the backend.', team1[0], 'DONE'),
            ('Build user model', 'Extend AbstractUser with role and manager fields.', team1[1], 'DONE'),
            ('Write API tests', 'Cover all role permission scenarios with DRF test client.', team1[1], 'IN_PROGRESS'),
            ('Frontend task cards', 'Build React components for task display.', team1[2], 'IN_PROGRESS'),
            ('CORS configuration', 'Add django-cors-headers and configure allowed origins.', team1[2], 'TODO'),
            ('Set up CI pipeline', 'Configure GitHub Actions for test runs.', team2[0], 'DONE'),
            ('Write seed command', 'Management command to populate demo data.', team2[0], 'DONE'),
            ('Deploy to Render', 'Deploy Django API to Render with gunicorn.', team2[1], 'IN_PROGRESS'),
            ('Deploy frontend to Vercel', 'Configure vercel.json and set VITE_API_URL.', team2[1], 'IN_PROGRESS'),
            ('Add Swagger docs', 'Integrate drf-spectacular for API documentation.', team2[2], 'DONE'),
            ('Task filtering UI', 'Add filter by status in the tasks view.', team2[2], 'TODO'),
            ('Mobile responsiveness', 'Fix sidebar layout on small screens.', mgr1, 'TODO'),
            ('Security audit', 'Verify all RBAC rules are enforced server-side.', mgr2, 'IN_PROGRESS'),
            ('Write README', 'Document setup, roles, and deployment instructions.', admin, 'TODO'),
        ]

        created_count = 0
        for title, description, assignee, status in task_specs:
            _, created = Task.objects.get_or_create(
                title=title,
                defaults={'description': description, 'assigned_to': assignee, 'status': status},
            )
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS('\nDemo data ready!'))
        self.stdout.write('\nDemo credentials:')
        self.stdout.write('  admin     / Admin123!   (ADMIN — full access)')
        self.stdout.write('  manager1  / Manager123! (MANAGER — team: alice, bob, carol)')
        self.stdout.write('  manager2  / Manager123! (MANAGER — team: dave, eve, frank)')
        self.stdout.write('  alice     / User123!    (USER)')
        self.stdout.write('  bob       / User123!    (USER)')
        self.stdout.write('  carol     / User123!    (USER)')
        self.stdout.write('  dave      / User123!    (USER)')
        self.stdout.write('  eve       / User123!    (USER)')
        self.stdout.write('  frank     / User123!    (USER)')
        self.stdout.write(f'\n  Tasks created: {created_count}')
