"""API integration tests using FastAPI TestClient."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app.models.models import User, UserRole
from app.utils.auth import hash_password

# Use an in-memory SQLite database for tests
TEST_DATABASE_URL = "sqlite:///./test_edusupport.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    # Seed a test user
    db = TestSessionLocal()
    if not db.query(User).filter(User.username == "testadmin").first():
        user = User(
            username="testadmin",
            email="testadmin@test.com",
            full_name="Test Admin",
            hashed_password=hash_password("testpass123"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(user)
        db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def auth_headers(client):
    response = client.post("/api/auth/login", json={"username": "testadmin", "password": "testpass123"})
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestAuthentication:
    def test_login_success(self, client):
        r = client.post("/api/auth/login", json={"username": "testadmin", "password": "testpass123"})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_wrong_password(self, client):
        r = client.post("/api/auth/login", json={"username": "testadmin", "password": "wrong"})
        assert r.status_code == 401

    def test_login_nonexistent_user(self, client):
        r = client.post("/api/auth/login", json={"username": "nobody", "password": "pass"})
        assert r.status_code == 401

    def test_me_requires_auth(self, client):
        r = client.get("/api/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, client, auth_headers):
        r = client.get("/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["username"] == "testadmin"


class TestStudentCRUD:
    def test_create_student(self, client, auth_headers):
        r = client.post("/api/students/", json={
            "prn": "TEST001",
            "full_name": "Test Student One",
            "semester": 3,
            "division": "A",
        }, headers=auth_headers)
        assert r.status_code == 201
        assert r.json()["prn"] == "TEST001"

    def test_duplicate_prn_rejected(self, client, auth_headers):
        r = client.post("/api/students/", json={
            "prn": "TEST001",
            "full_name": "Duplicate Student",
            "semester": 3,
        }, headers=auth_headers)
        assert r.status_code == 400

    def test_list_students(self, client, auth_headers):
        r = client.get("/api/students/", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_get_student(self, client, auth_headers):
        # Create a student first
        create_r = client.post("/api/students/", json={
            "prn": "TEST002",
            "full_name": "Test Student Two",
            "semester": 4,
        }, headers=auth_headers)
        student_id = create_r.json()["id"]
        r = client.get(f"/api/students/{student_id}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["prn"] == "TEST002"

    def test_update_student(self, client, auth_headers):
        create_r = client.post("/api/students/", json={
            "prn": "TEST003",
            "full_name": "Test Student Three",
            "semester": 3,
        }, headers=auth_headers)
        student_id = create_r.json()["id"]
        r = client.put(f"/api/students/{student_id}", json={"full_name": "Updated Name"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["full_name"] == "Updated Name"

    def test_delete_student(self, client, auth_headers):
        create_r = client.post("/api/students/", json={
            "prn": "TEST004",
            "full_name": "To Delete",
            "semester": 3,
        }, headers=auth_headers)
        student_id = create_r.json()["id"]
        r = client.delete(f"/api/students/{student_id}", headers=auth_headers)
        assert r.status_code == 204
        r2 = client.get(f"/api/students/{student_id}", headers=auth_headers)
        assert r2.status_code == 404

    def test_students_require_auth(self, client):
        r = client.get("/api/students/")
        assert r.status_code == 401


class TestHealthCheck:
    def test_health(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
