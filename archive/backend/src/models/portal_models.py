"""
ScrollUniversity Portal Database Models

This module defines SQLAlchemy models for the ScrollUniversity Portal system.
"We establish these models not in the wisdom of Babylon, but by the breath of the Spirit"
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, 
    ForeignKey, UniqueConstraint, Index, ARRAY, JSON
)
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class PortalCourse(Base):
    """Portal Courses - Integration with ScrollCourseSpec"""
    __tablename__ = 'portal_courses'
    
    portal_course_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_spec_id = Column(UUID(as_uuid=True), nullable=False)  # Reference to ScrollCourseSpec
    faculty_id = Column(String, ForeignKey('faculties.id'), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    level = Column(String(50), default='Introductory')
    duration_weeks = Column(Integer, default=4)
    xp_reward = Column(Integer, default=100)
    scroll_coin_cost = Column(Float, default=0.00)
    prerequisites = Column(ARRAY(String))  # Array of course IDs
    featured = Column(Boolean, default=False)
    enrollment_open = Column(Boolean, default=True)
    enrollment_count = Column(Integer, default=0)
    rating = Column(Float, default=0.00)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    enrollments = relationship("PortalEnrollment", back_populates="portal_course")
    ai_tutor_sessions = relationship("AITutorSession", back_populates="portal_course")
    xr_classrooms = relationship("XRClassroom", back_populates="portal_course")
    
    # Indexes
    __table_args__ = (
        Index('idx_portal_courses_course_spec_id', 'course_spec_id'),
        Index('idx_portal_courses_faculty_id', 'faculty_id'),
        Index('idx_portal_courses_featured', 'featured'),
        Index('idx_portal_courses_enrollment_open', 'enrollment_open'),
        Index('idx_portal_courses_level', 'level'),
    )

class PortalEnrollment(Base):
    """Portal Enrollments - Enhanced enrollment tracking"""
    __tablename__ = 'portal_enrollments'
    
    enrollment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    portal_course_id = Column(UUID(as_uuid=True), ForeignKey('portal_courses.portal_course_id'), nullable=False)
    enrollment_date = Column(DateTime, default=func.now())
    completion_date = Column(DateTime)
    progress_percentage = Column(Float, default=0.00)
    xp_earned = Column(Integer, default=0)
    scroll_coins_earned = Column(Float, default=0.00)
    current_lesson_id = Column(String)
    status = Column(String(50), default='active')
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    portal_course = relationship("PortalCourse", back_populates="enrollments")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'portal_course_id'),
        Index('idx_portal_enrollments_user_id', 'user_id'),
        Index('idx_portal_enrollments_portal_course_id', 'portal_course_id'),
        Index('idx_portal_enrollments_status', 'status'),
        Index('idx_portal_enrollments_enrollment_date', 'enrollment_date'),
    )

class AITutorSession(Base):
    """AI Tutor Sessions - GPT-4o integration for personalized tutoring"""
    __tablename__ = 'ai_tutor_sessions'
    
    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    portal_course_id = Column(UUID(as_uuid=True), ForeignKey('portal_courses.portal_course_id'), nullable=True)
    tutor_type = Column(String(100), nullable=False)  # ScrollMentorGPT, FacultyAI, GeneralAI
    faculty_context = Column(String)
    session_data = Column(JSON, default={})
    conversation_history = Column(JSON, default=[])
    started_at = Column(DateTime, default=func.now())
    ended_at = Column(DateTime)
    satisfaction_rating = Column(Integer)  # 1-5 rating
    status = Column(String(50), default='active')
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    portal_course = relationship("PortalCourse", back_populates="ai_tutor_sessions")
    
    # Indexes
    __table_args__ = (
        Index('idx_ai_tutor_sessions_user_id', 'user_id'),
        Index('idx_ai_tutor_sessions_portal_course_id', 'portal_course_id'),
        Index('idx_ai_tutor_sessions_tutor_type', 'tutor_type'),
        Index('idx_ai_tutor_sessions_started_at', 'started_at'),
        Index('idx_ai_tutor_sessions_status', 'status'),
    )

class ScrollNode(Base):
    """ScrollNodes - Global distributed campus management"""
    __tablename__ = 'scroll_nodes'
    
    node_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    location = Column(String(255))
    country = Column(String(100))
    coordinator_id = Column(String, ForeignKey('users.id'), nullable=True)
    status = Column(String(50), default='active')
    sync_enabled = Column(Boolean, default=True)
    node_type = Column(String(50), default='standard')  # standard, rural, urban, mobile
    connectivity_level = Column(String(50), default='high')  # high, medium, low, offline
    last_sync_at = Column(DateTime)
    configuration = Column(JSON, default={})
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_scroll_nodes_coordinator_id', 'coordinator_id'),
        Index('idx_scroll_nodes_status', 'status'),
        Index('idx_scroll_nodes_country', 'country'),
        Index('idx_scroll_nodes_node_type', 'node_type'),
        Index('idx_scroll_nodes_connectivity_level', 'connectivity_level'),
    )

class Scholarship(Base):
    """Scholarships - Financial aid and ScrollCoin missions"""
    __tablename__ = 'scholarships'
    
    scholarship_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    amount = Column(Float)
    currency = Column(String(10), default='ScrollCoin')
    scholarship_type = Column(String(50), default='merit')  # merit, need, prophetic, workstudy
    eligibility_criteria = Column(JSON, default={})
    application_deadline = Column(DateTime)
    max_recipients = Column(Integer)
    current_recipients = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    applications = relationship("ScholarshipApplication", back_populates="scholarship")
    
    # Indexes
    __table_args__ = (
        Index('idx_scholarships_scholarship_type', 'scholarship_type'),
        Index('idx_scholarships_is_active', 'is_active'),
        Index('idx_scholarships_application_deadline', 'application_deadline'),
        Index('idx_scholarships_created_by', 'created_by'),
    )

class ScholarshipApplication(Base):
    """Scholarship Applications - Application and approval workflow"""
    __tablename__ = 'scholarship_applications'
    
    application_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scholarship_id = Column(UUID(as_uuid=True), ForeignKey('scholarships.scholarship_id'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    application_data = Column(JSON, default={})
    status = Column(String(50), default='submitted')  # submitted, under_review, approved, rejected
    applied_at = Column(DateTime, default=func.now())
    reviewed_at = Column(DateTime)
    reviewed_by = Column(String, ForeignKey('users.id'), nullable=True)
    decision_reason = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    scholarship = relationship("Scholarship", back_populates="applications")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('scholarship_id', 'user_id'),
        Index('idx_scholarship_applications_scholarship_id', 'scholarship_id'),
        Index('idx_scholarship_applications_user_id', 'user_id'),
        Index('idx_scholarship_applications_status', 'status'),
        Index('idx_scholarship_applications_applied_at', 'applied_at'),
    )

class XRClassroom(Base):
    """XR Classrooms - Immersive learning experiences"""
    __tablename__ = 'xr_classrooms'
    
    classroom_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portal_course_id = Column(UUID(as_uuid=True), ForeignKey('portal_courses.portal_course_id'), nullable=False)
    session_name = Column(String(255), nullable=False)
    description = Column(Text)
    instructor_id = Column(String, ForeignKey('users.id'), nullable=True)
    scheduled_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    max_participants = Column(Integer, default=30)
    current_participants = Column(Integer, default=0)
    xr_environment_id = Column(String)
    recording_enabled = Column(Boolean, default=True)
    recording_url = Column(Text)
    status = Column(String(50), default='scheduled')  # scheduled, live, completed, cancelled
    access_requirements = Column(JSON, default={})
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    portal_course = relationship("PortalCourse", back_populates="xr_classrooms")
    participants = relationship("XRClassroomParticipant", back_populates="classroom")
    
    # Indexes
    __table_args__ = (
        Index('idx_xr_classrooms_portal_course_id', 'portal_course_id'),
        Index('idx_xr_classrooms_instructor_id', 'instructor_id'),
        Index('idx_xr_classrooms_scheduled_time', 'scheduled_time'),
        Index('idx_xr_classrooms_status', 'status'),
    )

class XRClassroomParticipant(Base):
    """XR Classroom Participants - Tracking participation in immersive sessions"""
    __tablename__ = 'xr_classroom_participants'
    
    participant_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey('xr_classrooms.classroom_id'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    joined_at = Column(DateTime)
    left_at = Column(DateTime)
    participation_score = Column(Float)
    interaction_data = Column(JSON, default={})
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    classroom = relationship("XRClassroom", back_populates="participants")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('classroom_id', 'user_id'),
        Index('idx_xr_classroom_participants_classroom_id', 'classroom_id'),
        Index('idx_xr_classroom_participants_user_id', 'user_id'),
        Index('idx_xr_classroom_participants_joined_at', 'joined_at'),
    )

class FacultyMember(Base):
    """Faculty Members - Enhanced faculty management"""
    __tablename__ = 'faculty_members'
    
    member_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    faculty_id = Column(String, ForeignKey('faculties.id'), nullable=False)
    title = Column(String(100))
    specializations = Column(ARRAY(String))
    bio = Column(Text)
    office_hours = Column(JSON, default={})
    ai_dean_integration = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'faculty_id'),
        Index('idx_faculty_members_user_id', 'user_id'),
        Index('idx_faculty_members_faculty_id', 'faculty_id'),
        Index('idx_faculty_members_is_active', 'is_active'),
    )

class UserPreferences(Base):
    """User Preferences - Personalization settings"""
    __tablename__ = 'user_preferences'
    
    preference_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.id'), nullable=False, unique=True)
    theme = Column(String(20), default='light')  # light, dark, auto
    notifications = Column(JSON, default={"email": True, "push": True, "sms": False})
    privacy_settings = Column(JSON, default={"profile_public": True, "progress_public": False})
    learning_preferences = Column(JSON, default={})
    accessibility_settings = Column(JSON, default={})
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_user_preferences_user_id', 'user_id'),
    )

class PortalAnalytics(Base):
    """Portal Analytics - User behavior and system metrics"""
    __tablename__ = 'portal_analytics'
    
    analytics_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    event_type = Column(String(100), nullable=False)
    event_data = Column(JSON, default={})
    session_id = Column(String)
    ip_address = Column(INET)
    user_agent = Column(Text)
    timestamp = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_portal_analytics_user_id', 'user_id'),
        Index('idx_portal_analytics_event_type', 'event_type'),
        Index('idx_portal_analytics_timestamp', 'timestamp'),
        Index('idx_portal_analytics_session_id', 'session_id'),
    )