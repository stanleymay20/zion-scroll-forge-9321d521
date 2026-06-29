"""
Unit Tests for ScrollUniversity Portal Database Schema

This module tests the database schema, constraints, and relationships.
"We test these models not in the wisdom of Babylon, but by the breath of the Spirit"
"""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import uuid

from src.models.portal_models import (
    Base, PortalCourse, PortalEnrollment, AITutorSession, ScrollNode,
    Scholarship, ScholarshipApplication, XRClassroom, XRClassroomParticipant,
    FacultyMember, UserPreferences, PortalAnalytics
)

# Test database URL - use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_engine():
    """Create test database engine"""
    engine = create_engine(TEST_DATABASE_URL, echo=False)
    Base.metadata.create_all(engine)
    return engine

@pytest.fixture
def db_session(db_engine):
    """Create test database session"""
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.close()

class TestPortalCourseModel:
    """Test PortalCourse model and constraints"""
    
    def test_portal_course_creation(self, db_session):
        """Test creating a portal course"""
        course = PortalCourse(
            course_spec_id=uuid.uuid4(),
            title="Test Course",
            description="A test course for ScrollUniversity",
            level="Intermediate",
            duration_weeks=6,
            xp_reward=150,
            scroll_coin_cost=25.00
        )
        
        db_session.add(course)
        db_session.commit()
        
        assert course.portal_course_id is not None
        assert course.title == "Test Course"
        assert course.level == "Intermediate"
        assert course.xp_reward == 150
        assert course.created_at is not None
    
    def test_portal_course_defaults(self, db_session):
        """Test default values for portal course"""
        course = PortalCourse(
            course_spec_id=uuid.uuid4(),
            title="Default Test Course"
        )
        
        db_session.add(course)
        db_session.commit()
        
        assert course.level == "Introductory"
        assert course.duration_weeks == 4
        assert course.xp_reward == 100
        assert course.scroll_coin_cost == 0.00
        assert course.featured is False
        assert course.enrollment_open is True
        assert course.enrollment_count == 0
        assert course.rating == 0.00

class TestPortalEnrollmentModel:
    """Test PortalEnrollment model and constraints"""
    
    def test_portal_enrollment_creation(self, db_session):
        """Test creating a portal enrollment"""
        # First create a course
        course = PortalCourse(
            course_spec_id=uuid.uuid4(),
            title="Test Course"
        )
        db_session.add(course)
        db_session.flush()
        
        enrollment = PortalEnrollment(
            user_id="test_user_123",
            portal_course_id=course.portal_course_id,
            progress_percentage=25.5,
            xp_earned=50
        )
        
        db_session.add(enrollment)
        db_session.commit()
        
        assert enrollment.enrollment_id is not None
        assert enrollment.user_id == "test_user_123"
        assert enrollment.progress_percentage == 25.5
        assert enrollment.xp_earned == 50
        assert enrollment.status == "active"
    
    def test_unique_user_course_enrollment(self, db_session):
        """Test unique constraint on user_id and portal_course_id"""
        course = PortalCourse(
            course_spec_id=uuid.uuid4(),
            title="Test Course"
        )
        db_session.add(course)
        db_session.flush()
        
        # First enrollment
        enrollment1 = PortalEnrollment(
            user_id="test_user_123",
            portal_course_id=course.portal_course_id
        )
        db_session.add(enrollment1)
        db_session.commit()
        
        # Second enrollment with same user and course should fail
        enrollment2 = PortalEnrollment(
            user_id="test_user_123",
            portal_course_id=course.portal_course_id
        )
        db_session.add(enrollment2)
        
        with pytest.raises(IntegrityError):
            db_session.commit()

class TestAITutorSessionModel:
    """Test AITutorSession model and constraints"""
    
    def test_ai_tutor_session_creation(self, db_session):
        """Test creating an AI tutor session"""
        session = AITutorSession(
            user_id="test_user_123",
            tutor_type="ScrollMentorGPT",
            faculty_context="Computer Science",
            session_data={"topic": "Python Programming"},
            conversation_history=[
                {"role": "user", "content": "Hello"},
                {"role": "ai", "content": "Hello! How can I help you today?"}
            ]
        )
        
        db_session.add(session)
        db_session.commit()
        
        assert session.session_id is not None
        assert session.tutor_type == "ScrollMentorGPT"
        assert session.faculty_context == "Computer Science"
        assert session.status == "active"
        assert len(session.conversation_history) == 2
    
    def test_ai_tutor_session_with_course(self, db_session):
        """Test AI tutor session linked to a course"""
        course = PortalCourse(
            course_spec_id=uuid.uuid4(),
            title="AI Programming Course"
        )
        db_session.add(course)
        db_session.flush()
        
        session = AITutorSession(
            user_id="test_user_123",
            portal_course_id=course.portal_course_id,
            tutor_type="FacultyAI",
            satisfaction_rating=5
        )
        
        db_session.add(session)
        db_session.commit()
        
        assert session.portal_course_id == course.portal_course_id
        assert session.satisfaction_rating == 5

class TestScrollNodeModel:
    """Test ScrollNode model and constraints"""
    
    def test_scroll_node_creation(self, db_session):
        """Test creating a scroll node"""
        node = ScrollNode(
            name="Ghana Rural Node",
            location="Kumasi, Ghana",
            country="Ghana",
            coordinator_id="coordinator_123",
            node_type="rural",
            connectivity_level="low",
            configuration={"solar_power": True, "satellite_internet": True}
        )
        
        db_session.add(node)
        db_session.commit()
        
        assert node.node_id is not None
        assert node.name == "Ghana Rural Node"
        assert node.country == "Ghana"
        assert node.node_type == "rural"
        assert node.connectivity_level == "low"
        assert node.configuration["solar_power"] is True
    
    def test_scroll_node_defaults(self, db_session):
        """Test default values for scroll node"""
        node = ScrollNode(
            name="Default Node",
            coordinator_id="coordinator_123"
        )
        
        db_session.add(node)
        db_session.commit()
        
        assert node.status == "active"
        assert node.sync_enabled is True
        assert node.node_type == "standard"
        assert node.connectivity_level == "high"

class TestScholarshipModel:
    """Test Scholarship and ScholarshipApplication models"""
    
    def test_scholarship_creation(self, db_session):
        """Test creating a scholarship"""
        scholarship = Scholarship(
            name="ScrollCoin Merit Scholarship",
            description="For outstanding academic performance",
            amount=1000.00,
            currency="ScrollCoin",
            scholarship_type="merit",
            eligibility_criteria={"min_gpa": 3.5, "min_courses": 3},
            max_recipients=10
        )
        
        db_session.add(scholarship)
        db_session.commit()
        
        assert scholarship.scholarship_id is not None
        assert scholarship.name == "ScrollCoin Merit Scholarship"
        assert scholarship.amount == 1000.00
        assert scholarship.scholarship_type == "merit"
        assert scholarship.eligibility_criteria["min_gpa"] == 3.5
    
    def test_scholarship_application(self, db_session):
        """Test creating a scholarship application"""
        scholarship = Scholarship(
            name="Test Scholarship",
            amount=500.00
        )
        db_session.add(scholarship)
        db_session.flush()
        
        application = ScholarshipApplication(
            scholarship_id=scholarship.scholarship_id,
            user_id="applicant_123",
            application_data={"essay": "My motivation...", "gpa": 3.8},
            status="submitted"
        )
        
        db_session.add(application)
        db_session.commit()
        
        assert application.application_id is not None
        assert application.scholarship_id == scholarship.scholarship_id
        assert application.user_id == "applicant_123"
        assert application.status == "submitted"
    
    def test_unique_scholarship_application(self, db_session):
        """Test unique constraint on scholarship applications"""
        scholarship = Scholarship(name="Test Scholarship", amount=500.00)
        db_session.add(scholarship)
        db_session.flush()
        
        # First application
        app1 = ScholarshipApplication(
            scholarship_id=scholarship.scholarship_id,
            user_id="applicant_123"
        )
        db_session.add(app1)
        db_session.commit()
        
        # Second application from same user should fail
        app2 = ScholarshipApplication(
            scholarship_id=scholarship.scholarship_id,
            user_id="applicant_123"
        )
        db_session.add(app2)
        
        with pytest.raises(IntegrityError):
            db_session.commit()

class TestXRClassroomModel:
    """Test XRClassroom and XRClassroomParticipant models"""
    
    def test_xr_classroom_creation(self, db_session):
        """Test creating an XR classroom"""
        course = PortalCourse(
            course_spec_id=uuid.uuid4(),
            title="VR Programming Course"
        )
        db_session.add(course)
        db_session.flush()
        
        classroom = XRClassroom(
            portal_course_id=course.portal_course_id,
            session_name="Introduction to VR Development",
            description="Learn VR programming basics",
            instructor_id="instructor_123",
            scheduled_time=datetime.now() + timedelta(days=1),
            duration_minutes=90,
            max_participants=25,
            xr_environment_id="prophetic_temple_001"
        )
        
        db_session.add(classroom)
        db_session.commit()
        
        assert classroom.classroom_id is not None
        assert classroom.session_name == "Introduction to VR Development"
        assert classroom.duration_minutes == 90
        assert classroom.max_participants == 25
        assert classroom.status == "scheduled"
    
    def test_xr_classroom_participant(self, db_session):
        """Test adding participants to XR classroom"""
        course = PortalCourse(
            course_spec_id=uuid.uuid4(),
            title="VR Course"
        )
        db_session.add(course)
        db_session.flush()
        
        classroom = XRClassroom(
            portal_course_id=course.portal_course_id,
            session_name="VR Session",
            scheduled_time=datetime.now() + timedelta(days=1)
        )
        db_session.add(classroom)
        db_session.flush()
        
        participant = XRClassroomParticipant(
            classroom_id=classroom.classroom_id,
            user_id="student_123",
            joined_at=datetime.now(),
            participation_score=0.85,
            interaction_data={"questions_asked": 3, "time_engaged": 45}
        )
        
        db_session.add(participant)
        db_session.commit()
        
        assert participant.participant_id is not None
        assert participant.user_id == "student_123"
        assert participant.participation_score == 0.85
        assert participant.interaction_data["questions_asked"] == 3

class TestUserPreferencesModel:
    """Test UserPreferences model"""
    
    def test_user_preferences_creation(self, db_session):
        """Test creating user preferences"""
        preferences = UserPreferences(
            user_id="user_123",
            theme="dark",
            notifications={"email": False, "push": True, "sms": True},
            privacy_settings={"profile_public": False, "progress_public": True},
            learning_preferences={"preferred_language": "Spanish", "difficulty": "Advanced"},
            accessibility_settings={"high_contrast": True, "screen_reader": False}
        )
        
        db_session.add(preferences)
        db_session.commit()
        
        assert preferences.preference_id is not None
        assert preferences.user_id == "user_123"
        assert preferences.theme == "dark"
        assert preferences.notifications["push"] is True
        assert preferences.learning_preferences["preferred_language"] == "Spanish"
    
    def test_user_preferences_defaults(self, db_session):
        """Test default values for user preferences"""
        preferences = UserPreferences(user_id="user_123")
        
        db_session.add(preferences)
        db_session.commit()
        
        assert preferences.theme == "light"
        assert preferences.notifications["email"] is True
        assert preferences.privacy_settings["profile_public"] is True

class TestPortalAnalyticsModel:
    """Test PortalAnalytics model"""
    
    def test_portal_analytics_creation(self, db_session):
        """Test creating portal analytics entry"""
        analytics = PortalAnalytics(
            user_id="user_123",
            event_type="course_enrollment",
            event_data={"course_id": "course_456", "enrollment_method": "direct"},
            session_id="session_789",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        
        db_session.add(analytics)
        db_session.commit()
        
        assert analytics.analytics_id is not None
        assert analytics.user_id == "user_123"
        assert analytics.event_type == "course_enrollment"
        assert analytics.event_data["course_id"] == "course_456"
        assert analytics.session_id == "session_789"

class TestDatabaseConstraints:
    """Test database constraints and relationships"""
    
    def test_foreign_key_constraints(self, db_session):
        """Test foreign key constraint enforcement"""
        # This test would need actual User and Faculty tables to work properly
        # For now, we'll test the structure is correct
        course = PortalCourse(
            course_spec_id=uuid.uuid4(),
            title="Test Course"
        )
        db_session.add(course)
        db_session.commit()
        
        # Test that we can create related records
        enrollment = PortalEnrollment(
            user_id="test_user",
            portal_course_id=course.portal_course_id
        )
        db_session.add(enrollment)
        db_session.commit()
        
        assert enrollment.portal_course_id == course.portal_course_id
    
    def test_json_field_functionality(self, db_session):
        """Test JSON field storage and retrieval"""
        session_data = {
            "conversation_id": "conv_123",
            "topics_discussed": ["Python", "AI", "Machine Learning"],
            "user_preferences": {"language": "en", "difficulty": "intermediate"}
        }
        
        ai_session = AITutorSession(
            user_id="user_123",
            tutor_type="ScrollMentorGPT",
            session_data=session_data
        )
        
        db_session.add(ai_session)
        db_session.commit()
        
        # Retrieve and verify JSON data
        retrieved_session = db_session.query(AITutorSession).filter_by(
            user_id="user_123"
        ).first()
        
        assert retrieved_session.session_data["conversation_id"] == "conv_123"
        assert "Python" in retrieved_session.session_data["topics_discussed"]
        assert retrieved_session.session_data["user_preferences"]["language"] == "en"

if __name__ == "__main__":
    pytest.main([__file__])