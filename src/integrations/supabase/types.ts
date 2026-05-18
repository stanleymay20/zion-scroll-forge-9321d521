export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_breaks: {
        Row: {
          academic_year_id: string | null
          break_type: string | null
          created_at: string | null
          end_date: string
          id: string
          name: string
          semester_id: string | null
          start_date: string
        }
        Insert: {
          academic_year_id?: string | null
          break_type?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          semester_id?: string | null
          start_date: string
        }
        Update: {
          academic_year_id?: string | null
          break_type?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          semester_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_breaks_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_breaks_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_deadlines: {
        Row: {
          academic_year_id: string | null
          audience: string | null
          created_at: string | null
          created_by: string | null
          deadline_type: string
          description: string | null
          due_at: string
          id: string
          is_published: boolean | null
          metadata: Json | null
          reminder_days_before: number[] | null
          reminder_sent: boolean | null
          term_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          academic_year_id?: string | null
          audience?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline_type: string
          description?: string | null
          due_at: string
          id?: string
          is_published?: boolean | null
          metadata?: Json | null
          reminder_days_before?: number[] | null
          reminder_sent?: boolean | null
          term_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string | null
          audience?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline_type?: string
          description?: string | null
          due_at?: string
          id?: string
          is_published?: boolean | null
          metadata?: Json | null
          reminder_days_before?: number[] | null
          reminder_sent?: boolean | null
          term_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_deadlines_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_deadlines_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_events: {
        Row: {
          academic_year_id: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string | null
          id: string
          is_mandatory: boolean | null
          is_virtual: boolean | null
          location: string | null
          meeting_url: string | null
          semester_id: string | null
          target_audience: string | null
          title: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          is_mandatory?: boolean | null
          is_virtual?: boolean | null
          location?: string | null
          meeting_url?: string | null
          semester_id?: string | null
          target_audience?: string | null
          title: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          is_mandatory?: boolean | null
          is_virtual?: boolean | null
          location?: string | null
          meeting_url?: string | null
          semester_id?: string | null
          target_audience?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_events_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_events_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_integrity_alerts: {
        Row: {
          check_key: string
          created_at: string
          details_json: Json
          detection_count: number
          entity_id: string | null
          entity_type: string
          first_detected_at: string
          id: string
          last_detected_at: string
          resolution_reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["integrity_alert_severity"]
          status: Database["public"]["Enums"]["integrity_alert_status"]
          title: string
          updated_at: string
        }
        Insert: {
          check_key: string
          created_at?: string
          details_json?: Json
          detection_count?: number
          entity_id?: string | null
          entity_type: string
          first_detected_at?: string
          id?: string
          last_detected_at?: string
          resolution_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["integrity_alert_severity"]
          status?: Database["public"]["Enums"]["integrity_alert_status"]
          title: string
          updated_at?: string
        }
        Update: {
          check_key?: string
          created_at?: string
          details_json?: Json
          detection_count?: number
          entity_id?: string | null
          entity_type?: string
          first_detected_at?: string
          id?: string
          last_detected_at?: string
          resolution_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["integrity_alert_severity"]
          status?: Database["public"]["Enums"]["integrity_alert_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      academic_notifications: {
        Row: {
          body: string
          channel: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          notification_type: string
          related_id: string | null
          related_type: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          channel?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          related_id?: string | null
          related_type?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          related_id?: string | null
          related_type?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      academic_standing_audit: {
        Row: {
          created_at: string
          id: string
          inputs_snapshot: Json
          new_standing: string
          previous_standing: string | null
          term_id: string | null
          triggered_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs_snapshot?: Json
          new_standing: string
          previous_standing?: string | null
          term_id?: string | null
          triggered_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs_snapshot?: Json
          new_standing?: string
          previous_standing?: string | null
          term_id?: string | null
          triggered_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      academic_terms: {
        Row: {
          add_drop_ends_on: string | null
          code: string | null
          created_at: string | null
          created_by: string | null
          end_date: string
          ends_on: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          start_date: string
          starts_on: string
          status: Database["public"]["Enums"]["academic_term_status"]
          term_type: Database["public"]["Enums"]["academic_term_type"]
          updated_at: string
          withdraw_ends_on: string | null
        }
        Insert: {
          add_drop_ends_on?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date: string
          ends_on: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          start_date: string
          starts_on: string
          status?: Database["public"]["Enums"]["academic_term_status"]
          term_type?: Database["public"]["Enums"]["academic_term_type"]
          updated_at?: string
          withdraw_ends_on?: string | null
        }
        Update: {
          add_drop_ends_on?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          ends_on?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          start_date?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["academic_term_status"]
          term_type?: Database["public"]["Enums"]["academic_term_type"]
          updated_at?: string
          withdraw_ends_on?: string | null
        }
        Relationships: []
      }
      academic_years: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          institution_id: string | null
          is_active: boolean | null
          name: string
          start_date: string
          status: string | null
          updated_at: string | null
          year_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          name: string
          start_date: string
          status?: string | null
          updated_at?: string | null
          year_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          name?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
          year_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      accreditation_blueprint: {
        Row: {
          course_id: string | null
          created_at: string
          degree_program_id: string
          id: string
          notes: string | null
          prerequisite_slot_id: string | null
          slot_title: string
          slot_type: string
          status: string
          target_credits: number
          term_recommended: string | null
          updated_at: string
          year_recommended: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          degree_program_id: string
          id?: string
          notes?: string | null
          prerequisite_slot_id?: string | null
          slot_title: string
          slot_type: string
          status?: string
          target_credits?: number
          term_recommended?: string | null
          updated_at?: string
          year_recommended?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          degree_program_id?: string
          id?: string
          notes?: string | null
          prerequisite_slot_id?: string | null
          slot_title?: string
          slot_type?: string
          status?: string
          target_credits?: number
          term_recommended?: string | null
          updated_at?: string
          year_recommended?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accreditation_blueprint_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_blueprint_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "accreditation_blueprint_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_blueprint_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_blueprint_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "accreditation_blueprint_prerequisite_slot_id_fkey"
            columns: ["prerequisite_slot_id"]
            isOneToOne: false
            referencedRelation: "accreditation_blueprint"
            referencedColumns: ["id"]
          },
        ]
      }
      accreditation_evidence: {
        Row: {
          attribution_user_id: string | null
          control_id: string
          created_at: string
          description: string | null
          evidence_expiry_date: string | null
          evidence_type: string
          framework: string | null
          id: string
          last_reviewed_at: string | null
          metadata: Json
          program_id: string | null
          review_due_at: string | null
          reviewed_by: string | null
          source_url: string | null
          title: string
          updated_at: string
          verification_state: Database["public"]["Enums"]["evidence_verification_state"]
        }
        Insert: {
          attribution_user_id?: string | null
          control_id: string
          created_at?: string
          description?: string | null
          evidence_expiry_date?: string | null
          evidence_type: string
          framework?: string | null
          id?: string
          last_reviewed_at?: string | null
          metadata?: Json
          program_id?: string | null
          review_due_at?: string | null
          reviewed_by?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["evidence_verification_state"]
        }
        Update: {
          attribution_user_id?: string | null
          control_id?: string
          created_at?: string
          description?: string | null
          evidence_expiry_date?: string | null
          evidence_type?: string
          framework?: string | null
          id?: string
          last_reviewed_at?: string | null
          metadata?: Json
          program_id?: string | null
          review_due_at?: string | null
          reviewed_by?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["evidence_verification_state"]
        }
        Relationships: []
      }
      achievements: {
        Row: {
          category: string
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          scrollcoin_reward: number | null
          xp_reward: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          scrollcoin_reward?: number | null
          xp_reward?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          scrollcoin_reward?: number | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      adaptive_quiz_attempts: {
        Row: {
          completed_at: string | null
          difficulty_progression: Json
          id: string
          questions_presented: Json
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          difficulty_progression: Json
          id?: string
          questions_presented: Json
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          difficulty_progression?: Json
          id?: string
          questions_presented?: Json
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          context_summary: string | null
          created_at: string | null
          faculty: string
          id: string
          institution_id: string | null
          learning_insights: Json | null
          messages: Json | null
          subject: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context_summary?: string | null
          created_at?: string | null
          faculty: string
          id?: string
          institution_id?: string | null
          learning_insights?: Json | null
          messages?: Json | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context_summary?: string | null
          created_at?: string | null
          faculty?: string
          id?: string
          institution_id?: string | null
          learning_insights?: Json | null
          messages?: Json | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_tutor_common_questions: {
        Row: {
          category: string | null
          frequency: number
          id: string
          last_asked: string
          question: string
        }
        Insert: {
          category?: string | null
          frequency?: number
          id?: string
          last_asked?: string
          question: string
        }
        Update: {
          category?: string | null
          frequency?: number
          id?: string
          last_asked?: string
          question?: string
        }
        Relationships: []
      }
      ai_tutor_interactions: {
        Row: {
          created_at: string
          id: string
          institution_id: string | null
          interaction_type: string | null
          module_id: string | null
          question: string
          response: string
          response_time: number | null
          satisfaction_rating: number | null
          session_duration: number | null
          tutor_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id?: string | null
          interaction_type?: string | null
          module_id?: string | null
          question: string
          response: string
          response_time?: number | null
          satisfaction_rating?: number | null
          session_duration?: number | null
          tutor_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string | null
          interaction_type?: string | null
          module_id?: string | null
          question?: string
          response?: string
          response_time?: number | null
          satisfaction_rating?: number | null
          session_duration?: number | null
          tutor_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_interactions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutor_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          sender_type: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_type: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_tutor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutor_sessions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          institution_id: string
          module_id: string | null
          satisfaction_rating: number | null
          started_at: string | null
          status: string | null
          total_messages: number | null
          tutor_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          institution_id: string
          module_id?: string | null
          satisfaction_rating?: number | null
          started_at?: string | null
          status?: string | null
          total_messages?: number | null
          tutor_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          institution_id?: string
          module_id?: string | null
          satisfaction_rating?: number | null
          started_at?: string | null
          status?: string | null
          total_messages?: number | null
          tutor_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutor_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutor_sessions_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "ai_tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutor_videos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          institution_id: string | null
          module_id: string | null
          title: string
          tutor_id: string | null
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          institution_id?: string | null
          module_id?: string | null
          title: string
          tutor_id?: string | null
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          institution_id?: string | null
          module_id?: string | null
          title?: string
          tutor_id?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_videos_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutors: {
        Row: {
          avatar_image_url: string | null
          created_at: string | null
          description: string | null
          faculty_id: string | null
          id: string
          institution_id: string | null
          is_online: boolean | null
          name: string
          personality_prompt: string | null
          specialty: string
          voice_id: string | null
        }
        Insert: {
          avatar_image_url?: string | null
          created_at?: string | null
          description?: string | null
          faculty_id?: string | null
          id?: string
          institution_id?: string | null
          is_online?: boolean | null
          name: string
          personality_prompt?: string | null
          specialty: string
          voice_id?: string | null
        }
        Update: {
          avatar_image_url?: string | null
          created_at?: string | null
          description?: string | null
          faculty_id?: string | null
          id?: string
          institution_id?: string | null
          is_online?: boolean | null
          name?: string
          personality_prompt?: string | null
          specialty?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutors_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutors_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
          {
            foreignKeyName: "ai_tutors_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      alumni_profiles: {
        Row: {
          available_for_mentorship: boolean
          bio: string | null
          cert_number: string | null
          created_at: string
          current_position: string | null
          display_name: string
          graduation_year: number | null
          headline: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          organization: string | null
          primary_degree: string | null
          public_visibility: boolean
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          available_for_mentorship?: boolean
          bio?: string | null
          cert_number?: string | null
          created_at?: string
          current_position?: string | null
          display_name: string
          graduation_year?: number | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          organization?: string | null
          primary_degree?: string | null
          public_visibility?: boolean
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          available_for_mentorship?: boolean
          bio?: string | null
          cert_number?: string | null
          created_at?: string
          current_position?: string | null
          display_name?: string
          graduation_year?: number | null
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          organization?: string | null
          primary_degree?: string | null
          public_visibility?: boolean
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      assessment_attempts: {
        Row: {
          assignment_id: string
          attempt_no: number
          drawn_question_ids: Json
          graded_at: string | null
          graded_by: string | null
          id: string
          integrity_flags: Json
          max_score: number | null
          responses: Json
          score: number | null
          started_at: string
          status: string
          submitted_at: string | null
          time_limit_seconds: number | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          attempt_no?: number
          drawn_question_ids?: Json
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          integrity_flags?: Json
          max_score?: number | null
          responses?: Json
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          time_limit_seconds?: number | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          attempt_no?: number
          drawn_question_ids?: Json
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          integrity_flags?: Json
          max_score?: number | null
          responses?: Json
          score?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          time_limit_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assessment_attempts_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assessment_attempts_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assessment_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assessment_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assessment_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      assessment_audit_logs: {
        Row: {
          actor_id: string | null
          attempt_id: string
          created_at: string
          event_type: string
          id: string
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          attempt_id: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          attempt_id?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_audit_logs_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_effectiveness_reviews: {
        Row: {
          action_plan: string | null
          created_at: string
          findings: string
          id: string
          plo_attainment_summary: Json
          program_id: string
          review_due_at: string | null
          reviewed_at: string
          reviewed_by: string
          term_id: string | null
          updated_at: string
          verification_state: Database["public"]["Enums"]["evidence_verification_state"]
        }
        Insert: {
          action_plan?: string | null
          created_at?: string
          findings: string
          id?: string
          plo_attainment_summary?: Json
          program_id: string
          review_due_at?: string | null
          reviewed_at?: string
          reviewed_by: string
          term_id?: string | null
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["evidence_verification_state"]
        }
        Update: {
          action_plan?: string | null
          created_at?: string
          findings?: string
          id?: string
          plo_attainment_summary?: Json
          program_id?: string
          review_due_at?: string | null
          reviewed_at?: string
          reviewed_by?: string
          term_id?: string | null
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["evidence_verification_state"]
        }
        Relationships: []
      }
      assessment_question_pools: {
        Row: {
          assignment_id: string
          created_at: string
          draw_count: number
          id: string
          questions: Json
          shuffle: boolean
          time_limit_seconds: number | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          draw_count?: number
          id?: string
          questions?: Json
          shuffle?: boolean
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          draw_count?: number
          id?: string
          questions?: Json
          shuffle?: boolean
          time_limit_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_question_pools_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          institution_id: string | null
          module_id: string | null
          published: boolean | null
          title: string | null
          total_points: number | null
          type: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          institution_id?: string | null
          module_id?: string | null
          published?: boolean | null
          title?: string | null
          total_points?: number | null
          type?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          institution_id?: string | null
          module_id?: string | null
          published?: boolean | null
          title?: string | null
          total_points?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "assignments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean | null
          line1: string
          line2: string | null
          postal_code: string
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean | null
          line1: string
          line2?: string | null
          postal_code: string
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean | null
          line1?: string
          line2?: string | null
          postal_code?: string
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      canonical_faculties: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      capstone_tracks: {
        Row: {
          created_at: string
          description: string
          duration_weeks: number
          faculty_area: string
          id: string
          learning_outcomes: string[]
          level: number
          prerequisites: string[]
          primary_source_reading_list: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          duration_weeks?: number
          faculty_area: string
          id?: string
          learning_outcomes?: string[]
          level: number
          prerequisites?: string[]
          primary_source_reading_list?: Json
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_weeks?: number
          faculty_area?: string
          id?: string
          learning_outcomes?: string[]
          level?: number
          prerequisites?: string[]
          primary_source_reading_list?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_expansion_progress: {
        Row: {
          current_course_count: number
          faculty_area: string
          id: string
          notes: string | null
          target_course_count: number
          updated_at: string
        }
        Insert: {
          current_course_count?: number
          faculty_area: string
          id?: string
          notes?: string | null
          target_course_count?: number
          updated_at?: string
        }
        Update: {
          current_course_count?: number
          faculty_area?: string
          id?: string
          notes?: string | null
          target_course_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      certificate_verifications: {
        Row: {
          cert_number: string
          cert_type: string
          created_at: string
          entity_id: string | null
          id: string
          issued_at: string
          metadata: Json
          program_name: string
          revoked: boolean
          revoked_at: string | null
          revoked_reason: string | null
          seal_hash: string
          student_id_code: string | null
          student_name: string
          user_id: string
        }
        Insert: {
          cert_number: string
          cert_type: string
          created_at?: string
          entity_id?: string | null
          id?: string
          issued_at?: string
          metadata?: Json
          program_name: string
          revoked?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
          seal_hash: string
          student_id_code?: string | null
          student_name: string
          user_id: string
        }
        Update: {
          cert_number?: string
          cert_type?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          issued_at?: string
          metadata?: Json
          program_name?: string
          revoked?: boolean
          revoked_at?: string | null
          revoked_reason?: string | null
          seal_hash?: string
          student_id_code?: string | null
          student_name?: string
          user_id?: string
        }
        Relationships: []
      }
      claim_evidence_links: {
        Row: {
          claim_id: string
          created_at: string
          evidence_expires_at: string | null
          evidence_id: string
          evidence_summary: string | null
          evidence_table: string
          evidence_verified: boolean
          id: string
          linked_by: string | null
        }
        Insert: {
          claim_id: string
          created_at?: string
          evidence_expires_at?: string | null
          evidence_id: string
          evidence_summary?: string | null
          evidence_table: string
          evidence_verified?: boolean
          id?: string
          linked_by?: string | null
        }
        Update: {
          claim_id?: string
          created_at?: string
          evidence_expires_at?: string | null
          evidence_id?: string
          evidence_summary?: string | null
          evidence_table?: string
          evidence_verified?: boolean
          id?: string
          linked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_evidence_links_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "public_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          attendance_count: number | null
          course_id: string | null
          created_at: string | null
          day_of_week: string | null
          description: string | null
          end_time: string
          id: string
          is_virtual: boolean | null
          meeting_url: string | null
          module_id: string | null
          recording_url: string | null
          room_location: string | null
          scheduled_date: string
          semester_id: string | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attendance_count?: number | null
          course_id?: string | null
          created_at?: string | null
          day_of_week?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_virtual?: boolean | null
          meeting_url?: string | null
          module_id?: string | null
          recording_url?: string | null
          room_location?: string | null
          scheduled_date: string
          semester_id?: string | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attendance_count?: number | null
          course_id?: string | null
          created_at?: string | null
          day_of_week?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_virtual?: boolean | null
          meeting_url?: string | null
          module_id?: string | null
          recording_url?: string | null
          room_location?: string | null
          scheduled_date?: string
          semester_id?: string | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "class_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      clo_plo_mapping: {
        Row: {
          clo_id: string
          plo_id: string
        }
        Insert: {
          clo_id: string
          plo_id: string
        }
        Update: {
          clo_id?: string
          plo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clo_plo_mapping_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "course_learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clo_plo_mapping_plo_id_fkey"
            columns: ["plo_id"]
            isOneToOne: false
            referencedRelation: "program_learning_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_outcome_metrics: {
        Row: {
          cohort_year: number
          computed_at: string
          computed_by: string | null
          employer_verified_count: number
          excluded_cohorts: string | null
          field_aligned_count: number
          id: string
          insufficient_evidence_reason: string | null
          is_public: boolean
          median_time_to_employment_days: number | null
          methodology_notes: string | null
          practicum_completion_count: number
          program_id: string | null
          program_name: string
          reporting_window_end: string
          reporting_window_start: string
          research_outputs_count: number
          self_reported_count: number
          total_graduates: number
          verified_sample_size: number
        }
        Insert: {
          cohort_year: number
          computed_at?: string
          computed_by?: string | null
          employer_verified_count?: number
          excluded_cohorts?: string | null
          field_aligned_count?: number
          id?: string
          insufficient_evidence_reason?: string | null
          is_public?: boolean
          median_time_to_employment_days?: number | null
          methodology_notes?: string | null
          practicum_completion_count?: number
          program_id?: string | null
          program_name: string
          reporting_window_end: string
          reporting_window_start: string
          research_outputs_count?: number
          self_reported_count?: number
          total_graduates?: number
          verified_sample_size?: number
        }
        Update: {
          cohort_year?: number
          computed_at?: string
          computed_by?: string | null
          employer_verified_count?: number
          excluded_cohorts?: string | null
          field_aligned_count?: number
          id?: string
          insufficient_evidence_reason?: string | null
          is_public?: boolean
          median_time_to_employment_days?: number | null
          methodology_notes?: string | null
          practicum_completion_count?: number
          program_id?: string | null
          program_name?: string
          reporting_window_end?: string
          reporting_window_start?: string
          research_outputs_count?: number
          self_reported_count?: number
          total_graduates?: number
          verified_sample_size?: number
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          likes_count: number
          tags: string[]
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number
          tags?: string[]
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          likes_count?: number
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      competency_matrices: {
        Row: {
          created_at: string | null
          degree_level: Database["public"]["Enums"]["scroll_degree_level"]
          description: string | null
          estimated_duration_weeks: number | null
          faculty_id: string | null
          id: string
          name: string
          required_skills: Json
          total_xp_required: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          degree_level: Database["public"]["Enums"]["scroll_degree_level"]
          description?: string | null
          estimated_duration_weeks?: number | null
          faculty_id?: string | null
          id?: string
          name: string
          required_skills?: Json
          total_xp_required?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          degree_level?: Database["public"]["Enums"]["scroll_degree_level"]
          description?: string | null
          estimated_duration_weeks?: number | null
          faculty_id?: string | null
          id?: string
          name?: string
          required_skills?: Json
          total_xp_required?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competency_matrices_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_matrices_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
        ]
      }
      completion_seals: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          revocation_reason: string | null
          revoked_at: string | null
          seal_status: string
          updated_at: string | null
          verification_criteria: Json
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          seal_status?: string
          updated_at?: string | null
          verification_criteria: Json
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          seal_status?: string
          updated_at?: string | null
          verification_criteria?: Json
          verified_at?: string | null
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string | null
          is_group: boolean | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_group?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_group?: boolean | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_institution_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_certificates: {
        Row: {
          certificate_url: string | null
          completion_date: string | null
          course_id: string
          created_at: string | null
          id: string
          scroll_badge_earned: boolean | null
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          completion_date?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          scroll_badge_earned?: boolean | null
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          completion_date?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          scroll_badge_earned?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
        ]
      }
      course_credit_standards: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          contact_hours: number
          course_id: string
          created_at: string
          credit_hours: number
          id: string
          level: string
          out_of_class_hours: number
          rationale: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          contact_hours: number
          course_id: string
          created_at?: string
          credit_hours: number
          id?: string
          level?: string
          out_of_class_hours?: number
          rationale?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          contact_hours?: number
          course_id?: string
          created_at?: string
          credit_hours?: number
          id?: string
          level?: string
          out_of_class_hours?: number
          rationale?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      course_evidence_requirements: {
        Row: {
          assessment_evidence: Json
          course_id: string
          created_at: string
          faculty_author: string | null
          id: string
          last_reviewed_at: string | null
          notes: string | null
          required_readings: Json
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          assessment_evidence?: Json
          course_id: string
          created_at?: string
          faculty_author?: string | null
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          required_readings?: Json
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          assessment_evidence?: Json
          course_id?: string
          created_at?: string
          faculty_author?: string | null
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          required_readings?: Json
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_evidence_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_evidence_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
        ]
      }
      course_learning_outcomes: {
        Row: {
          bloom_level: string | null
          code: string
          course_id: string
          created_at: string
          id: string
          statement: string
        }
        Insert: {
          bloom_level?: string | null
          code: string
          course_id: string
          created_at?: string
          id?: string
          statement: string
        }
        Update: {
          bloom_level?: string | null
          code?: string
          course_id?: string
          created_at?: string
          id?: string
          statement?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_learning_outcomes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_learning_outcomes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
        ]
      }
      course_materials: {
        Row: {
          created_at: string | null
          id: string
          module_id: string | null
          title: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          title: string
          type: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          title?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          activities: Json
          content: Json | null
          content_char_count: number | null
          content_md: string | null
          course_id: string | null
          created_at: string | null
          duration_minutes: number | null
          estimated_duration_min: number | null
          has_audio_script: boolean | null
          has_study_guide: boolean | null
          has_video_script: boolean | null
          id: string
          institution_id: string
          learning_objectives: Json
          material_url: string | null
          module_prerequisites: Json
          module_references: Json
          order_index: number | null
          quality_verified: boolean | null
          quiz_data: Json | null
          rewards_amount: number | null
          title: string
          tutor_context: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          activities?: Json
          content?: Json | null
          content_char_count?: number | null
          content_md?: string | null
          course_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          estimated_duration_min?: number | null
          has_audio_script?: boolean | null
          has_study_guide?: boolean | null
          has_video_script?: boolean | null
          id?: string
          institution_id: string
          learning_objectives?: Json
          material_url?: string | null
          module_prerequisites?: Json
          module_references?: Json
          order_index?: number | null
          quality_verified?: boolean | null
          quiz_data?: Json | null
          rewards_amount?: number | null
          title: string
          tutor_context?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          activities?: Json
          content?: Json | null
          content_char_count?: number | null
          content_md?: string | null
          course_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          estimated_duration_min?: number | null
          has_audio_script?: boolean | null
          has_study_guide?: boolean | null
          has_video_script?: boolean | null
          id?: string
          institution_id?: string
          learning_objectives?: Json
          material_url?: string | null
          module_prerequisites?: Json
          module_references?: Json
          order_index?: number | null
          quality_verified?: boolean | null
          quiz_data?: Json | null
          rewards_amount?: number | null
          title?: string
          tutor_context?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_modules_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_offerings: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          term_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          term_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_offerings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_offerings_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      course_recommendations: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          reason: string
          relevance_score: number
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          reason: string
          relevance_score: number
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          reason?: string
          relevance_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_recommendations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_recommendations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string | null
          helpful_count: number | null
          id: string
          rating: number
          review_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
        ]
      }
      courses: {
        Row: {
          career_track: string[] | null
          created_at: string | null
          credit_hours: number | null
          curriculum_status:
            | Database["public"]["Enums"]["curriculum_status"]
            | null
          department_id: string | null
          description: string | null
          duration: string | null
          estimated_duration_hours: number | null
          faculty: string | null
          faculty_author_id: string | null
          faculty_id: string | null
          id: string
          institution_id: string
          last_reviewed_at: string | null
          learning_outcomes: Json | null
          learning_progression: Json | null
          level: string | null
          locked_at: string | null
          locked_baseline: boolean | null
          locked_by: string | null
          prerequisite_courses: Json | null
          preview_video_url: string | null
          price: number | null
          price_cents: number | null
          rating: number | null
          reviewed_by: string | null
          scholarship_eligible: boolean | null
          scroll_coin_cost: number | null
          students: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          visibility: string
          xr_enabled: boolean | null
        }
        Insert: {
          career_track?: string[] | null
          created_at?: string | null
          credit_hours?: number | null
          curriculum_status?:
            | Database["public"]["Enums"]["curriculum_status"]
            | null
          department_id?: string | null
          description?: string | null
          duration?: string | null
          estimated_duration_hours?: number | null
          faculty?: string | null
          faculty_author_id?: string | null
          faculty_id?: string | null
          id?: string
          institution_id: string
          last_reviewed_at?: string | null
          learning_outcomes?: Json | null
          learning_progression?: Json | null
          level?: string | null
          locked_at?: string | null
          locked_baseline?: boolean | null
          locked_by?: string | null
          prerequisite_courses?: Json | null
          preview_video_url?: string | null
          price?: number | null
          price_cents?: number | null
          rating?: number | null
          reviewed_by?: string | null
          scholarship_eligible?: boolean | null
          scroll_coin_cost?: number | null
          students?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          visibility?: string
          xr_enabled?: boolean | null
        }
        Update: {
          career_track?: string[] | null
          created_at?: string | null
          credit_hours?: number | null
          curriculum_status?:
            | Database["public"]["Enums"]["curriculum_status"]
            | null
          department_id?: string | null
          description?: string | null
          duration?: string | null
          estimated_duration_hours?: number | null
          faculty?: string | null
          faculty_author_id?: string | null
          faculty_id?: string | null
          id?: string
          institution_id?: string
          last_reviewed_at?: string | null
          learning_outcomes?: Json | null
          learning_progression?: Json | null
          level?: string | null
          locked_at?: string | null
          locked_baseline?: boolean | null
          locked_by?: string | null
          prerequisite_courses?: Json | null
          preview_video_url?: string | null
          price?: number | null
          price_cents?: number | null
          rating?: number | null
          reviewed_by?: string | null
          scholarship_eligible?: boolean | null
          scroll_coin_cost?: number | null
          students?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          visibility?: string
          xr_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
          {
            foreignKeyName: "courses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_verification_log: {
        Row: {
          credential_token: string
          credential_type: string | null
          id: string
          outcome: string
          verified_at: string
          verified_subject: string | null
          verifier_ip: string | null
          verifier_org: string | null
        }
        Insert: {
          credential_token: string
          credential_type?: string | null
          id?: string
          outcome: string
          verified_at?: string
          verified_subject?: string | null
          verifier_ip?: string | null
          verifier_org?: string | null
        }
        Update: {
          credential_token?: string
          credential_type?: string | null
          id?: string
          outcome?: string
          verified_at?: string
          verified_subject?: string | null
          verifier_ip?: string | null
          verifier_org?: string | null
        }
        Relationships: []
      }
      credential_verifications: {
        Row: {
          access_token: string | null
          accessed_at: string | null
          blockchain_verification: string | null
          created_at: string | null
          credentials_requested: Json | null
          expires_at: string | null
          id: string
          requester_email: string
          requester_organization: string | null
          user_id: string
          verification_result: Json | null
          verification_status: string | null
          verification_type: string | null
        }
        Insert: {
          access_token?: string | null
          accessed_at?: string | null
          blockchain_verification?: string | null
          created_at?: string | null
          credentials_requested?: Json | null
          expires_at?: string | null
          id?: string
          requester_email: string
          requester_organization?: string | null
          user_id: string
          verification_result?: Json | null
          verification_status?: string | null
          verification_type?: string | null
        }
        Update: {
          access_token?: string | null
          accessed_at?: string | null
          blockchain_verification?: string | null
          created_at?: string | null
          credentials_requested?: Json | null
          expires_at?: string | null
          id?: string
          requester_email?: string
          requester_organization?: string | null
          user_id?: string
          verification_result?: Json | null
          verification_status?: string | null
          verification_type?: string | null
        }
        Relationships: []
      }
      curriculum_depth_scores: {
        Row: {
          assessment_diversity: number
          computed_at: string
          faculty_reviewed_courses: number
          gate_passed: boolean
          gate_reasons: Json
          has_practicum: boolean
          has_research: boolean
          instructional_hours: number
          module_count: number
          outcomes_count: number
          program_id: string
          reference_density: number
          sequencing_score: number
          total_score: number
        }
        Insert: {
          assessment_diversity?: number
          computed_at?: string
          faculty_reviewed_courses?: number
          gate_passed?: boolean
          gate_reasons?: Json
          has_practicum?: boolean
          has_research?: boolean
          instructional_hours?: number
          module_count?: number
          outcomes_count?: number
          program_id: string
          reference_density?: number
          sequencing_score?: number
          total_score?: number
        }
        Update: {
          assessment_diversity?: number
          computed_at?: string
          faculty_reviewed_courses?: number
          gate_passed?: boolean
          gate_reasons?: Json
          has_practicum?: boolean
          has_research?: boolean
          instructional_hours?: number
          module_count?: number
          outcomes_count?: number
          program_id?: string
          reference_density?: number
          sequencing_score?: number
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_depth_scores_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_depth_scores_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_depth_scores_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      degree_analytics: {
        Row: {
          assessments_completed: number | null
          assessments_passed: number | null
          average_score: number | null
          completion_rate: number | null
          created_at: string | null
          engagement_score: number | null
          faculty_id: string | null
          id: string
          intervention_flags: Json | null
          mentorship_hours: number | null
          metrics_type: string | null
          period_end: string
          period_start: string
          predictive_success_score: number | null
          prophetic_score_avg: number | null
          scroll_alignment_avg: number | null
          scrollgold_earned: number | null
          skills_acquired: number | null
          user_id: string | null
          xp_earned: number | null
        }
        Insert: {
          assessments_completed?: number | null
          assessments_passed?: number | null
          average_score?: number | null
          completion_rate?: number | null
          created_at?: string | null
          engagement_score?: number | null
          faculty_id?: string | null
          id?: string
          intervention_flags?: Json | null
          mentorship_hours?: number | null
          metrics_type?: string | null
          period_end: string
          period_start: string
          predictive_success_score?: number | null
          prophetic_score_avg?: number | null
          scroll_alignment_avg?: number | null
          scrollgold_earned?: number | null
          skills_acquired?: number | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Update: {
          assessments_completed?: number | null
          assessments_passed?: number | null
          average_score?: number | null
          completion_rate?: number | null
          created_at?: string | null
          engagement_score?: number | null
          faculty_id?: string | null
          id?: string
          intervention_flags?: Json | null
          mentorship_hours?: number | null
          metrics_type?: string | null
          period_end?: string
          period_start?: string
          predictive_success_score?: number | null
          prophetic_score_avg?: number | null
          scroll_alignment_avg?: number | null
          scrollgold_earned?: number | null
          skills_acquired?: number | null
          user_id?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "degree_analytics_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_analytics_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
        ]
      }
      degree_applications: {
        Row: {
          applied_at: string | null
          conditions: string | null
          created_at: string | null
          degree_id: string
          id: string
          prerequisites_met: Json | null
          qualifications_submitted: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          conditions?: string | null
          created_at?: string | null
          degree_id: string
          id?: string
          prerequisites_met?: Json | null
          qualifications_submitted?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          conditions?: string | null
          created_at?: string | null
          degree_id?: string
          id?: string
          prerequisites_met?: Json | null
          qualifications_submitted?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "degree_applications_degree_id_fkey"
            columns: ["degree_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_applications_degree_id_fkey"
            columns: ["degree_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_applications_degree_id_fkey"
            columns: ["degree_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      degree_course_requirements: {
        Row: {
          course_id: string
          created_at: string
          credits: number
          degree_id: string
          id: string
          is_required: boolean
          prerequisite_course_id: string | null
          semester_recommended: number | null
        }
        Insert: {
          course_id: string
          created_at?: string
          credits?: number
          degree_id: string
          id?: string
          is_required?: boolean
          prerequisite_course_id?: string | null
          semester_recommended?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string
          credits?: number
          degree_id?: string
          id?: string
          is_required?: boolean
          prerequisite_course_id?: string | null
          semester_recommended?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "degree_course_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_course_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "degree_course_requirements_degree_id_fkey"
            columns: ["degree_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_course_requirements_degree_id_fkey"
            columns: ["degree_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_course_requirements_degree_id_fkey"
            columns: ["degree_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "degree_course_requirements_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_course_requirements_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
        ]
      }
      degree_prerequisites: {
        Row: {
          alternative_path: string | null
          created_at: string | null
          degree_level: string
          description: string
          id: string
          is_required: boolean | null
          min_courses_completed: number | null
          min_credits: number | null
          min_xp: number | null
          prerequisite_level: string | null
          prerequisite_type: string
        }
        Insert: {
          alternative_path?: string | null
          created_at?: string | null
          degree_level: string
          description: string
          id?: string
          is_required?: boolean | null
          min_courses_completed?: number | null
          min_credits?: number | null
          min_xp?: number | null
          prerequisite_level?: string | null
          prerequisite_type: string
        }
        Update: {
          alternative_path?: string | null
          created_at?: string | null
          degree_level?: string
          description?: string
          id?: string
          is_required?: boolean | null
          min_courses_completed?: number | null
          min_credits?: number | null
          min_xp?: number | null
          prerequisite_level?: string | null
          prerequisite_type?: string
        }
        Relationships: []
      }
      degree_program_courses: {
        Row: {
          course_id: string
          created_at: string
          cross_faculty_approved_at: string | null
          cross_faculty_approved_by: string | null
          cross_faculty_override: boolean
          cross_faculty_reason: string | null
          degree_program_id: string
          id: string
          is_required: boolean
          recommended_term: string | null
          recommended_year: number | null
          sequence_order: number | null
        }
        Insert: {
          course_id: string
          created_at?: string
          cross_faculty_approved_at?: string | null
          cross_faculty_approved_by?: string | null
          cross_faculty_override?: boolean
          cross_faculty_reason?: string | null
          degree_program_id: string
          id?: string
          is_required?: boolean
          recommended_term?: string | null
          recommended_year?: number | null
          sequence_order?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string
          cross_faculty_approved_at?: string | null
          cross_faculty_approved_by?: string | null
          cross_faculty_override?: boolean
          cross_faculty_reason?: string | null
          degree_program_id?: string
          id?: string
          is_required?: boolean
          recommended_term?: string | null
          recommended_year?: number | null
          sequence_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "degree_program_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_program_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "degree_program_courses_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_program_courses_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_program_courses_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      degree_programs: {
        Row: {
          accreditation_checked_at: string | null
          accreditation_metrics: Json
          accreditation_status: string
          career_paths: string[] | null
          created_at: string | null
          credential_class:
            | Database["public"]["Enums"]["credential_class"]
            | null
          credit_hour_equivalence: Json | null
          description: string | null
          duration: string | null
          faculty: string | null
          governance_version: string | null
          id: string
          institution_id: string | null
          institutional_layer:
            | Database["public"]["Enums"]["institutional_layer"]
            | null
          instructor_of_record_placeholder: string | null
          is_active: boolean | null
          is_external_facing: boolean
          level: string | null
          lifecycle_status: string
          lock_reason: string | null
          locked_at: string | null
          locked_baseline: boolean | null
          locked_by: string | null
          min_gpa: number | null
          program_status: string | null
          rebuilt_from_id: string | null
          scroll_level: string | null
          spiritual_requirements: Json | null
          title: string
          total_credits: number | null
        }
        Insert: {
          accreditation_checked_at?: string | null
          accreditation_metrics?: Json
          accreditation_status?: string
          career_paths?: string[] | null
          created_at?: string | null
          credential_class?:
            | Database["public"]["Enums"]["credential_class"]
            | null
          credit_hour_equivalence?: Json | null
          description?: string | null
          duration?: string | null
          faculty?: string | null
          governance_version?: string | null
          id?: string
          institution_id?: string | null
          institutional_layer?:
            | Database["public"]["Enums"]["institutional_layer"]
            | null
          instructor_of_record_placeholder?: string | null
          is_active?: boolean | null
          is_external_facing?: boolean
          level?: string | null
          lifecycle_status?: string
          lock_reason?: string | null
          locked_at?: string | null
          locked_baseline?: boolean | null
          locked_by?: string | null
          min_gpa?: number | null
          program_status?: string | null
          rebuilt_from_id?: string | null
          scroll_level?: string | null
          spiritual_requirements?: Json | null
          title: string
          total_credits?: number | null
        }
        Update: {
          accreditation_checked_at?: string | null
          accreditation_metrics?: Json
          accreditation_status?: string
          career_paths?: string[] | null
          created_at?: string | null
          credential_class?:
            | Database["public"]["Enums"]["credential_class"]
            | null
          credit_hour_equivalence?: Json | null
          description?: string | null
          duration?: string | null
          faculty?: string | null
          governance_version?: string | null
          id?: string
          institution_id?: string | null
          institutional_layer?:
            | Database["public"]["Enums"]["institutional_layer"]
            | null
          instructor_of_record_placeholder?: string | null
          is_active?: boolean | null
          is_external_facing?: boolean
          level?: string | null
          lifecycle_status?: string
          lock_reason?: string | null
          locked_at?: string | null
          locked_baseline?: boolean | null
          locked_by?: string | null
          min_gpa?: number | null
          program_status?: string | null
          rebuilt_from_id?: string | null
          scroll_level?: string | null
          spiritual_requirements?: Json | null
          title?: string
          total_credits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "degree_programs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_programs_rebuilt_from_id_fkey"
            columns: ["rebuilt_from_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_programs_rebuilt_from_id_fkey"
            columns: ["rebuilt_from_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_programs_rebuilt_from_id_fkey"
            columns: ["rebuilt_from_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      degree_progress: {
        Row: {
          competency_matrix_id: string | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          current_xp: number | null
          degree_level: Database["public"]["Enums"]["scroll_degree_level"]
          expected_completion_at: string | null
          faculty_id: string | null
          id: string
          milestones_achieved: Json | null
          prophetic_score: number | null
          scroll_alignment_score: number | null
          skills_completed: number | null
          skills_required: number | null
          started_at: string | null
          target_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          competency_matrix_id?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          current_xp?: number | null
          degree_level: Database["public"]["Enums"]["scroll_degree_level"]
          expected_completion_at?: string | null
          faculty_id?: string | null
          id?: string
          milestones_achieved?: Json | null
          prophetic_score?: number | null
          scroll_alignment_score?: number | null
          skills_completed?: number | null
          skills_required?: number | null
          started_at?: string | null
          target_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          competency_matrix_id?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          current_xp?: number | null
          degree_level?: Database["public"]["Enums"]["scroll_degree_level"]
          expected_completion_at?: string | null
          faculty_id?: string | null
          id?: string
          milestones_achieved?: Json | null
          prophetic_score?: number | null
          scroll_alignment_score?: number | null
          skills_completed?: number | null
          skills_required?: number | null
          started_at?: string | null
          target_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "degree_progress_competency_matrix_id_fkey"
            columns: ["competency_matrix_id"]
            isOneToOne: false
            referencedRelation: "competency_matrices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_progress_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "degree_progress_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
        ]
      }
      degree_templates: {
        Row: {
          code: string
          created_at: string
          description: string | null
          duration_years: number
          id: string
          is_active: boolean
          level: string
          max_credits: number | null
          min_courses: number
          min_credits: number
          name: string
          slot_specs: Json
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          duration_years: number
          id?: string
          is_active?: boolean
          level: string
          max_credits?: number | null
          min_courses: number
          min_credits: number
          name: string
          slot_specs: Json
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          duration_years?: number
          id?: string
          is_active?: boolean
          level?: string
          max_credits?: number | null
          min_courses?: number
          min_credits?: number
          name?: string
          slot_specs?: Json
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          faculty_id: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          faculty_id: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          faculty_id?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
        ]
      }
      devotional_completions: {
        Row: {
          completed_at: string | null
          devotional_id: string
          id: string
          note: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          devotional_id: string
          id?: string
          note?: string | null
          rating?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          devotional_id?: string
          id?: string
          note?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_completions_devotional_fkey"
            columns: ["devotional_id"]
            isOneToOne: false
            referencedRelation: "devotionals"
            referencedColumns: ["id"]
          },
        ]
      }
      devotionals: {
        Row: {
          content: string
          created_at: string | null
          date: string
          id: string
          institution_id: string | null
          scripture_reference: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          date: string
          id?: string
          institution_id?: string | null
          scripture_reference?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          date?: string
          id?: string
          institution_id?: string | null
          scripture_reference?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotionals_institution_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "discussion_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          lecture_id: string | null
          likes_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          lecture_id?: string | null
          likes_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          lecture_id?: string | null
          likes_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      divine_assessment_attempts: {
        Row: {
          academic_score: number | null
          ai_evaluation: Json | null
          assessment_id: string
          character_score: number | null
          created_at: string | null
          evaluator_notes: Json | null
          graded_at: string | null
          graded_by: string | null
          id: string
          passed: boolean | null
          plagiarism_check: Json | null
          prophetic_score: number | null
          responses: Json | null
          scroll_alignment_score: number | null
          scrollgold_awarded: number | null
          started_at: string | null
          submitted_at: string | null
          total_score: number | null
          user_id: string
          xp_awarded: number | null
        }
        Insert: {
          academic_score?: number | null
          ai_evaluation?: Json | null
          assessment_id: string
          character_score?: number | null
          created_at?: string | null
          evaluator_notes?: Json | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          passed?: boolean | null
          plagiarism_check?: Json | null
          prophetic_score?: number | null
          responses?: Json | null
          scroll_alignment_score?: number | null
          scrollgold_awarded?: number | null
          started_at?: string | null
          submitted_at?: string | null
          total_score?: number | null
          user_id: string
          xp_awarded?: number | null
        }
        Update: {
          academic_score?: number | null
          ai_evaluation?: Json | null
          assessment_id?: string
          character_score?: number | null
          created_at?: string | null
          evaluator_notes?: Json | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          passed?: boolean | null
          plagiarism_check?: Json | null
          prophetic_score?: number | null
          responses?: Json | null
          scroll_alignment_score?: number | null
          scrollgold_awarded?: number | null
          started_at?: string | null
          submitted_at?: string | null
          total_score?: number | null
          user_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "divine_assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "divine_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      divine_assessments: {
        Row: {
          academic_weight: number | null
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          character_weight: number | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          faculty_id: string | null
          id: string
          is_published: boolean | null
          max_score: number | null
          module_id: string | null
          passing_score: number | null
          prophetic_weight: number | null
          rubric: Json
          scrollgold_reward: number | null
          skills_assessed: string[] | null
          time_limit_minutes: number | null
          title: string
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          academic_weight?: number | null
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          character_weight?: number | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          faculty_id?: string | null
          id?: string
          is_published?: boolean | null
          max_score?: number | null
          module_id?: string | null
          passing_score?: number | null
          prophetic_weight?: number | null
          rubric?: Json
          scrollgold_reward?: number | null
          skills_assessed?: string[] | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          academic_weight?: number | null
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          character_weight?: number | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          faculty_id?: string | null
          id?: string
          is_published?: boolean | null
          max_score?: number | null
          module_id?: string | null
          passing_score?: number | null
          prophetic_weight?: number | null
          rubric?: Json
          scrollgold_reward?: number | null
          skills_assessed?: string[] | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "divine_assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divine_assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "divine_assessments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divine_assessments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
          {
            foreignKeyName: "divine_assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_approvals: {
        Row: {
          approved_at: string
          approved_by: string
          course_id: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          course_id: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          course_id?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elective_approvals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_approvals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "elective_approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "elective_approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "elective_approvals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employment_verifications: {
        Row: {
          country: string | null
          created_at: string
          employer_name: string
          employment_type: string | null
          end_date: string | null
          evidence_source: string | null
          graduate_outcome_id: string | null
          id: string
          is_field_aligned: boolean | null
          job_title: string
          recheck_due_at: string | null
          rejection_reason: string | null
          reviewer_role: string | null
          reviewer_user_id: string | null
          start_date: string | null
          updated_at: string
          user_id: string
          verification_method: string | null
          verification_state: Database["public"]["Enums"]["employment_verification_state"]
          verified_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          employer_name: string
          employment_type?: string | null
          end_date?: string | null
          evidence_source?: string | null
          graduate_outcome_id?: string | null
          id?: string
          is_field_aligned?: boolean | null
          job_title: string
          recheck_due_at?: string | null
          rejection_reason?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
          verification_method?: string | null
          verification_state?: Database["public"]["Enums"]["employment_verification_state"]
          verified_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          employer_name?: string
          employment_type?: string | null
          end_date?: string | null
          evidence_source?: string | null
          graduate_outcome_id?: string | null
          id?: string
          is_field_aligned?: boolean | null
          job_title?: string
          recheck_due_at?: string | null
          rejection_reason?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
          verification_method?: string | null
          verification_state?: Database["public"]["Enums"]["employment_verification_state"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_verifications_graduate_outcome_id_fkey"
            columns: ["graduate_outcome_id"]
            isOneToOne: false
            referencedRelation: "graduate_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_records: {
        Row: {
          course_id: string | null
          course_offering_id: string | null
          created_at: string | null
          credits_earned: number | null
          dropped_at: string | null
          enrolled_at: string | null
          grade: string | null
          grade_points: number | null
          id: string
          notes: string | null
          status: string
          term_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          course_offering_id?: string | null
          created_at?: string | null
          credits_earned?: number | null
          dropped_at?: string | null
          enrolled_at?: string | null
          grade?: string | null
          grade_points?: number | null
          id?: string
          notes?: string | null
          status?: string
          term_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          course_offering_id?: string | null
          created_at?: string | null
          credits_earned?: number | null
          dropped_at?: string | null
          enrolled_at?: string | null
          grade?: string | null
          grade_points?: number | null
          id?: string
          notes?: string | null
          status?: string
          term_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "enrollment_records_course_offering_id_fkey"
            columns: ["course_offering_id"]
            isOneToOne: false
            referencedRelation: "course_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_records_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          institution_id: string
          progress: number | null
          transfer_status: string
          transferred_from_program_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          institution_id: string
          progress?: number | null
          transfer_status?: string
          transferred_from_program_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string
          progress?: number | null
          transfer_status?: string
          transferred_from_program_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "enrollments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_transferred_from_program_id_fkey"
            columns: ["transferred_from_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_transferred_from_program_id_fkey"
            columns: ["transferred_from_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_transferred_from_program_id_fkey"
            columns: ["transferred_from_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_submissions: {
        Row: {
          created_at: string | null
          exam_id: string | null
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          started_at: string | null
          status: string | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exam_id?: string | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          exam_id?: string | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          started_at?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_submissions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          exam_type: string | null
          id: string
          is_published: boolean | null
          passing_score: number | null
          proctored: boolean | null
          scheduled_date: string
          semester_id: string | null
          title: string
          total_points: number | null
          updated_at: string | null
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          exam_type?: string | null
          id?: string
          is_published?: boolean | null
          passing_score?: number | null
          proctored?: boolean | null
          scheduled_date: string
          semester_id?: string | null
          title: string
          total_points?: number | null
          updated_at?: string | null
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          exam_type?: string | null
          id?: string
          is_published?: boolean | null
          passing_score?: number | null
          proctored?: boolean | null
          scheduled_date?: string
          semester_id?: string | null
          title?: string
          total_points?: number | null
          updated_at?: string | null
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "exams_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      external_partnerships: {
        Row: {
          contact_email: string | null
          created_at: string
          evidence_expiry_date: string | null
          id: string
          last_reviewed_at: string | null
          mou_url: string | null
          partner_name: string
          partner_type: string | null
          review_due_at: string | null
          scope: string | null
          updated_at: string
          verification_state: Database["public"]["Enums"]["evidence_verification_state"]
          verified_by: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          evidence_expiry_date?: string | null
          id?: string
          last_reviewed_at?: string | null
          mou_url?: string | null
          partner_name: string
          partner_type?: string | null
          review_due_at?: string | null
          scope?: string | null
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["evidence_verification_state"]
          verified_by?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          evidence_expiry_date?: string | null
          id?: string
          last_reviewed_at?: string | null
          mou_url?: string | null
          partner_name?: string
          partner_type?: string | null
          review_due_at?: string | null
          scope?: string | null
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["evidence_verification_state"]
          verified_by?: string | null
        }
        Relationships: []
      }
      external_standard_mappings: {
        Row: {
          alignment_notes: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          standard_body: string
          standard_code: string
          standard_title: string | null
        }
        Insert: {
          alignment_notes?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          standard_body: string
          standard_code: string
          standard_title?: string | null
        }
        Update: {
          alignment_notes?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          standard_body?: string
          standard_code?: string
          standard_title?: string | null
        }
        Relationships: []
      }
      faculties: {
        Row: {
          created_at: string | null
          dean_id: string | null
          description: string | null
          emblem_url: string | null
          faculty_code: string | null
          id: string
          institution_id: string
          key_scripture: string | null
          mission: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          dean_id?: string | null
          description?: string | null
          emblem_url?: string | null
          faculty_code?: string | null
          id?: string
          institution_id: string
          key_scripture?: string | null
          mission?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          dean_id?: string | null
          description?: string | null
          emblem_url?: string | null
          faculty_code?: string | null
          id?: string
          institution_id?: string
          key_scripture?: string | null
          mission?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculties_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_assignment_audit: {
        Row: {
          actor_id: string
          actor_role: string
          assignment_id: string
          created_at: string
          id: string
          new_state: Database["public"]["Enums"]["faculty_assignment_state"]
          prior_state:
            | Database["public"]["Enums"]["faculty_assignment_state"]
            | null
          rationale: string
        }
        Insert: {
          actor_id: string
          actor_role: string
          assignment_id: string
          created_at?: string
          id?: string
          new_state: Database["public"]["Enums"]["faculty_assignment_state"]
          prior_state?:
            | Database["public"]["Enums"]["faculty_assignment_state"]
            | null
          rationale: string
        }
        Update: {
          actor_id?: string
          actor_role?: string
          assignment_id?: string
          created_at?: string
          id?: string
          new_state?: Database["public"]["Enums"]["faculty_assignment_state"]
          prior_state?:
            | Database["public"]["Enums"]["faculty_assignment_state"]
            | null
          rationale?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_assignment_audit_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "faculty_teaching_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_competency_domains: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          domain_code: string
          domain_label: string
          faculty_user_id: string
          id: string
          level: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          domain_code: string
          domain_label: string
          faculty_user_id: string
          id?: string
          level?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          domain_code?: string
          domain_label?: string
          faculty_user_id?: string
          id?: string
          level?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      faculty_credential_verifications: {
        Row: {
          action: string
          created_at: string
          credential_id: string
          effective_at: string
          id: string
          method: string
          rationale: string
          reviewer_id: string
          reviewer_role: string
        }
        Insert: {
          action: string
          created_at?: string
          credential_id: string
          effective_at?: string
          id?: string
          method: string
          rationale: string
          reviewer_id: string
          reviewer_role: string
        }
        Update: {
          action?: string
          created_at?: string
          credential_id?: string
          effective_at?: string
          id?: string
          method?: string
          rationale?: string
          reviewer_id?: string
          reviewer_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_credential_verifications_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "faculty_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_credentials: {
        Row: {
          created_at: string
          credential_type: string
          document_url: string | null
          evidence_expiry_date: string | null
          faculty_user_id: string
          field: string | null
          id: string
          issued_date: string | null
          issuing_institution: string
          last_reviewed_at: string | null
          level: string | null
          notes: string | null
          review_due_at: string | null
          title: string
          updated_at: string
          verification_state: Database["public"]["Enums"]["evidence_verification_state"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          credential_type: string
          document_url?: string | null
          evidence_expiry_date?: string | null
          faculty_user_id: string
          field?: string | null
          id?: string
          issued_date?: string | null
          issuing_institution: string
          last_reviewed_at?: string | null
          level?: string | null
          notes?: string | null
          review_due_at?: string | null
          title: string
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["evidence_verification_state"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          credential_type?: string
          document_url?: string | null
          evidence_expiry_date?: string | null
          faculty_user_id?: string
          field?: string | null
          id?: string
          issued_date?: string | null
          issuing_institution?: string
          last_reviewed_at?: string | null
          level?: string | null
          notes?: string | null
          review_due_at?: string | null
          title?: string
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["evidence_verification_state"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      faculty_curriculum_reviews: {
        Row: {
          comments: string | null
          course_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewer_id: string
          state: string
          updated_at: string
        }
        Insert: {
          comments?: string | null
          course_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewer_id: string
          state?: string
          updated_at?: string
        }
        Update: {
          comments?: string | null
          course_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_curriculum_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_curriculum_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "faculty_curriculum_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "faculty_curriculum_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_curriculum_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "faculty_curriculum_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      faculty_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      faculty_schedule: {
        Row: {
          course_id: string | null
          created_at: string | null
          faculty_user_id: string
          id: string
          office_hours: Json | null
          role: string | null
          semester_id: string | null
          teaching_load_hours: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          faculty_user_id: string
          id?: string
          office_hours?: Json | null
          role?: string | null
          semester_id?: string | null
          teaching_load_hours?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          faculty_user_id?: string
          id?: string
          office_hours?: Json | null
          role?: string | null
          semester_id?: string | null
          teaching_load_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_schedule_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_schedule_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "faculty_schedule_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_teaching_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          block_reason: string | null
          course_code: string | null
          course_id: string | null
          course_title: string
          created_at: string
          domain_code: string
          end_date: string | null
          faculty_user_id: string
          id: string
          start_date: string | null
          state: Database["public"]["Enums"]["faculty_assignment_state"]
          term_label: string
          updated_at: string
          workload_weight: number
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          block_reason?: string | null
          course_code?: string | null
          course_id?: string | null
          course_title: string
          created_at?: string
          domain_code: string
          end_date?: string | null
          faculty_user_id: string
          id?: string
          start_date?: string | null
          state?: Database["public"]["Enums"]["faculty_assignment_state"]
          term_label: string
          updated_at?: string
          workload_weight?: number
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          block_reason?: string | null
          course_code?: string | null
          course_id?: string | null
          course_title?: string
          created_at?: string
          domain_code?: string
          end_date?: string | null
          faculty_user_id?: string
          id?: string
          start_date?: string | null
          state?: Database["public"]["Enums"]["faculty_assignment_state"]
          term_label?: string
          updated_at?: string
          workload_weight?: number
        }
        Relationships: []
      }
      faculty_workloads: {
        Row: {
          assigned_courses: number | null
          assigned_hours: number | null
          assigned_students: number | null
          created_at: string | null
          faculty_id: string
          id: string
          max_courses: number | null
          max_hours: number | null
          max_students: number | null
          notes: string | null
          overload_approved: boolean | null
          overload_approved_at: string | null
          overload_approved_by: string | null
          term_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_courses?: number | null
          assigned_hours?: number | null
          assigned_students?: number | null
          created_at?: string | null
          faculty_id: string
          id?: string
          max_courses?: number | null
          max_hours?: number | null
          max_students?: number | null
          notes?: string | null
          overload_approved?: boolean | null
          overload_approved_at?: string | null
          overload_approved_by?: string | null
          term_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_courses?: number | null
          assigned_hours?: number | null
          assigned_students?: number | null
          created_at?: string | null
          faculty_id?: string
          id?: string
          max_courses?: number | null
          max_hours?: number | null
          max_students?: number | null
          notes?: string | null
          overload_approved?: boolean | null
          overload_approved_at?: string | null
          overload_approved_by?: string | null
          term_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_workloads_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      fellowship_rooms: {
        Row: {
          created_at: string | null
          current_count: number | null
          description: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          max_capacity: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          current_count?: number | null
          description?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          max_capacity?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          current_count?: number | null
          description?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          max_capacity?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fellowship_rooms_institution_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      founding_cohort_members: {
        Row: {
          cohort_label: string
          consented_at: string | null
          country: string | null
          created_at: string
          display_name: string
          id: string
          is_public: boolean
          photo_url: string | null
          position_number: number | null
          pursuit: string
          testimony: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cohort_label?: string
          consented_at?: string | null
          country?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_public?: boolean
          photo_url?: string | null
          position_number?: number | null
          pursuit: string
          testimony?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cohort_label?: string
          consented_at?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_public?: boolean
          photo_url?: string | null
          position_number?: number | null
          pursuit?: string
          testimony?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      generation_progress: {
        Row: {
          courses_created: number | null
          created_at: string | null
          current_stage: string
          estimated_time_remaining: string | null
          faculties_created: number | null
          id: string
          institution_id: string | null
          modules_created: number | null
          progress: number | null
          tutors_created: number | null
          updated_at: string | null
        }
        Insert: {
          courses_created?: number | null
          created_at?: string | null
          current_stage: string
          estimated_time_remaining?: string | null
          faculties_created?: number | null
          id?: string
          institution_id?: string | null
          modules_created?: number | null
          progress?: number | null
          tutors_created?: number | null
          updated_at?: string | null
        }
        Update: {
          courses_created?: number | null
          created_at?: string | null
          current_stage?: string
          estimated_time_remaining?: string | null
          faculties_created?: number | null
          id?: string
          institution_id?: string | null
          modules_created?: number | null
          progress?: number | null
          tutors_created?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_progress_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_records: {
        Row: {
          course_id: string
          created_at: string
          credit_hours: number
          finalized_at: string | null
          grade_points: number | null
          id: string
          letter_grade: string | null
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          status: Database["public"]["Enums"]["grade_status"]
          student_id: string
          term_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          credit_hours: number
          finalized_at?: string | null
          grade_points?: number | null
          id?: string
          letter_grade?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: Database["public"]["Enums"]["grade_status"]
          student_id: string
          term_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          credit_hours?: number
          finalized_at?: string | null
          grade_points?: number | null
          id?: string
          letter_grade?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: Database["public"]["Enums"]["grade_status"]
          student_id?: string
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_records_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          feedback: string | null
          graded_at: string | null
          grader_user_id: string | null
          id: string
          rubric: Json | null
          score: number | null
          submission_id: string | null
        }
        Insert: {
          feedback?: string | null
          graded_at?: string | null
          grader_user_id?: string | null
          id?: string
          rubric?: Json | null
          score?: number | null
          submission_id?: string | null
        }
        Update: {
          feedback?: string | null
          graded_at?: string | null
          grader_user_id?: string | null
          id?: string
          rubric?: Json | null
          score?: number | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "v_grading_queue"
            referencedColumns: ["submission_id"]
          },
        ]
      }
      graduate_attributes: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      graduate_outcomes: {
        Row: {
          cohort_year: number
          created_at: string
          final_gpa: number | null
          graduation_date: string | null
          id: string
          is_graduated: boolean
          notes: string | null
          program_id: string | null
          program_name: string
          reviewed_at: string | null
          reviewer_role: string | null
          reviewer_user_id: string | null
          status: Database["public"]["Enums"]["outcome_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cohort_year: number
          created_at?: string
          final_gpa?: number | null
          graduation_date?: string | null
          id?: string
          is_graduated?: boolean
          notes?: string | null
          program_id?: string | null
          program_name: string
          reviewed_at?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          status?: Database["public"]["Enums"]["outcome_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cohort_year?: number
          created_at?: string
          final_gpa?: number | null
          graduation_date?: string | null
          id?: string
          is_graduated?: boolean
          notes?: string | null
          program_id?: string | null
          program_name?: string
          reviewed_at?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          status?: Database["public"]["Enums"]["outcome_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      graduation_candidates: {
        Row: {
          academic_year_id: string | null
          application_date: string | null
          capstone_completed: boolean | null
          ceremony_participation: boolean | null
          created_at: string | null
          credits_requirement_met: boolean | null
          degree_program_id: string | null
          expected_graduation_date: string | null
          financial_clearance: boolean | null
          gpa_requirement_met: boolean | null
          id: string
          notes: string | null
          requirements_met: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          spiritual_formation_met: boolean | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academic_year_id?: string | null
          application_date?: string | null
          capstone_completed?: boolean | null
          ceremony_participation?: boolean | null
          created_at?: string | null
          credits_requirement_met?: boolean | null
          degree_program_id?: string | null
          expected_graduation_date?: string | null
          financial_clearance?: boolean | null
          gpa_requirement_met?: boolean | null
          id?: string
          notes?: string | null
          requirements_met?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spiritual_formation_met?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academic_year_id?: string | null
          application_date?: string | null
          capstone_completed?: boolean | null
          ceremony_participation?: boolean | null
          created_at?: string | null
          credits_requirement_met?: boolean | null
          degree_program_id?: string | null
          expected_graduation_date?: string | null
          financial_clearance?: boolean | null
          gpa_requirement_met?: boolean | null
          id?: string
          notes?: string | null
          requirements_met?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spiritual_formation_met?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "graduation_candidates_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduation_candidates_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduation_candidates_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduation_candidates_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      graduation_eligibility_checks: {
        Row: {
          capstone_approved: boolean
          computed_at: string
          credits_met: boolean
          details: Json
          faculty_signoff: boolean
          id: string
          is_eligible: boolean
          no_blocking_holds: boolean
          plo_attainment_met: boolean
          program_id: string
          thesis_approved: boolean
          user_id: string
        }
        Insert: {
          capstone_approved: boolean
          computed_at?: string
          credits_met: boolean
          details?: Json
          faculty_signoff: boolean
          id?: string
          is_eligible: boolean
          no_blocking_holds: boolean
          plo_attainment_met: boolean
          program_id: string
          thesis_approved: boolean
          user_id: string
        }
        Update: {
          capstone_approved?: boolean
          computed_at?: string
          credits_met?: boolean
          details?: Json
          faculty_signoff?: boolean
          id?: string
          is_eligible?: boolean
          no_blocking_holds?: boolean
          plo_attainment_met?: boolean
          program_id?: string
          thesis_approved?: boolean
          user_id?: string
        }
        Relationships: []
      }
      graduation_requirements: {
        Row: {
          capstone_required: boolean | null
          created_at: string | null
          degree_level: string
          elective_credits: number | null
          faculty_id: string | null
          id: string
          is_active: boolean | null
          min_credits: number | null
          min_gpa: number | null
          program_id: string | null
          required_courses: string[] | null
          requirement_name: string
          rules_json: Json | null
          spiritual_formation_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          capstone_required?: boolean | null
          created_at?: string | null
          degree_level: string
          elective_credits?: number | null
          faculty_id?: string | null
          id?: string
          is_active?: boolean | null
          min_credits?: number | null
          min_gpa?: number | null
          program_id?: string | null
          required_courses?: string[] | null
          requirement_name: string
          rules_json?: Json | null
          spiritual_formation_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          capstone_required?: boolean | null
          created_at?: string | null
          degree_level?: string
          elective_credits?: number | null
          faculty_id?: string | null
          id?: string
          is_active?: boolean | null
          min_credits?: number | null
          min_gpa?: number | null
          program_id?: string | null
          required_courses?: string[] | null
          requirement_name?: string
          rules_json?: Json | null
          spiritual_formation_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "graduation_requirements_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduation_requirements_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
        ]
      }
      graduations: {
        Row: {
          ceremony_date: string | null
          certificate_url: string | null
          honors: string | null
          id: string
          student_id: string | null
        }
        Insert: {
          ceremony_date?: string | null
          certificate_url?: string | null
          honors?: string | null
          id?: string
          student_id?: string | null
        }
        Update: {
          ceremony_date?: string | null
          certificate_url?: string | null
          honors?: string | null
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "graduations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_academic_profiles"
            referencedColumns: ["student_record_id"]
          },
          {
            foreignKeyName: "graduations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_members: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          joined_at: string | null
          role: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          joined_at?: string | null
          role: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          joined_at?: string | null
          role?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_members_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_outcomes: {
        Row: {
          audit_notes: string | null
          category: string
          created_at: string
          display_format: string | null
          id: string
          is_published: boolean
          metric_key: string
          metric_label: string
          metric_unit: string | null
          metric_value: number
          reporting_period: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          audit_notes?: string | null
          category: string
          created_at?: string
          display_format?: string | null
          id?: string
          is_published?: boolean
          metric_key: string
          metric_label: string
          metric_unit?: string | null
          metric_value: number
          reporting_period?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          audit_notes?: string | null
          category?: string
          created_at?: string
          display_format?: string | null
          id?: string
          is_published?: boolean
          metric_key?: string
          metric_label?: string
          metric_unit?: string | null
          metric_value?: number
          reporting_period?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      institutions: {
        Row: {
          accent_color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          plan: string | null
          primary_color: string | null
          settings: Json | null
          short_name: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          plan?: string | null
          primary_color?: string | null
          settings?: Json | null
          short_name?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          plan?: string | null
          primary_color?: string | null
          settings?: Json | null
          short_name?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      integrity_appeals: {
        Row: {
          acknowledged_at: string | null
          closed_at: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_due_at: string | null
          hold_id: string
          id: string
          outcome: string | null
          outcome_rationale_internal: string | null
          outcome_rationale_public: string | null
          state: string
          statement: string
          student_user_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          closed_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_due_at?: string | null
          hold_id: string
          id?: string
          outcome?: string | null
          outcome_rationale_internal?: string | null
          outcome_rationale_public?: string | null
          state?: string
          statement: string
          student_user_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          closed_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_due_at?: string | null
          hold_id?: string
          id?: string
          outcome?: string | null
          outcome_rationale_internal?: string | null
          outcome_rationale_public?: string | null
          state?: string
          statement?: string
          student_user_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrity_appeals_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "student_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_case_evidence: {
        Row: {
          appeal_id: string | null
          created_at: string
          description: string | null
          evidence_url: string | null
          hold_id: string
          id: string
          is_confidential: boolean
          source_type: string
          submitted_by: string
          title: string
        }
        Insert: {
          appeal_id?: string | null
          created_at?: string
          description?: string | null
          evidence_url?: string | null
          hold_id: string
          id?: string
          is_confidential?: boolean
          source_type: string
          submitted_by: string
          title: string
        }
        Update: {
          appeal_id?: string | null
          created_at?: string
          description?: string | null
          evidence_url?: string | null
          hold_id?: string
          id?: string
          is_confidential?: boolean
          source_type?: string
          submitted_by?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrity_case_evidence_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "integrity_appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrity_case_evidence_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "student_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_case_reviews: {
        Row: {
          appeal_id: string | null
          assigned_at: string
          assigned_by: string
          confidential_notes: string | null
          created_at: string
          decision: string | null
          decision_at: string | null
          due_at: string | null
          hold_id: string
          id: string
          public_summary: string | null
          reviewer_role: string
          reviewer_user_id: string
          updated_at: string
        }
        Insert: {
          appeal_id?: string | null
          assigned_at?: string
          assigned_by: string
          confidential_notes?: string | null
          created_at?: string
          decision?: string | null
          decision_at?: string | null
          due_at?: string | null
          hold_id: string
          id?: string
          public_summary?: string | null
          reviewer_role: string
          reviewer_user_id: string
          updated_at?: string
        }
        Update: {
          appeal_id?: string | null
          assigned_at?: string
          assigned_by?: string
          confidential_notes?: string | null
          created_at?: string
          decision?: string | null
          decision_at?: string | null
          due_at?: string | null
          hold_id?: string
          id?: string
          public_summary?: string | null
          reviewer_role?: string
          reviewer_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrity_case_reviews_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "integrity_appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrity_case_reviews_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "student_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_decision_history: {
        Row: {
          actor_role: string
          actor_user_id: string
          appeal_id: string | null
          created_at: string
          from_state: string | null
          hold_id: string
          id: string
          rationale: string | null
          to_state: string
        }
        Insert: {
          actor_role: string
          actor_user_id: string
          appeal_id?: string | null
          created_at?: string
          from_state?: string | null
          hold_id: string
          id?: string
          rationale?: string | null
          to_state: string
        }
        Update: {
          actor_role?: string
          actor_user_id?: string
          appeal_id?: string | null
          created_at?: string
          from_state?: string | null
          hold_id?: string
          id?: string
          rationale?: string | null
          to_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrity_decision_history_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "integrity_appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrity_decision_history_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "student_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_notifications: {
        Row: {
          appeal_id: string | null
          body: string
          channel: string
          hold_id: string
          id: string
          sent_at: string
          sent_by: string | null
          student_user_id: string
          subject: string
        }
        Insert: {
          appeal_id?: string | null
          body: string
          channel?: string
          hold_id: string
          id?: string
          sent_at?: string
          sent_by?: string | null
          student_user_id: string
          subject: string
        }
        Update: {
          appeal_id?: string | null
          body?: string
          channel?: string
          hold_id?: string
          id?: string
          sent_at?: string
          sent_by?: string | null
          student_user_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrity_notifications_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "integrity_appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrity_notifications_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "student_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          message: string
          recommendations: Json | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          message: string
          recommendations?: Json | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          message?: string
          recommendations?: Json | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intervention_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "intervention_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          id: string
          issued_at: string
          number: string
          paid_at: string | null
          pdf_url: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          issued_at?: string
          number?: string
          paid_at?: string | null
          pdf_url?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          issued_at?: string
          number?: string
          paid_at?: string | null
          pdf_url?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_settings: {
        Row: {
          cohort_cap: number
          cohort_label: string
          id: string
          is_open: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cohort_cap?: number
          cohort_label?: string
          id?: string
          is_open?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cohort_cap?: number
          cohort_label?: string
          id?: string
          is_open?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      learning_analytics_daily: {
        Row: {
          avg_score: number | null
          completed_modules_count: number | null
          course_id: string | null
          created_at: string | null
          date: string
          enrollments_count: number | null
          id: string
          quiz_attempts: number | null
          user_id: string | null
        }
        Insert: {
          avg_score?: number | null
          completed_modules_count?: number | null
          course_id?: string | null
          created_at?: string | null
          date: string
          enrollments_count?: number | null
          id?: string
          quiz_attempts?: number | null
          user_id?: string | null
        }
        Update: {
          avg_score?: number | null
          completed_modules_count?: number | null
          course_id?: string | null
          created_at?: string | null
          date?: string
          enrollments_count?: number | null
          id?: string
          quiz_attempts?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_analytics_daily_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_analytics_daily_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
        ]
      }
      learning_goals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          deadline: string | null
          goal_type: string
          id: string
          status: string | null
          target_value: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          deadline?: string | null
          goal_type: string
          id?: string
          status?: string | null
          target_value: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          deadline?: string | null
          goal_type?: string
          id?: string
          status?: string | null
          target_value?: number
          user_id?: string
        }
        Relationships: []
      }
      learning_materials: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string | null
          kind: string | null
          meta: Json | null
          module_id: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          kind?: string | null
          meta?: Json | null
          module_id?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          kind?: string | null
          meta?: Json | null
          module_id?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_materials_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_materials_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_outcome_mappings: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          plo_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          plo_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          plo_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_outcome_mappings_plo_id_fkey"
            columns: ["plo_id"]
            isOneToOne: false
            referencedRelation: "program_learning_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_pathways: {
        Row: {
          ai_recommendations: Json | null
          career_goals: Json | null
          created_at: string | null
          current_phase: string | null
          degree_target:
            | Database["public"]["Enums"]["scroll_degree_level"]
            | null
          description: string | null
          faculty_id: string | null
          id: string
          is_active: boolean | null
          name: string
          phases: Json | null
          prophetic_calling: string | null
          recommended_courses: string[] | null
          recommended_skills: string[] | null
          spiritual_gifts: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_recommendations?: Json | null
          career_goals?: Json | null
          created_at?: string | null
          current_phase?: string | null
          degree_target?:
            | Database["public"]["Enums"]["scroll_degree_level"]
            | null
          description?: string | null
          faculty_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phases?: Json | null
          prophetic_calling?: string | null
          recommended_courses?: string[] | null
          recommended_skills?: string[] | null
          spiritual_gifts?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_recommendations?: Json | null
          career_goals?: Json | null
          created_at?: string | null
          current_phase?: string | null
          degree_target?:
            | Database["public"]["Enums"]["scroll_degree_level"]
            | null
          description?: string | null
          faculty_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phases?: Json | null
          prophetic_calling?: string | null
          recommended_courses?: string[] | null
          recommended_skills?: string[] | null
          spiritual_gifts?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_pathways_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_pathways_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
        ]
      }
      learning_patterns: {
        Row: {
          areas_for_growth: Json | null
          comprehension_level: string | null
          created_at: string | null
          engagement_score: number | null
          faculty: string
          id: string
          last_assessed: string | null
          learning_style: Json | null
          preferred_pace: string | null
          strengths: Json | null
          user_id: string | null
        }
        Insert: {
          areas_for_growth?: Json | null
          comprehension_level?: string | null
          created_at?: string | null
          engagement_score?: number | null
          faculty: string
          id?: string
          last_assessed?: string | null
          learning_style?: Json | null
          preferred_pace?: string | null
          strengths?: Json | null
          user_id?: string | null
        }
        Update: {
          areas_for_growth?: Json | null
          comprehension_level?: string | null
          created_at?: string | null
          engagement_score?: number | null
          faculty?: string
          id?: string
          last_assessed?: string | null
          learning_style?: Json | null
          preferred_pace?: string | null
          strengths?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "learning_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      learning_progress: {
        Row: {
          completed: boolean | null
          id: string
          module_id: string | null
          quiz_score: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          id?: string
          module_id?: string | null
          quiz_score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          id?: string
          module_id?: string | null
          quiz_score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_progress: {
        Row: {
          completed: boolean | null
          created_at: string | null
          enrollment_id: string | null
          id: string
          lecture_id: string | null
          progress: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          enrollment_id?: string | null
          id?: string
          lecture_id?: string | null
          progress?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          enrollment_id?: string | null
          id?: string
          lecture_id?: string | null
          progress?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lecture_questions: {
        Row: {
          answered_at: string | null
          asker_name: string | null
          created_at: string
          id: string
          position: number
          question: string
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          asker_name?: string | null
          created_at?: string
          id?: string
          position?: number
          question: string
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answered_at?: string | null
          asker_name?: string | null
          created_at?: string
          id?: string
          position?: number
          question?: string
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lecture_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_sessions: {
        Row: {
          cohost_tutor_id: string | null
          cohost_tutor_name: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          host_tutor_id: string | null
          host_tutor_name: string
          id: string
          module_id: string | null
          module_title: string | null
          recording_url: string | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cohost_tutor_id?: string | null
          cohost_tutor_name?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          host_tutor_id?: string | null
          host_tutor_name: string
          id?: string
          module_id?: string | null
          module_title?: string | null
          recording_url?: string | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cohost_tutor_id?: string | null
          cohost_tutor_name?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          host_tutor_id?: string | null
          host_tutor_name?: string
          id?: string
          module_id?: string | null
          module_title?: string | null
          recording_url?: string | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lecture_transcripts: {
        Row: {
          content: string
          created_at: string
          id: string
          sequence_index: number
          session_id: string
          speaker_name: string | null
          speaker_role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sequence_index?: number
          session_id: string
          speaker_name?: string | null
          speaker_role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sequence_index?: number
          session_id?: string
          speaker_name?: string | null
          speaker_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lecture_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          course_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          institution_id: string
          module_id: string | null
          recording_url: string | null
          scheduled_end: string
          scheduled_start: string
          started_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          institution_id: string
          module_id?: string | null
          recording_url?: string | null
          scheduled_end: string
          scheduled_start: string
          started_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          institution_id?: string
          module_id?: string | null
          recording_url?: string | null
          scheduled_end?: string
          scheduled_start?: string
          started_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "live_sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions_chat: {
        Row: {
          created_at: string | null
          id: string
          message: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_chat_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_chat_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_sessions_chat_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_chat_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_sessions_chat_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_sessions_participants: {
        Row: {
          attendance_duration: number | null
          audio_enabled: boolean | null
          hand_raised: boolean | null
          id: string
          is_host: boolean | null
          joined_at: string | null
          left_at: string | null
          session_id: string
          user_id: string
          video_enabled: boolean | null
        }
        Insert: {
          attendance_duration?: number | null
          audio_enabled?: boolean | null
          hand_raised?: boolean | null
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          session_id: string
          user_id: string
          video_enabled?: boolean | null
        }
        Update: {
          attendance_duration?: number | null
          audio_enabled?: boolean | null
          hand_raised?: boolean | null
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          session_id?: string
          user_id?: string
          video_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_sessions_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_sessions_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      matriculation_records: {
        Row: {
          cert_number: string | null
          cohort_label: string | null
          created_at: string
          oath_signed_at: string
          signature_text: string
          user_id: string
        }
        Insert: {
          cert_number?: string | null
          cohort_label?: string | null
          created_at?: string
          oath_signed_at?: string
          signature_text: string
          user_id: string
        }
        Update: {
          cert_number?: string | null
          cohort_label?: string | null
          created_at?: string
          oath_signed_at?: string
          signature_text?: string
          user_id?: string
        }
        Relationships: []
      }
      mentorship_relationships: {
        Row: {
          actual_end_date: string | null
          created_at: string | null
          expected_end_date: string | null
          faculty_id: string | null
          goals: Json | null
          id: string
          mentee_id: string
          mentor_id: string
          notes: string | null
          start_date: string | null
          status: string | null
          success_metrics: Json | null
          total_hours: number | null
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          created_at?: string | null
          expected_end_date?: string | null
          faculty_id?: string | null
          goals?: Json | null
          id?: string
          mentee_id: string
          mentor_id: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          success_metrics?: Json | null
          total_hours?: number | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          created_at?: string | null
          expected_end_date?: string | null
          faculty_id?: string | null
          goals?: Json | null
          id?: string
          mentee_id?: string
          mentor_id?: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          success_metrics?: Json | null
          total_hours?: number | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_relationships_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_relationships_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
        ]
      }
      mentorship_requests: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          institution_id: string
          mentor_id: string | null
          message: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          institution_id: string
          mentor_id?: string | null
          message?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string
          mentor_id?: string | null
          message?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_institution_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_sessions: {
        Row: {
          action_items: Json | null
          breakthrough_notes: string | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          guidance_provided: string | null
          id: string
          mentee_rating: number | null
          mentee_response: string | null
          mentor_rating: number | null
          prophetic_words: string | null
          relationship_id: string
          scheduled_at: string
          session_type: Database["public"]["Enums"]["mentorship_session_type"]
          spiritual_insights: string | null
          started_at: string | null
          topics_discussed: Json | null
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          breakthrough_notes?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          guidance_provided?: string | null
          id?: string
          mentee_rating?: number | null
          mentee_response?: string | null
          mentor_rating?: number | null
          prophetic_words?: string | null
          relationship_id: string
          scheduled_at: string
          session_type: Database["public"]["Enums"]["mentorship_session_type"]
          spiritual_insights?: string | null
          started_at?: string | null
          topics_discussed?: Json | null
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          breakthrough_notes?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          guidance_provided?: string | null
          id?: string
          mentee_rating?: number | null
          mentee_response?: string | null
          mentor_rating?: number | null
          prophetic_words?: string | null
          relationship_id?: string
          scheduled_at?: string
          session_type?: Database["public"]["Enums"]["mentorship_session_type"]
          spiritual_insights?: string | null
          started_at?: string | null
          topics_discussed?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "mentorship_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      module_completions: {
        Row: {
          completed_at: string
          course_id: string | null
          created_at: string
          id: string
          module_id: string
          user_id: string
          xp_awarded: number | null
        }
        Insert: {
          completed_at?: string
          course_id?: string | null
          created_at?: string
          id?: string
          module_id: string
          user_id: string
          xp_awarded?: number | null
        }
        Update: {
          completed_at?: string
          course_id?: string | null
          created_at?: string
          id?: string
          module_id?: string
          user_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "module_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "module_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_notes: {
        Row: {
          application_notes: string | null
          created_at: string | null
          id: string
          module_id: string
          notes: string | null
          scripture_connections: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_notes?: string | null
          created_at?: string | null
          id?: string
          module_id: string
          notes?: string | null
          scripture_connections?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_notes?: string | null
          created_at?: string | null
          id?: string
          module_id?: string
          notes?: string | null
          scripture_connections?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_notes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string | null
          id: string
          module_id: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          id?: string
          module_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          id?: string
          module_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      named_faculty: {
        Row: {
          bio: string
          created_at: string
          email: string | null
          faculty_chair: string | null
          full_name: string
          h_index: number | null
          id: string
          is_published: boolean
          joined_at: string
          notable_works: Json | null
          orcid_id: string | null
          photo_url: string | null
          publications_count: number | null
          supreme_faculty: string
          title: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          bio: string
          created_at?: string
          email?: string | null
          faculty_chair?: string | null
          full_name: string
          h_index?: number | null
          id?: string
          is_published?: boolean
          joined_at?: string
          notable_works?: Json | null
          orcid_id?: string | null
          photo_url?: string | null
          publications_count?: number | null
          supreme_faculty: string
          title: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          bio?: string
          created_at?: string
          email?: string | null
          faculty_chair?: string | null
          full_name?: string
          h_index?: number | null
          id?: string
          is_published?: boolean
          joined_at?: string
          notable_works?: Json | null
          orcid_id?: string | null
          photo_url?: string | null
          publications_count?: number | null
          supreme_faculty?: string
          title?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel_email: boolean | null
          channel_inapp: boolean | null
          channel_push: boolean | null
          course_updates: boolean | null
          created_at: string | null
          id: string
          spiritual_updates: boolean | null
          system_updates: boolean | null
          tutor_updates: boolean | null
          user_id: string
        }
        Insert: {
          channel_email?: boolean | null
          channel_inapp?: boolean | null
          channel_push?: boolean | null
          course_updates?: boolean | null
          created_at?: string | null
          id?: string
          spiritual_updates?: boolean | null
          system_updates?: boolean | null
          tutor_updates?: boolean | null
          user_id: string
        }
        Update: {
          channel_email?: boolean | null
          channel_inapp?: boolean | null
          channel_push?: boolean | null
          course_updates?: boolean | null
          created_at?: string | null
          id?: string
          spiritual_updates?: boolean | null
          system_updates?: boolean | null
          tutor_updates?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          institution_id: string | null
          is_read: boolean | null
          metadata: Json | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_read?: boolean | null
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          institution_id?: string | null
          is_read?: boolean | null
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      office_hours_bookings: {
        Row: {
          booked_at: string
          id: string
          notes: string | null
          slot_id: string
          status: string
          user_id: string
        }
        Insert: {
          booked_at?: string
          id?: string
          notes?: string | null
          slot_id: string
          status?: string
          user_id: string
        }
        Update: {
          booked_at?: string
          id?: string
          notes?: string | null
          slot_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_hours_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "office_hours_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      office_hours_slots: {
        Row: {
          created_at: string
          day_of_week: string
          end_time: string
          id: string
          max_students: number
          start_time: string
          tutor_name: string
          tutor_specialty: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          end_time: string
          id?: string
          max_students?: number
          start_time: string
          tutor_name: string
          tutor_specialty: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          end_time?: string
          id?: string
          max_students?: number
          start_time?: string
          tutor_name?: string
          tutor_specialty?: string
        }
        Relationships: []
      }
      official_transcripts: {
        Row: {
          created_at: string
          gpa: number | null
          id: string
          issued_at: string
          issued_by: string | null
          kind: Database["public"]["Enums"]["transcript_kind"]
          revoke_reason: string | null
          revoked_at: string | null
          snapshot: Json
          student_id: string
          total_credit_hours: number
          verification_code: string
        }
        Insert: {
          created_at?: string
          gpa?: number | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          kind?: Database["public"]["Enums"]["transcript_kind"]
          revoke_reason?: string | null
          revoked_at?: string | null
          snapshot: Json
          student_id: string
          total_credit_hours?: number
          verification_code?: string
        }
        Update: {
          created_at?: string
          gpa?: number | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          kind?: Database["public"]["Enums"]["transcript_kind"]
          revoke_reason?: string | null
          revoked_at?: string | null
          snapshot?: Json
          student_id?: string
          total_credit_hours?: number
          verification_code?: string
        }
        Relationships: []
      }
      oral_defenses: {
        Row: {
          abstract: string | null
          candidate_name: string
          created_at: string
          defense_date: string
          degree_title: string
          examiner_names: string[]
          faculty_area: string
          id: string
          is_public: boolean
          recording_url: string | null
          scrollchain_hash: string | null
          status: string
          updated_at: string
        }
        Insert: {
          abstract?: string | null
          candidate_name: string
          created_at?: string
          defense_date: string
          degree_title: string
          examiner_names?: string[]
          faculty_area: string
          id?: string
          is_public?: boolean
          recording_url?: string | null
          scrollchain_hash?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          abstract?: string | null
          candidate_name?: string
          created_at?: string
          defense_date?: string
          degree_title?: string
          examiner_names?: string[]
          faculty_area?: string
          id?: string
          is_public?: boolean
          recording_url?: string | null
          scrollchain_hash?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      orientation_progress: {
        Row: {
          completed_at: string
          id: string
          payload: Json
          step: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          payload?: Json
          step: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          payload?: Json
          step?: string
          user_id?: string
        }
        Relationships: []
      }
      outcome_evidence_links: {
        Row: {
          created_at: string
          evidence_kind: string
          evidence_summary: string | null
          evidence_url: string | null
          id: string
          outcome_id: string
          outcome_table: string
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          created_at?: string
          evidence_kind: string
          evidence_summary?: string | null
          evidence_url?: string | null
          id?: string
          outcome_id: string
          outcome_table: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          created_at?: string
          evidence_kind?: string
          evidence_summary?: string | null
          evidence_url?: string | null
          id?: string
          outcome_id?: string
          outcome_table?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean
          last4: string | null
          provider_ref: string | null
          type: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider_ref?: string | null
          type: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider_ref?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_owners: {
        Row: {
          created_at: string | null
          email: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plo_attribute_mapping: {
        Row: {
          attribute_id: string
          plo_id: string
        }
        Insert: {
          attribute_id: string
          plo_id: string
        }
        Update: {
          attribute_id?: string
          plo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plo_attribute_mapping_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "graduate_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plo_attribute_mapping_plo_id_fkey"
            columns: ["plo_id"]
            isOneToOne: false
            referencedRelation: "program_learning_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          likes_count: number
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      practicum_competency_attestations: {
        Row: {
          attained_level: string
          attested_at: string
          attested_by: string
          attested_by_role: string
          competency_code: string
          competency_label: string
          created_at: string
          evidence_notes: string
          id: string
          placement_id: string
        }
        Insert: {
          attained_level: string
          attested_at?: string
          attested_by: string
          attested_by_role: string
          competency_code: string
          competency_label: string
          created_at?: string
          evidence_notes: string
          id?: string
          placement_id: string
        }
        Update: {
          attained_level?: string
          attested_at?: string
          attested_by?: string
          attested_by_role?: string
          competency_code?: string
          competency_label?: string
          created_at?: string
          evidence_notes?: string
          id?: string
          placement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practicum_competency_attestations_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "practicum_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      practicum_evaluations: {
        Row: {
          created_at: string
          evaluator_id: string
          evaluator_role: string
          id: string
          narrative: string
          overall_score: number | null
          placement_id: string
          recommendation: string
          rubric: Json
          submitted_at: string
        }
        Insert: {
          created_at?: string
          evaluator_id: string
          evaluator_role: string
          id?: string
          narrative: string
          overall_score?: number | null
          placement_id: string
          recommendation: string
          rubric?: Json
          submitted_at?: string
        }
        Update: {
          created_at?: string
          evaluator_id?: string
          evaluator_role?: string
          id?: string
          narrative?: string
          overall_score?: number | null
          placement_id?: string
          recommendation?: string
          rubric?: Json
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practicum_evaluations_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "practicum_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      practicum_hour_logs: {
        Row: {
          activity_summary: string
          attestation_note: string | null
          attested_at: string | null
          attested_by: string | null
          competencies_practiced: string[] | null
          created_at: string
          hours: number
          id: string
          log_date: string
          placement_id: string
          status: Database["public"]["Enums"]["practicum_log_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          activity_summary: string
          attestation_note?: string | null
          attested_at?: string | null
          attested_by?: string | null
          competencies_practiced?: string[] | null
          created_at?: string
          hours: number
          id?: string
          log_date: string
          placement_id: string
          status?: Database["public"]["Enums"]["practicum_log_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          activity_summary?: string
          attestation_note?: string | null
          attested_at?: string | null
          attested_by?: string | null
          competencies_practiced?: string[] | null
          created_at?: string
          hours?: number
          id?: string
          log_date?: string
          placement_id?: string
          status?: Database["public"]["Enums"]["practicum_log_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practicum_hour_logs_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "practicum_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      practicum_incidents: {
        Row: {
          category: string
          created_at: string
          details: string | null
          id: string
          occurred_at: string
          placement_id: string | null
          reporter_id: string
          reporter_role: string
          resolution_summary: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["practicum_incident_severity"]
          site_id: string | null
          status: Database["public"]["Enums"]["practicum_incident_status"]
          summary: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          details?: string | null
          id?: string
          occurred_at?: string
          placement_id?: string | null
          reporter_id: string
          reporter_role: string
          resolution_summary?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["practicum_incident_severity"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["practicum_incident_status"]
          summary: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: string | null
          id?: string
          occurred_at?: string
          placement_id?: string | null
          reporter_id?: string
          reporter_role?: string
          resolution_summary?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["practicum_incident_severity"]
          site_id?: string | null
          status?: Database["public"]["Enums"]["practicum_incident_status"]
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practicum_incidents_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "practicum_placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practicum_incidents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "practicum_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      practicum_outcomes: {
        Row: {
          created_at: string
          end_date: string | null
          hours_completed: number | null
          id: string
          practicum_provider_id: string | null
          provider_name: string
          provider_signoff_at: string | null
          provider_signoff_contact: string | null
          reviewer_role: string | null
          reviewer_user_id: string | null
          role_description: string | null
          signed_off_by_provider: boolean
          start_date: string | null
          status: Database["public"]["Enums"]["outcome_status"]
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          hours_completed?: number | null
          id?: string
          practicum_provider_id?: string | null
          provider_name: string
          provider_signoff_at?: string | null
          provider_signoff_contact?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          role_description?: string | null
          signed_off_by_provider?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["outcome_status"]
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          hours_completed?: number | null
          id?: string
          practicum_provider_id?: string | null
          provider_name?: string
          provider_signoff_at?: string | null
          provider_signoff_contact?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          role_description?: string | null
          signed_off_by_provider?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["outcome_status"]
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      practicum_placements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_hours: number
          course_id: string | null
          created_at: string
          end_date: string | null
          final_outcome: string | null
          id: string
          outcome_computed_at: string | null
          program_id: string | null
          required_hours: number
          site_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["practicum_placement_status"]
          student_id: string
          supervisor_id: string | null
          term_label: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_hours?: number
          course_id?: string | null
          created_at?: string
          end_date?: string | null
          final_outcome?: string | null
          id?: string
          outcome_computed_at?: string | null
          program_id?: string | null
          required_hours?: number
          site_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["practicum_placement_status"]
          student_id: string
          supervisor_id?: string | null
          term_label?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_hours?: number
          course_id?: string | null
          created_at?: string
          end_date?: string | null
          final_outcome?: string | null
          id?: string
          outcome_computed_at?: string | null
          program_id?: string | null
          required_hours?: number
          site_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["practicum_placement_status"]
          student_id?: string
          supervisor_id?: string | null
          term_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practicum_placements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "practicum_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practicum_placements_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "practicum_supervisors"
            referencedColumns: ["id"]
          },
        ]
      }
      practicum_providers: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string
          evidence_expiry_date: string | null
          id: string
          last_reviewed_at: string | null
          notes: string | null
          review_due_at: string | null
          site_name: string
          supervisor_email: string | null
          supervisor_name: string | null
          updated_at: string
          verification_state: Database["public"]["Enums"]["evidence_verification_state"]
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string
          evidence_expiry_date?: string | null
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          review_due_at?: string | null
          site_name: string
          supervisor_email?: string | null
          supervisor_name?: string | null
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["evidence_verification_state"]
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string
          evidence_expiry_date?: string | null
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          review_due_at?: string | null
          site_name?: string
          supervisor_email?: string | null
          supervisor_name?: string | null
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["evidence_verification_state"]
          verified_by?: string | null
        }
        Relationships: []
      }
      practicum_requirements: {
        Row: {
          created_at: string
          degree_program_id: string
          description: string | null
          id: string
          reflection_required: boolean
          required_hours: number
          supervisor_required: boolean
        }
        Insert: {
          created_at?: string
          degree_program_id: string
          description?: string | null
          id?: string
          reflection_required?: boolean
          required_hours?: number
          supervisor_required?: boolean
        }
        Update: {
          created_at?: string
          degree_program_id?: string
          description?: string | null
          id?: string
          reflection_required?: boolean
          required_hours?: number
          supervisor_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "practicum_requirements_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practicum_requirements_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practicum_requirements_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      practicum_site_approvals: {
        Row: {
          action: string
          created_at: string
          effective_at: string
          expires_at: string | null
          id: string
          rationale: string
          reviewer_id: string
          reviewer_role: string
          site_id: string
        }
        Insert: {
          action: string
          created_at?: string
          effective_at?: string
          expires_at?: string | null
          id?: string
          rationale: string
          reviewer_id: string
          reviewer_role: string
          site_id: string
        }
        Update: {
          action?: string
          created_at?: string
          effective_at?: string
          expires_at?: string | null
          id?: string
          rationale?: string
          reviewer_id?: string
          reviewer_role?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practicum_site_approvals_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "practicum_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      practicum_sites: {
        Row: {
          address: string | null
          capacity: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          mou_expires_at: string | null
          mou_signed_at: string | null
          name: string
          safety_reviewed_at: string | null
          safety_reviewer_id: string | null
          site_type: string
          status: Database["public"]["Enums"]["practicum_site_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mou_expires_at?: string | null
          mou_signed_at?: string | null
          name: string
          safety_reviewed_at?: string | null
          safety_reviewer_id?: string | null
          site_type: string
          status?: Database["public"]["Enums"]["practicum_site_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mou_expires_at?: string | null
          mou_signed_at?: string | null
          name?: string
          safety_reviewed_at?: string | null
          safety_reviewer_id?: string | null
          site_type?: string
          status?: Database["public"]["Enums"]["practicum_site_status"]
          updated_at?: string
        }
        Relationships: []
      }
      practicum_supervisors: {
        Row: {
          created_at: string
          credentials: string | null
          email: string
          full_name: string
          id: string
          license_number: string | null
          license_verified: boolean
          license_verified_at: string | null
          license_verified_by: string | null
          role_title: string | null
          site_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          credentials?: string | null
          email: string
          full_name: string
          id?: string
          license_number?: string | null
          license_verified?: boolean
          license_verified_at?: string | null
          license_verified_by?: string | null
          role_title?: string | null
          site_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          credentials?: string | null
          email?: string
          full_name?: string
          id?: string
          license_number?: string | null
          license_verified?: boolean
          license_verified_at?: string | null
          license_verified_by?: string | null
          role_title?: string | null
          site_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practicum_supervisors_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "practicum_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_journal: {
        Row: {
          created_at: string | null
          id: string
          request: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          request: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          request?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_journal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prayer_journal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_journal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prayer_journal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      primary_source_collections: {
        Row: {
          access_type: string
          created_at: string
          description: string
          external_url: string | null
          faculty_area: string
          id: string
          is_active: boolean
          item_count: number
          name: string
          provider: string
          updated_at: string
        }
        Insert: {
          access_type?: string
          created_at?: string
          description: string
          external_url?: string | null
          faculty_area: string
          id?: string
          is_active?: boolean
          item_count?: number
          name: string
          provider: string
          updated_at?: string
        }
        Update: {
          access_type?: string
          created_at?: string
          description?: string
          external_url?: string | null
          faculty_area?: string
          id?: string
          is_active?: boolean
          item_count?: number
          name?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_competencies: {
        Row: {
          canonical_faculty_id: string | null
          code: string
          created_at: string
          description: string
          external_framework: string | null
          id: string
          name: string
        }
        Insert: {
          canonical_faculty_id?: string | null
          code: string
          created_at?: string
          description: string
          external_framework?: string | null
          id?: string
          name: string
        }
        Update: {
          canonical_faculty_id?: string | null
          code?: string
          created_at?: string
          description?: string
          external_framework?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_competencies_canonical_faculty_id_fkey"
            columns: ["canonical_faculty_id"]
            isOneToOne: false
            referencedRelation: "canonical_faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_profile: Json | null
          admitted_at: string | null
          avatar_url: string | null
          courses_completed: number | null
          created_at: string | null
          current_institution_id: string | null
          current_streak: number | null
          display_on_leaderboard: boolean | null
          email: string | null
          enrolled_at: string | null
          full_name: string | null
          graduated_at: string | null
          id: string
          lifecycle_status: string | null
          longest_streak: number | null
          role: string | null
          scrollcoin_balance: number | null
          scrollcoins: number | null
          spiritual_profile: Json | null
          total_xp: number | null
          updated_at: string | null
          withdrawn_at: string | null
        }
        Insert: {
          academic_profile?: Json | null
          admitted_at?: string | null
          avatar_url?: string | null
          courses_completed?: number | null
          created_at?: string | null
          current_institution_id?: string | null
          current_streak?: number | null
          display_on_leaderboard?: boolean | null
          email?: string | null
          enrolled_at?: string | null
          full_name?: string | null
          graduated_at?: string | null
          id: string
          lifecycle_status?: string | null
          longest_streak?: number | null
          role?: string | null
          scrollcoin_balance?: number | null
          scrollcoins?: number | null
          spiritual_profile?: Json | null
          total_xp?: number | null
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          academic_profile?: Json | null
          admitted_at?: string | null
          avatar_url?: string | null
          courses_completed?: number | null
          created_at?: string | null
          current_institution_id?: string | null
          current_streak?: number | null
          display_on_leaderboard?: boolean | null
          email?: string | null
          enrolled_at?: string | null
          full_name?: string | null
          graduated_at?: string | null
          id?: string
          lifecycle_status?: string | null
          longest_streak?: number | null
          role?: string | null
          scrollcoin_balance?: number | null
          scrollcoins?: number | null
          spiritual_profile?: Json | null
          total_xp?: number | null
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_institution_id_fkey"
            columns: ["current_institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      program_accreditation_targets: {
        Row: {
          created_at: string
          framework: string
          id: string
          notes: string | null
          program_id: string
          status: string
          target_level: string | null
        }
        Insert: {
          created_at?: string
          framework: string
          id?: string
          notes?: string | null
          program_id: string
          status?: string
          target_level?: string | null
        }
        Update: {
          created_at?: string
          framework?: string
          id?: string
          notes?: string | null
          program_id?: string
          status?: string
          target_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_accreditation_targets_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_accreditation_targets_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_accreditation_targets_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_assignment_confirmations: {
        Row: {
          created_at: string
          id: string
          requested_program_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_reason: string | null
          status: string
          student_reason: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_program_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_reason?: string | null
          status?: string
          student_reason: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_program_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_reason?: string | null
          status?: string
          student_reason?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_assignment_confirmations_requested_program_id_fkey"
            columns: ["requested_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_assignment_confirmations_requested_program_id_fkey"
            columns: ["requested_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_assignment_confirmations_requested_program_id_fkey"
            columns: ["requested_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_canonical_faculty: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          canonical_faculty_id: string
          program_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          canonical_faculty_id: string
          program_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          canonical_faculty_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_canonical_faculty_canonical_faculty_id_fkey"
            columns: ["canonical_faculty_id"]
            isOneToOne: false
            referencedRelation: "canonical_faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_canonical_faculty_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_canonical_faculty_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_canonical_faculty_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_learning_outcomes: {
        Row: {
          bloom_level: string | null
          code: string
          created_at: string
          id: string
          program_id: string
          statement: string
        }
        Insert: {
          bloom_level?: string | null
          code: string
          created_at?: string
          id?: string
          program_id: string
          statement: string
        }
        Update: {
          bloom_level?: string | null
          code?: string
          created_at?: string
          id?: string
          program_id?: string
          statement?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_learning_outcomes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_learning_outcomes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_learning_outcomes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_requirements: {
        Row: {
          additional_requirements: Json
          created_at: string
          display_label: string
          id: string
          level: string
          min_academic: string | null
          notes: string | null
          optional_documents: Json
          reference_letters_required: number | null
          required_documents: Json
          statement_min_words: number | null
          updated_at: string
        }
        Insert: {
          additional_requirements?: Json
          created_at?: string
          display_label: string
          id?: string
          level: string
          min_academic?: string | null
          notes?: string | null
          optional_documents?: Json
          reference_letters_required?: number | null
          required_documents?: Json
          statement_min_words?: number | null
          updated_at?: string
        }
        Update: {
          additional_requirements?: Json
          created_at?: string
          display_label?: string
          id?: string
          level?: string
          min_academic?: string | null
          notes?: string | null
          optional_documents?: Json
          reference_letters_required?: number | null
          required_documents?: Json
          statement_min_words?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      program_scroll_distinctions: {
        Row: {
          created_at: string
          distinction_id: string
          program_id: string
        }
        Insert: {
          created_at?: string
          distinction_id: string
          program_id: string
        }
        Update: {
          created_at?: string
          distinction_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_scroll_distinctions_distinction_id_fkey"
            columns: ["distinction_id"]
            isOneToOne: false
            referencedRelation: "scroll_distinctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_scroll_distinctions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_scroll_distinctions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_scroll_distinctions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      program_transfer_requests: {
        Row: {
          academic_justification: string | null
          created_at: string
          decided_at: string | null
          effective_term: string | null
          from_program_id: string | null
          id: string
          reason: string
          status: string
          student_user_id: string
          submitted_at: string
          supporting_docs: Json
          to_program_id: string
          updated_at: string
        }
        Insert: {
          academic_justification?: string | null
          created_at?: string
          decided_at?: string | null
          effective_term?: string | null
          from_program_id?: string | null
          id?: string
          reason: string
          status?: string
          student_user_id: string
          submitted_at?: string
          supporting_docs?: Json
          to_program_id: string
          updated_at?: string
        }
        Update: {
          academic_justification?: string | null
          created_at?: string
          decided_at?: string | null
          effective_term?: string | null
          from_program_id?: string | null
          id?: string
          reason?: string
          status?: string
          student_user_id?: string
          submitted_at?: string
          supporting_docs?: Json
          to_program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_transfer_requests_from_program_id_fkey"
            columns: ["from_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_transfer_requests_from_program_id_fkey"
            columns: ["from_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_transfer_requests_from_program_id_fkey"
            columns: ["from_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "program_transfer_requests_to_program_id_fkey"
            columns: ["to_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_transfer_requests_to_program_id_fkey"
            columns: ["to_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_transfer_requests_to_program_id_fkey"
            columns: ["to_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      prophetic_assessments: {
        Row: {
          assessed_by: string | null
          assessment_date: string | null
          breakthrough_areas: string | null
          calling_clarity_score: number | null
          created_at: string | null
          divine_assignments: Json | null
          growth_areas: string | null
          id: string
          intercession_practice: Json | null
          ministry_readiness_score: number | null
          overall_score: number | null
          prophetic_gifts_score: number | null
          prophetic_words_received: string | null
          recommendations: Json | null
          spiritual_disciplines: Json | null
          spiritual_maturity_score: number | null
          user_id: string
        }
        Insert: {
          assessed_by?: string | null
          assessment_date?: string | null
          breakthrough_areas?: string | null
          calling_clarity_score?: number | null
          created_at?: string | null
          divine_assignments?: Json | null
          growth_areas?: string | null
          id?: string
          intercession_practice?: Json | null
          ministry_readiness_score?: number | null
          overall_score?: number | null
          prophetic_gifts_score?: number | null
          prophetic_words_received?: string | null
          recommendations?: Json | null
          spiritual_disciplines?: Json | null
          spiritual_maturity_score?: number | null
          user_id: string
        }
        Update: {
          assessed_by?: string | null
          assessment_date?: string | null
          breakthrough_areas?: string | null
          calling_clarity_score?: number | null
          created_at?: string | null
          divine_assignments?: Json | null
          growth_areas?: string | null
          id?: string
          intercession_practice?: Json | null
          ministry_readiness_score?: number | null
          overall_score?: number | null
          prophetic_gifts_score?: number | null
          prophetic_words_received?: string | null
          recommendations?: Json | null
          spiritual_disciplines?: Json | null
          spiritual_maturity_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      prophetic_checkins: {
        Row: {
          acknowledged_lordship: boolean | null
          created_at: string | null
          id: string
          note: string | null
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          acknowledged_lordship?: boolean | null
          created_at?: string | null
          id?: string
          note?: string | null
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          acknowledged_lordship?: boolean | null
          created_at?: string | null
          id?: string
          note?: string | null
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prophetic_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prophetic_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prophetic_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prophetic_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      public_claims: {
        Row: {
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at: string
          expires_at: string | null
          id: string
          is_published: boolean
          proposed_by: string | null
          retraction_reason: string | null
          reviewed_at: string | null
          reviewer_role: string | null
          reviewer_user_id: string | null
          scope_notes: string | null
          statement: string
          subject_id: string | null
          subject_kind: Database["public"]["Enums"]["claim_subject_kind"]
          subject_label: string
          updated_at: string
          verification_state: Database["public"]["Enums"]["claim_verification_state"]
          verified_at: string | null
        }
        Insert: {
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean
          proposed_by?: string | null
          retraction_reason?: string | null
          reviewed_at?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          scope_notes?: string | null
          statement: string
          subject_id?: string | null
          subject_kind: Database["public"]["Enums"]["claim_subject_kind"]
          subject_label: string
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["claim_verification_state"]
          verified_at?: string | null
        }
        Update: {
          claim_type?: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean
          proposed_by?: string | null
          retraction_reason?: string | null
          reviewed_at?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          scope_notes?: string | null
          statement?: string
          subject_id?: string | null
          subject_kind?: Database["public"]["Enums"]["claim_subject_kind"]
          subject_label?: string
          updated_at?: string
          verification_state?: Database["public"]["Enums"]["claim_verification_state"]
          verified_at?: string | null
        }
        Relationships: []
      }
      public_faculty: {
        Row: {
          affiliation: string | null
          bio: string | null
          category: Database["public"]["Enums"]["faculty_category"]
          contribution: string | null
          created_at: string
          credentials: string | null
          display_order: number
          full_name: string
          google_scholar_url: string | null
          id: string
          is_active: boolean
          linkedin_url: string | null
          orcid_id: string | null
          personal_url: string | null
          photo_url: string | null
          publications: Json
          research_areas: string[]
          title: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["faculty_verification_status"]
        }
        Insert: {
          affiliation?: string | null
          bio?: string | null
          category: Database["public"]["Enums"]["faculty_category"]
          contribution?: string | null
          created_at?: string
          credentials?: string | null
          display_order?: number
          full_name: string
          google_scholar_url?: string | null
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          orcid_id?: string | null
          personal_url?: string | null
          photo_url?: string | null
          publications?: Json
          research_areas?: string[]
          title?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["faculty_verification_status"]
        }
        Update: {
          affiliation?: string | null
          bio?: string | null
          category?: Database["public"]["Enums"]["faculty_category"]
          contribution?: string | null
          created_at?: string
          credentials?: string | null
          display_order?: number
          full_name?: string
          google_scholar_url?: string | null
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          orcid_id?: string | null
          personal_url?: string | null
          photo_url?: string | null
          publications?: Json
          research_areas?: string[]
          title?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["faculty_verification_status"]
        }
        Relationships: []
      }
      public_verification_snapshots: {
        Row: {
          claim_id: string
          created_at: string
          evidence_count: number
          id: string
          reviewer_role: string | null
          reviewer_user_id: string | null
          snapshot_payload: Json
          unexpired_evidence_count: number
          verification_state: Database["public"]["Enums"]["claim_verification_state"]
        }
        Insert: {
          claim_id: string
          created_at?: string
          evidence_count?: number
          id?: string
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          snapshot_payload?: Json
          unexpired_evidence_count?: number
          verification_state: Database["public"]["Enums"]["claim_verification_state"]
        }
        Update: {
          claim_id?: string
          created_at?: string
          evidence_count?: number
          id?: string
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          snapshot_payload?: Json
          unexpired_evidence_count?: number
          verification_state?: Database["public"]["Enums"]["claim_verification_state"]
        }
        Relationships: [
          {
            foreignKeyName: "public_verification_snapshots_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "public_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_audit_logs: {
        Row: {
          action_type: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          answer: string | null
          assignment_id: string | null
          difficulty_rating: number | null
          id: string
          kind: string | null
          options: string[] | null
          order_index: number | null
          points: number | null
          prompt: string | null
        }
        Insert: {
          answer?: string | null
          assignment_id?: string | null
          difficulty_rating?: number | null
          id?: string
          kind?: string | null
          options?: string[] | null
          order_index?: number | null
          points?: number | null
          prompt?: string | null
        }
        Update: {
          answer?: string | null
          assignment_id?: string | null
          difficulty_rating?: number | null
          id?: string
          kind?: string | null
          options?: string[] | null
          order_index?: number | null
          points?: number | null
          prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_submissions: {
        Row: {
          course_id: string | null
          id: string
          module_id: string | null
          score: number | null
          submitted_at: string | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          id?: string
          module_id?: string | null
          score?: number | null
          submitted_at?: string | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          id?: string
          module_id?: string | null
          score?: number | null
          submitted_at?: string | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string | null
          module_id: string | null
          passing_score: number
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          module_id?: string | null
          passing_score?: number
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string | null
          module_id?: string | null
          passing_score?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          amount_cents: number
          created_at: string
          details: string | null
          id: string
          invoice_id: string | null
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          details?: string | null
          id?: string
          invoice_id?: string | null
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          details?: string | null
          id?: string
          invoice_id?: string | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_windows: {
        Row: {
          audience: string
          close_at: string
          created_at: string | null
          id: string
          is_active: boolean | null
          open_at: string
          priority_order: number | null
          rules_json: Json | null
          term_id: string | null
          updated_at: string | null
        }
        Insert: {
          audience?: string
          close_at: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          open_at: string
          priority_order?: number | null
          rules_json?: Json | null
          term_id?: string | null
          updated_at?: string | null
        }
        Update: {
          audience?: string
          close_at?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          open_at?: string
          priority_order?: number | null
          rules_json?: Json | null
          term_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_windows_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      research_outputs: {
        Row: {
          citation_count: number
          created_at: string
          doi: string | null
          id: string
          output_type: Database["public"]["Enums"]["research_output_type"]
          peer_review_state: Database["public"]["Enums"]["peer_review_state"]
          program_id: string | null
          published_date: string | null
          reviewer_role: string | null
          reviewer_user_id: string | null
          status: Database["public"]["Enums"]["outcome_status"]
          title: string
          updated_at: string
          url: string | null
          user_id: string
          venue: string | null
          verified_at: string | null
        }
        Insert: {
          citation_count?: number
          created_at?: string
          doi?: string | null
          id?: string
          output_type: Database["public"]["Enums"]["research_output_type"]
          peer_review_state?: Database["public"]["Enums"]["peer_review_state"]
          program_id?: string | null
          published_date?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          status?: Database["public"]["Enums"]["outcome_status"]
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
          venue?: string | null
          verified_at?: string | null
        }
        Update: {
          citation_count?: number
          created_at?: string
          doi?: string | null
          id?: string
          output_type?: Database["public"]["Enums"]["research_output_type"]
          peer_review_state?: Database["public"]["Enums"]["peer_review_state"]
          program_id?: string | null
          published_date?: string | null
          reviewer_role?: string | null
          reviewer_user_id?: string | null
          status?: Database["public"]["Enums"]["outcome_status"]
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          venue?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      research_publications: {
        Row: {
          abstract: string | null
          authors: string[]
          created_at: string
          doi: string | null
          external_url: string | null
          faculty_area: string
          id: string
          is_peer_reviewed: boolean
          status: string
          title: string
          updated_at: string
          venue: string
          year: number
        }
        Insert: {
          abstract?: string | null
          authors?: string[]
          created_at?: string
          doi?: string | null
          external_url?: string | null
          faculty_area: string
          id?: string
          is_peer_reviewed?: boolean
          status?: string
          title: string
          updated_at?: string
          venue: string
          year: number
        }
        Update: {
          abstract?: string | null
          authors?: string[]
          created_at?: string
          doi?: string | null
          external_url?: string | null
          faculty_area?: string
          id?: string
          is_peer_reviewed?: boolean
          status?: string
          title?: string
          updated_at?: string
          venue?: string
          year?: number
        }
        Relationships: []
      }
      reward_ledger: {
        Row: {
          amount: number
          created_at: string | null
          event_type: string
          id: string
          meta: Json | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          event_type: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          event_type?: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      reward_rules: {
        Row: {
          base_amount: number
          extra: Json | null
          key: string
        }
        Insert: {
          base_amount: number
          extra?: Json | null
          key: string
        }
        Update: {
          base_amount?: number
          extra?: Json | null
          key?: string
        }
        Relationships: []
      }
      rubric_criteria: {
        Row: {
          assignment_id: string | null
          description: string | null
          id: string
          label: string | null
          weight: number | null
        }
        Insert: {
          assignment_id?: string | null
          description?: string | null
          id?: string
          label?: string | null
          weight?: number | null
        }
        Update: {
          assignment_id?: string | null
          description?: string | null
          id?: string
          label?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      scripture_memory: {
        Row: {
          id: string
          last_reviewed_at: string | null
          mastery_level: number | null
          memorized_at: string | null
          review_count: number | null
          user_id: string
          verse_reference: string
          verse_text: string
        }
        Insert: {
          id?: string
          last_reviewed_at?: string | null
          mastery_level?: number | null
          memorized_at?: string | null
          review_count?: number | null
          user_id: string
          verse_reference: string
          verse_text: string
        }
        Update: {
          id?: string
          last_reviewed_at?: string | null
          mastery_level?: number | null
          memorized_at?: string | null
          review_count?: number | null
          user_id?: string
          verse_reference?: string
          verse_text?: string
        }
        Relationships: []
      }
      scroll_analytics: {
        Row: {
          created_at: string | null
          event_payload: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_payload?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_payload?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      scroll_books: {
        Row: {
          author: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          faculty: string
          id: string
          level: string
          published_at: string | null
          quality_score: number | null
          subject: string
          subtitle: string | null
          theological_alignment: number | null
          title: string
          total_chapters: number | null
          total_pages: number | null
          updated_at: string
        }
        Insert: {
          author?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          faculty: string
          id?: string
          level: string
          published_at?: string | null
          quality_score?: number | null
          subject: string
          subtitle?: string | null
          theological_alignment?: number | null
          title: string
          total_chapters?: number | null
          total_pages?: number | null
          updated_at?: string
        }
        Update: {
          author?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          faculty?: string
          id?: string
          level?: string
          published_at?: string | null
          quality_score?: number | null
          subject?: string
          subtitle?: string | null
          theological_alignment?: number | null
          title?: string
          total_chapters?: number | null
          total_pages?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      scroll_chapters: {
        Row: {
          book_id: string
          content: string
          created_at: string
          id: string
          key_concepts: string[] | null
          order_index: number
          reading_time_minutes: number | null
          scripture_references: string[] | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          book_id: string
          content: string
          created_at?: string
          id?: string
          key_concepts?: string[] | null
          order_index: number
          reading_time_minutes?: number | null
          scripture_references?: string[] | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          content?: string
          created_at?: string
          id?: string
          key_concepts?: string[] | null
          order_index?: number
          reading_time_minutes?: number | null
          scripture_references?: string[] | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scroll_chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "scroll_books"
            referencedColumns: ["id"]
          },
        ]
      }
      scroll_distinctions: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          theme: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          name: string
          theme?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          theme?: string | null
        }
        Relationships: []
      }
      scroll_integrity_logs: {
        Row: {
          created_at: string | null
          hash: string
          id: string
          module: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          hash: string
          id?: string
          module: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          hash?: string
          id?: string
          module?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: []
      }
      scroll_reading_progress: {
        Row: {
          book_id: string
          bookmarks: Json | null
          chapter_id: string | null
          completed_at: string | null
          created_at: string
          highlights: Json | null
          id: string
          last_read_at: string | null
          notes: Json | null
          progress_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          bookmarks?: Json | null
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string
          highlights?: Json | null
          id?: string
          last_read_at?: string | null
          notes?: Json | null
          progress_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          bookmarks?: Json | null
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string
          highlights?: Json | null
          id?: string
          last_read_at?: string | null
          notes?: Json | null
          progress_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scroll_reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "scroll_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scroll_reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "scroll_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      scroll_transcripts: {
        Row: {
          badges_earned: Json | null
          courses_completed: Json | null
          created_at: string | null
          degrees_awarded: Json | null
          generated_at: string | null
          gpa_equivalent: number | null
          heaven_ledger_entries: Json | null
          id: string
          prophetic_scores: Json | null
          scroll_alignment_scores: Json | null
          skills_mastered: Json | null
          total_scrollgold: number | null
          total_xp: number | null
          transcript_type: string | null
          user_id: string
          valid_until: string | null
          verification_hash: string | null
        }
        Insert: {
          badges_earned?: Json | null
          courses_completed?: Json | null
          created_at?: string | null
          degrees_awarded?: Json | null
          generated_at?: string | null
          gpa_equivalent?: number | null
          heaven_ledger_entries?: Json | null
          id?: string
          prophetic_scores?: Json | null
          scroll_alignment_scores?: Json | null
          skills_mastered?: Json | null
          total_scrollgold?: number | null
          total_xp?: number | null
          transcript_type?: string | null
          user_id: string
          valid_until?: string | null
          verification_hash?: string | null
        }
        Update: {
          badges_earned?: Json | null
          courses_completed?: Json | null
          created_at?: string | null
          degrees_awarded?: Json | null
          generated_at?: string | null
          gpa_equivalent?: number | null
          heaven_ledger_entries?: Json | null
          id?: string
          prophetic_scores?: Json | null
          scroll_alignment_scores?: Json | null
          skills_mastered?: Json | null
          total_scrollgold?: number | null
          total_xp?: number | null
          transcript_type?: string | null
          user_id?: string
          valid_until?: string | null
          verification_hash?: string | null
        }
        Relationships: []
      }
      scrollcoin_analytics_daily: {
        Row: {
          active_users: number | null
          created_at: string | null
          date: string
          id: string
          net_change: number | null
          top_sources: Json | null
          total_earned: number | null
          total_spent: number | null
        }
        Insert: {
          active_users?: number | null
          created_at?: string | null
          date: string
          id?: string
          net_change?: number | null
          top_sources?: Json | null
          total_earned?: number | null
          total_spent?: number | null
        }
        Update: {
          active_users?: number | null
          created_at?: string | null
          date?: string
          id?: string
          net_change?: number | null
          top_sources?: Json | null
          total_earned?: number | null
          total_spent?: number | null
        }
        Relationships: []
      }
      scrollcoin_bridge_log: {
        Row: {
          amount: number | null
          created_at: string | null
          direction: string | null
          id: string
          status: string | null
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          direction?: string | null
          id?: string
          status?: string | null
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          direction?: string | null
          id?: string
          status?: string | null
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scrollcoin_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      semesters: {
        Row: {
          academic_year_id: string | null
          add_drop_deadline: string | null
          created_at: string | null
          end_date: string
          finals_end: string | null
          finals_start: string | null
          id: string
          is_active: boolean | null
          name: string
          registration_end: string | null
          registration_open: boolean | null
          registration_start: string | null
          semester_order: number | null
          start_date: string
          term_type: string | null
          updated_at: string | null
          withdrawal_deadline: string | null
        }
        Insert: {
          academic_year_id?: string | null
          add_drop_deadline?: string | null
          created_at?: string | null
          end_date: string
          finals_end?: string | null
          finals_start?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          registration_end?: string | null
          registration_open?: boolean | null
          registration_start?: string | null
          semester_order?: number | null
          start_date: string
          term_type?: string | null
          updated_at?: string | null
          withdrawal_deadline?: string | null
        }
        Update: {
          academic_year_id?: string | null
          add_drop_deadline?: string | null
          created_at?: string | null
          end_date?: string
          finals_end?: string | null
          finals_start?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          registration_end?: string | null
          registration_open?: boolean | null
          registration_start?: string | null
          semester_order?: number | null
          start_date?: string
          term_type?: string | null
          updated_at?: string | null
          withdrawal_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "semesters_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_endorsements: {
        Row: {
          comment: string | null
          created_at: string
          endorser_id: string
          id: string
          student_skill_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          endorser_id: string
          id?: string
          student_skill_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          endorser_id?: string
          id?: string
          student_skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_student_skill_id_fkey"
            columns: ["student_skill_id"]
            isOneToOne: false
            referencedRelation: "student_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_catalog: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          difficulty_level: number | null
          faculty_id: string | null
          id: string
          name: string
          parent_skill_id: string | null
          prerequisites: Json | null
          scrollgold_value: number | null
          updated_at: string | null
          xp_value: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          faculty_id?: string | null
          id?: string
          name: string
          parent_skill_id?: string | null
          prerequisites?: Json | null
          scrollgold_value?: number | null
          updated_at?: string | null
          xp_value?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          faculty_id?: string | null
          id?: string
          name?: string
          parent_skill_id?: string | null
          prerequisites?: Json | null
          scrollgold_value?: number | null
          updated_at?: string | null
          xp_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_catalog_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_catalog_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "v_faculty_analytics"
            referencedColumns: ["faculty_id"]
          },
          {
            foreignKeyName: "skills_catalog_parent_skill_id_fkey"
            columns: ["parent_skill_id"]
            isOneToOne: false
            referencedRelation: "skills_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      spiritual_analytics_daily: {
        Row: {
          answered_prayers: number | null
          avg_prayer_streak: number | null
          created_at: string | null
          date: string
          id: string
          total_prayers: number | null
          unique_prayer_users: number | null
        }
        Insert: {
          answered_prayers?: number | null
          avg_prayer_streak?: number | null
          created_at?: string | null
          date: string
          id?: string
          total_prayers?: number | null
          unique_prayer_users?: number | null
        }
        Update: {
          answered_prayers?: number | null
          avg_prayer_streak?: number | null
          created_at?: string | null
          date?: string
          id?: string
          total_prayers?: number | null
          unique_prayer_users?: number | null
        }
        Relationships: []
      }
      spiritual_assessments: {
        Row: {
          assessment_type: string
          calling_insights: Json | null
          confidence_score: number | null
          created_at: string | null
          growth_areas: Json | null
          id: string
          scripture_references: Json | null
          spiritual_gifts: Json | null
          user_id: string | null
        }
        Insert: {
          assessment_type: string
          calling_insights?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          growth_areas?: Json | null
          id?: string
          scripture_references?: Json | null
          spiritual_gifts?: Json | null
          user_id?: string | null
        }
        Update: {
          assessment_type?: string
          calling_insights?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          growth_areas?: Json | null
          id?: string
          scripture_references?: Json | null
          spiritual_gifts?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spiritual_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "spiritual_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spiritual_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "spiritual_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      spiritual_metrics: {
        Row: {
          divine_score: number | null
          id: string
          ministry_readiness: number | null
          prayer_streak: number | null
          scripture_progress: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          divine_score?: number | null
          id?: string
          ministry_readiness?: number | null
          prayer_streak?: number | null
          scripture_progress?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          divine_score?: number | null
          id?: string
          ministry_readiness?: number | null
          prayer_streak?: number | null
          scripture_progress?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      student_academic_standing: {
        Row: {
          computed_by: string | null
          computed_inputs: Json
          created_at: string | null
          credits_attempted: number | null
          credits_earned: number | null
          cumulative_gpa: number | null
          dean_list: boolean | null
          evidence_sufficient: boolean
          gpa: number | null
          honors: string | null
          id: string
          intervention_flags: Json
          last_calculated_at: string | null
          plo_attainment_rate: number | null
          semester_id: string | null
          standing: string | null
          term_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          computed_by?: string | null
          computed_inputs?: Json
          created_at?: string | null
          credits_attempted?: number | null
          credits_earned?: number | null
          cumulative_gpa?: number | null
          dean_list?: boolean | null
          evidence_sufficient?: boolean
          gpa?: number | null
          honors?: string | null
          id?: string
          intervention_flags?: Json
          last_calculated_at?: string | null
          plo_attainment_rate?: number | null
          semester_id?: string | null
          standing?: string | null
          term_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          computed_by?: string | null
          computed_inputs?: Json
          created_at?: string | null
          credits_attempted?: number | null
          credits_earned?: number | null
          cumulative_gpa?: number | null
          dean_list?: boolean | null
          evidence_sufficient?: boolean
          gpa?: number | null
          honors?: string | null
          id?: string
          intervention_flags?: Json
          last_calculated_at?: string | null
          plo_attainment_rate?: number | null
          semester_id?: string | null
          standing?: string | null
          term_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_academic_standing_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academic_standing_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_applications: {
        Row: {
          created_at: string | null
          decision_notes: string | null
          education_background: string
          email: string
          full_name: string
          id: string
          institution_id: string
          motivation: string
          phone: string
          program_interest: string
          reference_info: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          spiritual_journey: string
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          decision_notes?: string | null
          education_background: string
          email: string
          full_name: string
          id?: string
          institution_id: string
          motivation: string
          phone: string
          program_interest: string
          reference_info?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spiritual_journey: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          decision_notes?: string | null
          education_background?: string
          email?: string
          full_name?: string
          id?: string
          institution_id?: string
          motivation?: string
          phone?: string
          program_interest?: string
          reference_info?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spiritual_journey?: string
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_applications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_degree_enrollments: {
        Row: {
          actual_graduation: string | null
          created_at: string
          credits_completed: number
          credits_required: number
          degree_id: string
          enrolled_at: string
          expected_graduation: string | null
          gpa: number | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_graduation?: string | null
          created_at?: string
          credits_completed?: number
          credits_required?: number
          degree_id: string
          enrolled_at?: string
          expected_graduation?: string | null
          gpa?: number | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_graduation?: string | null
          created_at?: string
          credits_completed?: number
          credits_required?: number
          degree_id?: string
          enrolled_at?: string
          expected_graduation?: string | null
          gpa?: number | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_degree_enrollments_degree_id_fkey"
            columns: ["degree_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_degree_enrollments_degree_id_fkey"
            columns: ["degree_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_degree_enrollments_degree_id_fkey"
            columns: ["degree_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      student_documents: {
        Row: {
          doc_type: string | null
          file_url: string | null
          id: string
          student_id: string | null
          uploaded_at: string | null
          verified: boolean | null
        }
        Insert: {
          doc_type?: string | null
          file_url?: string | null
          id?: string
          student_id?: string | null
          uploaded_at?: string | null
          verified?: boolean | null
        }
        Update: {
          doc_type?: string | null
          file_url?: string | null
          id?: string
          student_id?: string | null
          uploaded_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_academic_profiles"
            referencedColumns: ["student_record_id"]
          },
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_holds: {
        Row: {
          ai_signal: Json | null
          blocks_graduation: boolean
          blocks_registration: boolean
          blocks_transcript: boolean
          created_at: string
          decision_due_at: string | null
          escalation_due_at: string | null
          hold_type: string
          id: string
          is_active: boolean
          lifecycle_state: string
          notes: string | null
          placed_at: string
          placed_by: string | null
          reason: string
          reinstated_at: string | null
          reinstatement_conditions: string | null
          removed_at: string | null
          removed_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          review_due_at: string | null
          sanction_type: string | null
          severity: string
          temporary_restrictions: Json
          triggered_by_ai: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_signal?: Json | null
          blocks_graduation?: boolean
          blocks_registration?: boolean
          blocks_transcript?: boolean
          created_at?: string
          decision_due_at?: string | null
          escalation_due_at?: string | null
          hold_type: string
          id?: string
          is_active?: boolean
          lifecycle_state?: string
          notes?: string | null
          placed_at?: string
          placed_by?: string | null
          reason: string
          reinstated_at?: string | null
          reinstatement_conditions?: string | null
          removed_at?: string | null
          removed_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_due_at?: string | null
          sanction_type?: string | null
          severity?: string
          temporary_restrictions?: Json
          triggered_by_ai?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_signal?: Json | null
          blocks_graduation?: boolean
          blocks_registration?: boolean
          blocks_transcript?: boolean
          created_at?: string
          decision_due_at?: string | null
          escalation_due_at?: string | null
          hold_type?: string
          id?: string
          is_active?: boolean
          lifecycle_state?: string
          notes?: string | null
          placed_at?: string
          placed_by?: string | null
          reason?: string
          reinstated_at?: string | null
          reinstatement_conditions?: string | null
          removed_at?: string | null
          removed_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_due_at?: string | null
          sanction_type?: string | null
          severity?: string
          temporary_restrictions?: Json
          triggered_by_ai?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_intervention_alerts: {
        Row: {
          acknowledged_at: string | null
          assigned_faculty_id: string | null
          course_id: string
          created_at: string
          id: string
          metadata: Json
          recommended_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          trigger_reason: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_faculty_id?: string | null
          course_id: string
          created_at?: string
          id?: string
          metadata?: Json
          recommended_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          trigger_reason: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_faculty_id?: string | null
          course_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          recommended_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          trigger_reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_intervention_alerts_assigned_faculty_id_fkey"
            columns: ["assigned_faculty_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "student_intervention_alerts_assigned_faculty_id_fkey"
            columns: ["assigned_faculty_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_intervention_alerts_assigned_faculty_id_fkey"
            columns: ["assigned_faculty_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "student_intervention_alerts_assigned_faculty_id_fkey"
            columns: ["assigned_faculty_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "student_intervention_alerts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_intervention_alerts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "student_intervention_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "student_intervention_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_intervention_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "student_intervention_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      student_learning_profiles: {
        Row: {
          created_at: string | null
          goals: string[] | null
          id: string
          learning_style: string
          preferred_pace: string
          strengths: string[] | null
          study_time_preference: Json | null
          updated_at: string | null
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          created_at?: string | null
          goals?: string[] | null
          id?: string
          learning_style: string
          preferred_pace: string
          strengths?: string[] | null
          study_time_preference?: Json | null
          updated_at?: string | null
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          created_at?: string | null
          goals?: string[] | null
          id?: string
          learning_style?: string
          preferred_pace?: string
          strengths?: string[] | null
          study_time_preference?: Json | null
          updated_at?: string | null
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: []
      }
      student_module_progress: {
        Row: {
          attempts: number | null
          completed_at: string | null
          id: string
          last_accessed: string | null
          mastery_level: number | null
          module_id: string
          status: string
          time_spent: number | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          id?: string
          last_accessed?: string | null
          mastery_level?: number | null
          module_id: string
          status?: string
          time_spent?: number | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          id?: string
          last_accessed?: string | null
          mastery_level?: number | null
          module_id?: string
          status?: string
          time_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      student_qualifications: {
        Row: {
          created_at: string | null
          field_of_study: string | null
          graduation_date: string | null
          id: string
          institution_name: string | null
          is_verified: boolean | null
          level: string
          qualification_name: string
          qualification_type: string
          scroll_degree_id: string | null
          updated_at: string | null
          user_id: string
          verification_document_url: string | null
        }
        Insert: {
          created_at?: string | null
          field_of_study?: string | null
          graduation_date?: string | null
          id?: string
          institution_name?: string | null
          is_verified?: boolean | null
          level: string
          qualification_name: string
          qualification_type: string
          scroll_degree_id?: string | null
          updated_at?: string | null
          user_id: string
          verification_document_url?: string | null
        }
        Update: {
          created_at?: string | null
          field_of_study?: string | null
          graduation_date?: string | null
          id?: string
          institution_name?: string | null
          is_verified?: boolean | null
          level?: string
          qualification_name?: string
          qualification_type?: string
          scroll_degree_id?: string | null
          updated_at?: string | null
          user_id?: string
          verification_document_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_qualifications_scroll_degree_id_fkey"
            columns: ["scroll_degree_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_qualifications_scroll_degree_id_fkey"
            columns: ["scroll_degree_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_qualifications_scroll_degree_id_fkey"
            columns: ["scroll_degree_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      student_skills: {
        Row: {
          assessments_passed: number | null
          created_at: string | null
          evidence_portfolio: Json | null
          id: string
          last_assessed_at: string | null
          proficiency_level:
            | Database["public"]["Enums"]["skill_proficiency_level"]
            | null
          skill_id: string
          updated_at: string | null
          user_id: string
          validation_sources: Json | null
          xp_earned: number | null
        }
        Insert: {
          assessments_passed?: number | null
          created_at?: string | null
          evidence_portfolio?: Json | null
          id?: string
          last_assessed_at?: string | null
          proficiency_level?:
            | Database["public"]["Enums"]["skill_proficiency_level"]
            | null
          skill_id: string
          updated_at?: string | null
          user_id: string
          validation_sources?: Json | null
          xp_earned?: number | null
        }
        Update: {
          assessments_passed?: number | null
          created_at?: string | null
          evidence_portfolio?: Json | null
          id?: string
          last_assessed_at?: string | null
          proficiency_level?:
            | Database["public"]["Enums"]["skill_proficiency_level"]
            | null
          skill_id?: string
          updated_at?: string | null
          user_id?: string
          validation_sources?: Json | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_letter_url: string | null
          ai_review_score: number | null
          ai_review_summary: string | null
          ai_reviewed_at: string | null
          application_status: string | null
          cohort_number: number | null
          country: string | null
          created_at: string | null
          current_term: string | null
          current_year: number
          degree_program_id: string | null
          dob: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          institutional_email: string | null
          motivation_statement: string | null
          phone: string | null
          photo_url: string | null
          rejection_reason: string | null
          student_id_code: string | null
          user_id: string | null
          waitlisted_at: string | null
        }
        Insert: {
          address?: string | null
          admission_letter_url?: string | null
          ai_review_score?: number | null
          ai_review_summary?: string | null
          ai_reviewed_at?: string | null
          application_status?: string | null
          cohort_number?: number | null
          country?: string | null
          created_at?: string | null
          current_term?: string | null
          current_year?: number
          degree_program_id?: string | null
          dob?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          institutional_email?: string | null
          motivation_statement?: string | null
          phone?: string | null
          photo_url?: string | null
          rejection_reason?: string | null
          student_id_code?: string | null
          user_id?: string | null
          waitlisted_at?: string | null
        }
        Update: {
          address?: string | null
          admission_letter_url?: string | null
          ai_review_score?: number | null
          ai_review_summary?: string | null
          ai_reviewed_at?: string | null
          application_status?: string | null
          cohort_number?: number | null
          country?: string | null
          created_at?: string | null
          current_term?: string | null
          current_year?: number
          degree_program_id?: string | null
          dob?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          institutional_email?: string | null
          motivation_statement?: string | null
          phone?: string | null
          photo_url?: string | null
          rejection_reason?: string | null
          student_id_code?: string | null
          user_id?: string | null
          waitlisted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_messages: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          course_id: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          institution_id: string | null
          is_public: boolean | null
          max_members: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          institution_id?: string | null
          is_public?: boolean | null
          max_members?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          institution_id?: string | null
          is_public?: boolean | null
          max_members?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "study_groups_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          course_id: string
          created_at: string | null
          daily_schedule: Json
          id: string
          milestones: Json | null
          target_completion_date: string
          updated_at: string | null
          user_id: string
          weekly_hours: number
        }
        Insert: {
          course_id: string
          created_at?: string | null
          daily_schedule: Json
          id?: string
          milestones?: Json | null
          target_completion_date: string
          updated_at?: string | null
          user_id: string
          weekly_hours: number
        }
        Update: {
          course_id?: string
          created_at?: string | null
          daily_schedule?: Json
          id?: string
          milestones?: Json | null
          target_completion_date?: string
          updated_at?: string | null
          user_id?: string
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
        ]
      }
      submissions: {
        Row: {
          answers: Json | null
          assignment_id: string | null
          file_url: string | null
          id: string
          status: string | null
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          answers?: Json | null
          assignment_id?: string | null
          file_url?: string | null
          id?: string
          status?: string | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          answers?: Json | null
          assignment_id?: string | null
          file_url?: string | null
          id?: string
          status?: string | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_cents: number
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          interval: string
          payment_method_id: string | null
          plan_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          interval?: string
          payment_method_id?: string | null
          plan_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          interval?: string
          payment_method_id?: string | null
          plan_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      supreme_degree_applications: {
        Row: {
          anointing_verification: Json | null
          approved_at: string | null
          awarded_at: string | null
          created_at: string | null
          degree_type: Database["public"]["Enums"]["scroll_degree_level"]
          heaven_ledger_id: string | null
          id: string
          impact_metrics: Json | null
          innovation_contributions: Json | null
          kingdom_mark: string | null
          research_contributions: Json | null
          scroll_chain_hash: string | null
          scroll_defense_date: string | null
          scroll_defense_outcome: string | null
          scroll_defense_panel: Json | null
          scroll_fulfillment_evidence: Json
          scroll_seal_id: string | null
          scroll_witness_ids: string[] | null
          scroll_year: string | null
          scrollgold_valuation: number | null
          status: string | null
          submitted_at: string | null
          thesis_abstract: string | null
          thesis_document_url: string | null
          thesis_title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          anointing_verification?: Json | null
          approved_at?: string | null
          awarded_at?: string | null
          created_at?: string | null
          degree_type: Database["public"]["Enums"]["scroll_degree_level"]
          heaven_ledger_id?: string | null
          id?: string
          impact_metrics?: Json | null
          innovation_contributions?: Json | null
          kingdom_mark?: string | null
          research_contributions?: Json | null
          scroll_chain_hash?: string | null
          scroll_defense_date?: string | null
          scroll_defense_outcome?: string | null
          scroll_defense_panel?: Json | null
          scroll_fulfillment_evidence?: Json
          scroll_seal_id?: string | null
          scroll_witness_ids?: string[] | null
          scroll_year?: string | null
          scrollgold_valuation?: number | null
          status?: string | null
          submitted_at?: string | null
          thesis_abstract?: string | null
          thesis_document_url?: string | null
          thesis_title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          anointing_verification?: Json | null
          approved_at?: string | null
          awarded_at?: string | null
          created_at?: string | null
          degree_type?: Database["public"]["Enums"]["scroll_degree_level"]
          heaven_ledger_id?: string | null
          id?: string
          impact_metrics?: Json | null
          innovation_contributions?: Json | null
          kingdom_mark?: string | null
          research_contributions?: Json | null
          scroll_chain_hash?: string | null
          scroll_defense_date?: string | null
          scroll_defense_outcome?: string | null
          scroll_defense_panel?: Json | null
          scroll_fulfillment_evidence?: Json
          scroll_seal_id?: string | null
          scroll_witness_ids?: string[] | null
          scroll_year?: string | null
          scrollgold_valuation?: number | null
          status?: string | null
          submitted_at?: string | null
          thesis_abstract?: string | null
          thesis_document_url?: string | null
          thesis_title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suyas_audit_logs: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suyas_quality_rules: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_active: boolean
          pattern: string
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_active?: boolean
          pattern: string
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          pattern?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      suyas_quality_scans: {
        Row: {
          error_count: number
          id: string
          info_count: number
          issues: Json
          publish_blocked: boolean
          quality_score: number
          rules_applied: Json
          scanned_at: string
          scanned_by: string | null
          tables_scanned: string[]
          warning_count: number
        }
        Insert: {
          error_count?: number
          id?: string
          info_count?: number
          issues?: Json
          publish_blocked?: boolean
          quality_score: number
          rules_applied?: Json
          scanned_at?: string
          scanned_by?: string | null
          tables_scanned?: string[]
          warning_count?: number
        }
        Update: {
          error_count?: number
          id?: string
          info_count?: number
          issues?: Json
          publish_blocked?: boolean
          quality_score?: number
          rules_applied?: Json
          scanned_at?: string
          scanned_by?: string | null
          tables_scanned?: string[]
          warning_count?: number
        }
        Relationships: []
      }
      system_analytics_daily: {
        Row: {
          active_users: number | null
          ai_messages: number | null
          ai_tutor_sessions: number | null
          created_at: string | null
          date: string
          id: string
          new_applications: number | null
          new_enrollments: number | null
        }
        Insert: {
          active_users?: number | null
          ai_messages?: number | null
          ai_tutor_sessions?: number | null
          created_at?: string | null
          date: string
          id?: string
          new_applications?: number | null
          new_enrollments?: number | null
        }
        Update: {
          active_users?: number | null
          ai_messages?: number | null
          ai_tutor_sessions?: number | null
          created_at?: string | null
          date?: string
          id?: string
          new_applications?: number | null
          new_enrollments?: number | null
        }
        Relationships: []
      }
      teaching_assignments: {
        Row: {
          course_id: string | null
          created_at: string | null
          faculty_user_id: string | null
          id: string
          role: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          faculty_user_id?: string | null
          id?: string
          role?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          faculty_user_id?: string | null
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teaching_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
        ]
      }
      term_enrollments: {
        Row: {
          course_id: string
          created_at: string
          dropped_at: string | null
          enrolled_at: string
          id: string
          status: string
          student_id: string
          term_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          dropped_at?: string | null
          enrolled_at?: string
          id?: string
          status?: string
          student_id: string
          term_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          dropped_at?: string | null
          enrolled_at?: string
          id?: string
          status?: string
          student_id?: string
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_enrollments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string | null
          content: string
          created_at: string | null
          id: string
          institution_id: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          institution_id?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          institution_id?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonies_institution_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      testimony_encouragements: {
        Row: {
          created_at: string
          id: string
          testimony_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          testimony_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          testimony_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimony_encouragements_testimony_id_fkey"
            columns: ["testimony_id"]
            isOneToOne: false
            referencedRelation: "testimonies"
            referencedColumns: ["id"]
          },
        ]
      }
      thesis_committee_members: {
        Row: {
          committee_id: string
          created_at: string
          external_affiliation: string | null
          id: string
          is_external: boolean
          member_id: string
          responded_at: string | null
          role: Database["public"]["Enums"]["thesis_committee_role"]
          state: Database["public"]["Enums"]["thesis_member_state"]
          updated_at: string
        }
        Insert: {
          committee_id: string
          created_at?: string
          external_affiliation?: string | null
          id?: string
          is_external?: boolean
          member_id: string
          responded_at?: string | null
          role: Database["public"]["Enums"]["thesis_committee_role"]
          state?: Database["public"]["Enums"]["thesis_member_state"]
          updated_at?: string
        }
        Update: {
          committee_id?: string
          created_at?: string
          external_affiliation?: string | null
          id?: string
          is_external?: boolean
          member_id?: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["thesis_committee_role"]
          state?: Database["public"]["Enums"]["thesis_member_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "thesis_committee_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "thesis_committees"
            referencedColumns: ["id"]
          },
        ]
      }
      thesis_committees: {
        Row: {
          created_at: string
          formed_at: string
          formed_by: string | null
          id: string
          notes: string | null
          thesis_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          formed_at?: string
          formed_by?: string | null
          id?: string
          notes?: string | null
          thesis_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          formed_at?: string
          formed_by?: string | null
          id?: string
          notes?: string | null
          thesis_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "thesis_committees_thesis_id_fkey"
            columns: ["thesis_id"]
            isOneToOne: true
            referencedRelation: "thesis_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      thesis_defense_votes: {
        Row: {
          cast_at: string
          created_at: string
          defense_id: string
          examiner_id: string
          examiner_role: Database["public"]["Enums"]["thesis_committee_role"]
          id: string
          locked: boolean
          rationale: string | null
          vote: Database["public"]["Enums"]["thesis_vote_value"]
        }
        Insert: {
          cast_at?: string
          created_at?: string
          defense_id: string
          examiner_id: string
          examiner_role: Database["public"]["Enums"]["thesis_committee_role"]
          id?: string
          locked?: boolean
          rationale?: string | null
          vote: Database["public"]["Enums"]["thesis_vote_value"]
        }
        Update: {
          cast_at?: string
          created_at?: string
          defense_id?: string
          examiner_id?: string
          examiner_role?: Database["public"]["Enums"]["thesis_committee_role"]
          id?: string
          locked?: boolean
          rationale?: string | null
          vote?: Database["public"]["Enums"]["thesis_vote_value"]
        }
        Relationships: [
          {
            foreignKeyName: "thesis_defense_votes_defense_id_fkey"
            columns: ["defense_id"]
            isOneToOne: false
            referencedRelation: "thesis_defenses"
            referencedColumns: ["id"]
          },
        ]
      }
      thesis_defenses: {
        Row: {
          computed_outcome:
            | Database["public"]["Enums"]["thesis_recommendation"]
            | null
          created_at: string
          duration_minutes: number
          id: string
          is_public: boolean | null
          location: string | null
          mode: Database["public"]["Enums"]["thesis_defense_mode"]
          outcome_computed_at: string | null
          scheduled_at: string
          scheduled_by: string | null
          status: Database["public"]["Enums"]["thesis_defense_status"]
          submission_id: string | null
          thesis_id: string
          updated_at: string
          virtual_link: string | null
        }
        Insert: {
          computed_outcome?:
            | Database["public"]["Enums"]["thesis_recommendation"]
            | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_public?: boolean | null
          location?: string | null
          mode: Database["public"]["Enums"]["thesis_defense_mode"]
          outcome_computed_at?: string | null
          scheduled_at: string
          scheduled_by?: string | null
          status?: Database["public"]["Enums"]["thesis_defense_status"]
          submission_id?: string | null
          thesis_id: string
          updated_at?: string
          virtual_link?: string | null
        }
        Update: {
          computed_outcome?:
            | Database["public"]["Enums"]["thesis_recommendation"]
            | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_public?: boolean | null
          location?: string | null
          mode?: Database["public"]["Enums"]["thesis_defense_mode"]
          outcome_computed_at?: string | null
          scheduled_at?: string
          scheduled_by?: string | null
          status?: Database["public"]["Enums"]["thesis_defense_status"]
          submission_id?: string | null
          thesis_id?: string
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thesis_defenses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "thesis_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thesis_defenses_thesis_id_fkey"
            columns: ["thesis_id"]
            isOneToOne: false
            referencedRelation: "thesis_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      thesis_dissertation_rules: {
        Row: {
          created_at: string
          degree_program_id: string
          ethics_review_required: boolean
          id: string
          milestones: Json
          min_word_count: number | null
          oral_defense_required: boolean
          proposal_required: boolean
          publication_required: boolean
          supervisor_required: boolean
        }
        Insert: {
          created_at?: string
          degree_program_id: string
          ethics_review_required?: boolean
          id?: string
          milestones?: Json
          min_word_count?: number | null
          oral_defense_required?: boolean
          proposal_required?: boolean
          publication_required?: boolean
          supervisor_required?: boolean
        }
        Update: {
          created_at?: string
          degree_program_id?: string
          ethics_review_required?: boolean
          id?: string
          milestones?: Json
          min_word_count?: number | null
          oral_defense_required?: boolean
          proposal_required?: boolean
          publication_required?: boolean
          supervisor_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "thesis_dissertation_rules_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thesis_dissertation_rules_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thesis_dissertation_rules_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      thesis_integrity_flags: {
        Row: {
          created_at: string
          description: string
          detected_by_ai: boolean
          evidence: Json | null
          id: string
          kind: Database["public"]["Enums"]["thesis_integrity_kind"]
          raised_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          state: Database["public"]["Enums"]["thesis_flag_state"]
          submission_id: string | null
          thesis_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          detected_by_ai?: boolean
          evidence?: Json | null
          id?: string
          kind: Database["public"]["Enums"]["thesis_integrity_kind"]
          raised_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          state?: Database["public"]["Enums"]["thesis_flag_state"]
          submission_id?: string | null
          thesis_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          detected_by_ai?: boolean
          evidence?: Json | null
          id?: string
          kind?: Database["public"]["Enums"]["thesis_integrity_kind"]
          raised_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          state?: Database["public"]["Enums"]["thesis_flag_state"]
          submission_id?: string | null
          thesis_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "thesis_integrity_flags_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "thesis_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thesis_integrity_flags_thesis_id_fkey"
            columns: ["thesis_id"]
            isOneToOne: false
            referencedRelation: "thesis_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      thesis_milestones: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          evidence_url: string | null
          id: string
          label: string
          milestone_key: string
          notes: string | null
          required: boolean
          thesis_id: string
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          evidence_url?: string | null
          id?: string
          label: string
          milestone_key: string
          notes?: string | null
          required?: boolean
          thesis_id: string
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          evidence_url?: string | null
          id?: string
          label?: string
          milestone_key?: string
          notes?: string | null
          required?: boolean
          thesis_id?: string
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thesis_milestones_thesis_id_fkey"
            columns: ["thesis_id"]
            isOneToOne: false
            referencedRelation: "thesis_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      thesis_projects: {
        Row: {
          abstract: string | null
          ai_assistance_disclosure: string | null
          created_at: string
          current_stage: string
          degree_program_id: string | null
          ethics_approved_at: string | null
          ethics_required: boolean
          final_outcome:
            | Database["public"]["Enums"]["thesis_recommendation"]
            | null
          id: string
          passed_at: string | null
          project_type: Database["public"]["Enums"]["thesis_project_type"]
          research_questions: string[] | null
          self_reported_originality: number | null
          status: Database["public"]["Enums"]["thesis_status"]
          student_id: string
          supervisor_id: string | null
          title: string
          updated_at: string
          verified_similarity_score: number | null
        }
        Insert: {
          abstract?: string | null
          ai_assistance_disclosure?: string | null
          created_at?: string
          current_stage?: string
          degree_program_id?: string | null
          ethics_approved_at?: string | null
          ethics_required?: boolean
          final_outcome?:
            | Database["public"]["Enums"]["thesis_recommendation"]
            | null
          id?: string
          passed_at?: string | null
          project_type: Database["public"]["Enums"]["thesis_project_type"]
          research_questions?: string[] | null
          self_reported_originality?: number | null
          status?: Database["public"]["Enums"]["thesis_status"]
          student_id: string
          supervisor_id?: string | null
          title: string
          updated_at?: string
          verified_similarity_score?: number | null
        }
        Update: {
          abstract?: string | null
          ai_assistance_disclosure?: string | null
          created_at?: string
          current_stage?: string
          degree_program_id?: string | null
          ethics_approved_at?: string | null
          ethics_required?: boolean
          final_outcome?:
            | Database["public"]["Enums"]["thesis_recommendation"]
            | null
          id?: string
          passed_at?: string | null
          project_type?: Database["public"]["Enums"]["thesis_project_type"]
          research_questions?: string[] | null
          self_reported_originality?: number | null
          status?: Database["public"]["Enums"]["thesis_status"]
          student_id?: string
          supervisor_id?: string | null
          title?: string
          updated_at?: string
          verified_similarity_score?: number | null
        }
        Relationships: []
      }
      thesis_reviews: {
        Row: {
          created_at: string
          id: string
          locked: boolean
          recommendation: Database["public"]["Enums"]["thesis_recommendation"]
          reviewer_id: string
          reviewer_role: Database["public"]["Enums"]["thesis_committee_role"]
          rubric_scores: Json
          submission_id: string
          submitted_at: string
          written_feedback: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          locked?: boolean
          recommendation: Database["public"]["Enums"]["thesis_recommendation"]
          reviewer_id: string
          reviewer_role: Database["public"]["Enums"]["thesis_committee_role"]
          rubric_scores?: Json
          submission_id: string
          submitted_at?: string
          written_feedback?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          locked?: boolean
          recommendation?: Database["public"]["Enums"]["thesis_recommendation"]
          reviewer_id?: string
          reviewer_role?: Database["public"]["Enums"]["thesis_committee_role"]
          rubric_scores?: Json
          submission_id?: string
          submitted_at?: string
          written_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thesis_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "thesis_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      thesis_submissions: {
        Row: {
          ai_assistance_disclosure: string | null
          created_at: string
          file_url: string | null
          id: string
          kind: Database["public"]["Enums"]["thesis_submission_kind"]
          locked: boolean
          similarity_score: number | null
          submitted_at: string
          submitted_by: string
          thesis_id: string
          version: number
          word_count: number | null
        }
        Insert: {
          ai_assistance_disclosure?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          kind: Database["public"]["Enums"]["thesis_submission_kind"]
          locked?: boolean
          similarity_score?: number | null
          submitted_at?: string
          submitted_by: string
          thesis_id: string
          version: number
          word_count?: number | null
        }
        Update: {
          ai_assistance_disclosure?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["thesis_submission_kind"]
          locked?: boolean
          similarity_score?: number | null
          submitted_at?: string
          submitted_by?: string
          thesis_id?: string
          version?: number
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "thesis_submissions_thesis_id_fkey"
            columns: ["thesis_id"]
            isOneToOne: false
            referencedRelation: "thesis_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transcript_equivalency_rules: {
        Row: {
          conversion_factor: number
          created_at: string
          id: string
          notes: string | null
          source_system: string
          target_system: string
        }
        Insert: {
          conversion_factor: number
          created_at?: string
          id?: string
          notes?: string | null
          source_system?: string
          target_system: string
        }
        Update: {
          conversion_factor?: number
          created_at?: string
          id?: string
          notes?: string | null
          source_system?: string
          target_system?: string
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          completed_at: string | null
          course_id: string | null
          faculty: string | null
          grade: string | null
          id: string
          score: number | null
          student_id: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          faculty?: string | null
          grade?: string | null
          id?: string
          score?: number | null
          student_id?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          faculty?: string | null
          grade?: string | null
          id?: string
          score?: number | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcripts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "transcripts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_academic_profiles"
            referencedColumns: ["student_record_id"]
          },
          {
            foreignKeyName: "transcripts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_decisions: {
        Row: {
          credit_remap: Json
          decided_at: string
          decided_by: string
          decision: string
          id: string
          new_program_id: string | null
          prior_program_id: string | null
          prior_student_snapshot: Json
          rationale: string | null
          request_id: string
        }
        Insert: {
          credit_remap?: Json
          decided_at?: string
          decided_by: string
          decision: string
          id?: string
          new_program_id?: string | null
          prior_program_id?: string | null
          prior_student_snapshot: Json
          rationale?: string | null
          request_id: string
        }
        Update: {
          credit_remap?: Json
          decided_at?: string
          decided_by?: string
          decision?: string
          id?: string
          new_program_id?: string | null
          prior_program_id?: string | null
          prior_student_snapshot?: Json
          rationale?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "program_transfer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_review_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          request_id: string
          reviewer_id: string
          reviewer_role: string
          stage: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          request_id: string
          reviewer_id: string
          reviewer_role: string
          stage: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          request_id?: string
          reviewer_id?: string
          reviewer_role?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_review_notes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "program_transfer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_transparency_reports: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          narrative: string | null
          period_end: string
          period_start: string
          published_at: string | null
          published_by: string | null
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics?: Json
          narrative?: string | null
          period_end: string
          period_start: string
          published_at?: string | null
          published_by?: string | null
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          narrative?: string | null
          period_end?: string
          period_start?: string
          published_at?: string | null
          published_by?: string | null
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tuition_billing_cycles: {
        Row: {
          amount_due: number
          amount_paid: number | null
          created_at: string | null
          due_date: string
          hold_placed: boolean | null
          id: string
          payment_plan: boolean | null
          scrollgold_applied: number | null
          semester_id: string | null
          status: string | null
          stripe_invoice_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          created_at?: string | null
          due_date: string
          hold_placed?: boolean | null
          id?: string
          payment_plan?: boolean | null
          scrollgold_applied?: number | null
          semester_id?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string
          hold_placed?: boolean | null
          id?: string
          payment_plan?: boolean | null
          scrollgold_applied?: number | null
          semester_id?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tuition_billing_cycles_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_student_memory: {
        Row: {
          consecutive_low_scores: number
          course_id: string
          created_at: string
          current_mode: string
          id: string
          intervention_flag: boolean
          last_interaction_at: string
          last_topics: Json
          misconceptions: Json
          preferred_pace: string
          strengths: Json
          updated_at: string
          user_id: string
          weak_areas: Json
        }
        Insert: {
          consecutive_low_scores?: number
          course_id: string
          created_at?: string
          current_mode?: string
          id?: string
          intervention_flag?: boolean
          last_interaction_at?: string
          last_topics?: Json
          misconceptions?: Json
          preferred_pace?: string
          strengths?: Json
          updated_at?: string
          user_id: string
          weak_areas?: Json
        }
        Update: {
          consecutive_low_scores?: number
          course_id?: string
          created_at?: string
          current_mode?: string
          id?: string
          intervention_flag?: boolean
          last_interaction_at?: string
          last_topics?: Json
          misconceptions?: Json
          preferred_pace?: string
          strengths?: Json
          updated_at?: string
          user_id?: string
          weak_areas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tutor_student_memory_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_student_memory_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "tutor_student_memory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutor_student_memory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_student_memory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tutor_student_memory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          courses_completed: number | null
          current_streak: number | null
          last_activity_date: string | null
          longest_streak: number | null
          total_scrollcoins: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          courses_completed?: number | null
          current_streak?: number | null
          last_activity_date?: string | null
          longest_streak?: number | null
          total_scrollcoins?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          courses_completed?: number | null
          current_streak?: number | null
          last_activity_date?: string | null
          longest_streak?: number | null
          total_scrollcoins?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      virtual_labs: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          id: string
          resources_url: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          resources_url?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          id?: string
          resources_url?: string | null
          title?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          eth_address: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          eth_address?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          eth_address?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      xr_classrooms: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          institution_id: string | null
          media_url: string | null
          scheduled_time: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          media_url?: string | null
          scheduled_time?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          media_url?: string | null
          scheduled_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "xr_classrooms_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      accreditation_baseline_report: {
        Row: {
          accreditation_checked_at: string | null
          accreditation_metrics: Json | null
          accreditation_status: string | null
          faculty: string | null
          id: string | null
          level: string | null
          title: string | null
        }
        Insert: {
          accreditation_checked_at?: string | null
          accreditation_metrics?: Json | null
          accreditation_status?: string | null
          faculty?: string | null
          id?: string | null
          level?: string | null
          title?: string | null
        }
        Update: {
          accreditation_checked_at?: string | null
          accreditation_metrics?: Json | null
          accreditation_status?: string | null
          faculty?: string | null
          id?: string | null
          level?: string | null
          title?: string | null
        }
        Relationships: []
      }
      ai_tutor_analytics: {
        Row: {
          avg_duration: number | null
          avg_satisfaction: number | null
          date: string | null
          total_interactions: number | null
        }
        Relationships: []
      }
      faculty_verification_summary: {
        Row: {
          approved_faculty_count: number | null
          domain_code: string | null
          domain_label: string | null
          verified_credential_holders: number | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          avatar_url: string | null
          badges_earned: number | null
          courses_completed: number | null
          current_streak: number | null
          display_name: string | null
          longest_streak: number | null
          total_scrollcoins: number | null
          total_xp: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges_earned?: never
          courses_completed?: never
          current_streak?: never
          display_name?: string | null
          longest_streak?: never
          total_scrollcoins?: never
          total_xp?: never
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges_earned?: never
          courses_completed?: never
          current_streak?: never
          display_name?: string | null
          longest_streak?: never
          total_scrollcoins?: never
          total_xp?: never
          user_id?: string | null
        }
        Relationships: []
      }
      program_public_render_state: {
        Row: {
          accreditation_status: string | null
          faculty: string | null
          institutional_layer:
            | Database["public"]["Enums"]["institutional_layer"]
            | null
          lifecycle_status: string | null
          program_id: string | null
          program_status: string | null
          public_status: Json | null
          scroll_level: string | null
          title: string | null
        }
        Insert: {
          accreditation_status?: string | null
          faculty?: string | null
          institutional_layer?:
            | Database["public"]["Enums"]["institutional_layer"]
            | null
          lifecycle_status?: string | null
          program_id?: string | null
          program_status?: string | null
          public_status?: never
          scroll_level?: string | null
          title?: string | null
        }
        Update: {
          accreditation_status?: string | null
          faculty?: string | null
          institutional_layer?:
            | Database["public"]["Enums"]["institutional_layer"]
            | null
          lifecycle_status?: string | null
          program_id?: string | null
          program_status?: string | null
          public_status?: never
          scroll_level?: string | null
          title?: string | null
        }
        Relationships: []
      }
      student_academic_profiles: {
        Row: {
          academic_level: string | null
          academic_status: string | null
          admitted_at: string | null
          application_status: string | null
          cohort_label: string | null
          cohort_number: number | null
          created_at: string | null
          degree_program_id: string | null
          enrolled_at: string | null
          faculty_name: string | null
          full_name: string | null
          graduated_at: string | null
          institutional_email: string | null
          matriculated: boolean | null
          program_name: string | null
          student_id_code: string | null
          student_record_id: string | null
          suyas_track: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "accreditation_baseline_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_degree_program_id_fkey"
            columns: ["degree_program_id"]
            isOneToOne: false
            referencedRelation: "program_public_render_state"
            referencedColumns: ["program_id"]
          },
        ]
      }
      student_gpa: {
        Row: {
          courses_taken: number | null
          full_name: string | null
          gpa: number | null
          total_credits: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_admin_overview: {
        Row: {
          total_enrollments: number | null
          total_events: number | null
          total_prayers: number | null
          total_scrollcoin_earned: number | null
          total_scrollcoin_spent: number | null
          total_transactions: number | null
          total_users: number | null
          verified_modules: number | null
        }
        Relationships: []
      }
      v_course_gradebook: {
        Row: {
          course_id: string | null
          course_title: string | null
          grade: string | null
          points_earned: number | null
          progress: number | null
          student_email: string | null
          student_name: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_student_analytics"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_dashboard"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_faculty_analytics: {
        Row: {
          avg_rating: number | null
          course_count: number | null
          description: string | null
          faculty_id: string | null
          faculty_name: string | null
          total_enrollments: number | null
        }
        Relationships: []
      }
      v_grading_queue: {
        Row: {
          assignment_id: string | null
          assignment_title: string | null
          course_id: string | null
          course_title: string | null
          feedback: string | null
          grade: number | null
          status: string | null
          student_id: string | null
          student_name: string | null
          submission_id: string | null
          submitted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "v_course_gradebook"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      v_scroll_analytics_daily: {
        Row: {
          date: string | null
          event_count: number | null
          event_type: string | null
        }
        Relationships: []
      }
      v_student_analytics: {
        Row: {
          avg_progress: number | null
          courses_completed: number | null
          email: string | null
          enrollment_count: number | null
          full_name: string | null
          joined_at: string | null
          total_xp: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_user_dashboard: {
        Row: {
          avg_progress: number | null
          balance: number | null
          courses_enrolled: number | null
          email: string | null
          prayers_answered: number | null
          total_prayers: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accreditation_readiness: { Args: { _program_id: string }; Returns: Json }
      accreditation_readiness_score: {
        Args: { p_program_id: string }
        Returns: number
      }
      admin_override_enrollment: {
        Args: { p_course_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      admin_reassign_program: {
        Args: { p_new_program_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      advance_transfer_request: {
        Args: { p_next_status: string; p_note?: string; p_request_id: string }
        Returns: boolean
      }
      archive_academic_year: { Args: { p_year_id: string }; Returns: boolean }
      assessment_rigor_score: { Args: { p_course_id: string }; Returns: Json }
      award_by_rule: {
        Args: {
          p_event: string
          p_meta?: Json
          p_user: string
          p_value?: number
        }
        Returns: undefined
      }
      award_scrollcoins: {
        Args: {
          p_amount: number
          p_event: string
          p_meta?: Json
          p_user: string
        }
        Returns: undefined
      }
      beta_cohort_status: { Args: never; Returns: Json }
      can_access_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: Json
      }
      check_diploma_seal_criteria: {
        Args: { p_course_id: string }
        Returns: Json
      }
      check_graduation_eligibility:
        | { Args: { _program_id: string; _user_id: string }; Returns: Json }
        | {
            Args: { p_user_id: string }
            Returns: {
              credits_completed: number
              credits_required: number
              eligible: boolean
              gpa: number
              has_holds: boolean
              min_gpa: number
              missing_requirements: string[]
            }[]
          }
      check_seal_criteria: { Args: { p_course_id: string }; Returns: Json }
      compute_practicum_outcome: {
        Args: { _placement_id: string }
        Returns: Json
      }
      compute_program_public_status: {
        Args: { p_program_id: string }
        Returns: Json
      }
      compute_student_gpa: {
        Args: { p_student_id: string }
        Returns: {
          gpa: number
          total_credit_hours: number
        }[]
      }
      compute_thesis_defense_outcome: {
        Args: { p_defense_id: string }
        Returns: Database["public"]["Enums"]["thesis_recommendation"]
      }
      create_notification: {
        Args: {
          p_body: string
          p_metadata?: Json
          p_related_id?: string
          p_related_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      curriculum_depth_score: { Args: { p_program_id: string }; Returns: Json }
      curriculum_depth_validator: {
        Args: { p_program_id: string }
        Returns: Json
      }
      decide_integrity_appeal: {
        Args: {
          _appeal_id: string
          _internal_notes?: string
          _outcome: string
          _public_rationale: string
        }
        Returns: Json
      }
      decide_transfer_request: {
        Args: {
          p_credit_remap?: Json
          p_decision: string
          p_rationale?: string
          p_request_id: string
        }
        Returns: Json
      }
      decrement_post_likes: { Args: { post_id: string }; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      detect_schedule_conflicts: {
        Args: {
          p_course_id: string
          p_day_of_week: string
          p_end_time: string
          p_exclude_session_id?: string
          p_semester_id?: string
          p_start_time: string
        }
        Returns: {
          conflict_day: string
          conflict_end: string
          conflict_start: string
          conflict_type: string
          course_title: string
          session_id: string
          session_title: string
        }[]
      }
      earn_scrollcoin: {
        Args: { p_amount: number; p_desc: string; p_user_id: string }
        Returns: undefined
      }
      enforce_program_quality_gate: {
        Args: { p_program_id: string }
        Returns: Json
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enroll_with_gates: {
        Args: {
          _course_id: string
          _course_offering_id?: string
          _term_id?: string
        }
        Returns: Json
      }
      ensure_default_institution_membership: { Args: never; Returns: string }
      generate_accreditation_blueprint: {
        Args: never
        Returns: {
          program_id: string
          slots_inserted: number
        }[]
      }
      generate_student_identity: {
        Args: { p_student_id: string }
        Returns: Json
      }
      get_assigned_next_course: {
        Args: { p_user_id: string }
        Returns: {
          already_enrolled: boolean
          course_id: string
          course_title: string
          is_required: boolean
          is_unlocked: boolean
          lock_reason: string
          missing_prereqs: string[]
          progress: number
          recommended_term: string
          recommended_year: number
          sequence_order: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_likes: { Args: { post_id: string }; Returns: undefined }
      instantiate_program_from_template: {
        Args: {
          p_distinction_codes?: string[]
          p_faculty: string
          p_template_code: string
          p_title: string
        }
        Returns: string
      }
      is_claim_publicly_visible: {
        Args: { _claim_id: string }
        Returns: boolean
      }
      is_course_valid_for_program: {
        Args: { p_course_id: string; p_program_id: string }
        Returns: boolean
      }
      is_registration_open: {
        Args: { p_term_id: string; p_user_id: string }
        Returns: boolean
      }
      is_thesis_committee_member: {
        Args: { _thesis_id: string; _user_id: string }
        Returns: boolean
      }
      issue_certificate: {
        Args: {
          p_cert_type: string
          p_entity_id?: string
          p_metadata?: Json
          p_program_name: string
          p_user_id: string
        }
        Returns: Json
      }
      launch_ops_metrics: { Args: never; Returns: Json }
      log_quality_action: {
        Args: {
          p_action_type: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_new_value?: Json
          p_old_value?: Json
          p_reason?: string
        }
        Returns: string
      }
      log_suyas_action: {
        Args: {
          p_action_type: string
          p_entity_id: string
          p_entity_type: string
          p_new_value?: Json
          p_old_value?: Json
          p_reason?: string
        }
        Returns: string
      }
      module_depth_score: { Args: { p_course_id: string }; Returns: Json }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_faculty_name: { Args: { p_name: string }; Returns: string }
      program_verification_surface: {
        Args: { _program_id: string }
        Returns: Json
      }
      publish_academic_year: { Args: { p_year_id: string }; Returns: boolean }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_academic_standing: {
        Args: { _term_id: string; _user_id: string }
        Returns: Json
      }
      recompute_cohort_outcomes: {
        Args: {
          _cohort_year: number
          _program_id: string
          _publish?: boolean
          _window_end: string
          _window_start: string
        }
        Returns: string
      }
      recompute_program_accreditation_status: {
        Args: never
        Returns: {
          course_count: number
          credits: number
          level: string
          missing: string[]
          new_status: string
          old_status: string
          program_id: string
          title: string
        }[]
      }
      record_faculty_review: {
        Args: { p_comments?: string; p_course_id: string; p_state: string }
        Returns: Json
      }
      registrar_assign_program: {
        Args: { p_program_id: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      resolve_integrity_alert: {
        Args: { p_alert_id: string; p_resolution_reason: string }
        Returns: {
          check_key: string
          created_at: string
          details_json: Json
          detection_count: number
          entity_id: string | null
          entity_type: string
          first_detected_at: string
          id: string
          last_detected_at: string
          resolution_reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["integrity_alert_severity"]
          status: Database["public"]["Enums"]["integrity_alert_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "academic_integrity_alerts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      snapshot_claim_verification: {
        Args: { _claim_id: string }
        Returns: string
      }
      spend_scrollcoin: {
        Args: { p_amount: number; p_desc: string; p_user_id: string }
        Returns: undefined
      }
      start_assessment_attempt: {
        Args: { p_assignment_id: string }
        Returns: Json
      }
      student_confirm_program_intent: {
        Args: { p_program_id: string; p_reason: string }
        Returns: string
      }
      submit_assessment_attempt: {
        Args: { p_attempt_id: string; p_responses: Json; p_score?: number }
        Returns: Json
      }
      submit_integrity_appeal: {
        Args: { _hold_id: string; _statement: string }
        Returns: Json
      }
      submit_transfer_request: {
        Args: {
          p_academic_justification?: string
          p_effective_term?: string
          p_reason: string
          p_supporting_docs?: Json
          p_to_program_id: string
        }
        Returns: string
      }
      track_common_question: {
        Args: { p_category: string; p_question: string }
        Returns: undefined
      }
      transcript_with_attainment: { Args: { p_user_id: string }; Returns: Json }
      transition_student_status: {
        Args: { p_new_status: string; p_reason?: string; p_user_id: string }
        Returns: boolean
      }
      update_completion_seal: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: Json
      }
      update_diploma_completion_seal: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: Json
      }
      user_has_institution_access: {
        Args: { p_institution_id: string; p_user_id: string }
        Returns: boolean
      }
      validate_teaching_assignment: {
        Args: { _domain_code: string; _faculty_user_id: string }
        Returns: Json
      }
      verify_official_transcript: {
        Args: { code: string }
        Returns: {
          gpa: number
          issued_at: string
          kind: Database["public"]["Enums"]["transcript_kind"]
          revoke_reason: string
          revoked: boolean
          total_credit_hours: number
          verification_code: string
        }[]
      }
      waitlist_position: { Args: { p_student_id: string }; Returns: number }
      withdraw_transfer_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
    }
    Enums: {
      academic_term_status:
        | "planned"
        | "open"
        | "in_session"
        | "closed"
        | "archived"
      academic_term_type:
        | "fall"
        | "spring"
        | "summer"
        | "winter"
        | "trimester"
        | "custom"
      app_role: "student" | "faculty" | "admin" | "superadmin" | "registrar"
      assessment_type:
        | "academic"
        | "prophetic"
        | "divine"
        | "practical"
        | "collaborative"
        | "scroll_defense"
      claim_subject_kind:
        | "program"
        | "course"
        | "faculty"
        | "institution"
        | "partnership"
        | "infrastructure"
        | "ai_capability"
      claim_type:
        | "accreditation"
        | "faculty"
        | "curriculum"
        | "practicum"
        | "employment"
        | "research"
        | "ai_tutor"
        | "infrastructure"
        | "partnership"
        | "transcript_equivalency"
      claim_verification_state:
        | "not_yet_verified"
        | "under_review"
        | "pilot"
        | "experimental"
        | "internal_only"
        | "verified"
        | "expired"
        | "retracted"
      credential_class:
        | "academic_degree"
        | "professional_certificate"
        | "diploma"
        | "research_fellowship"
        | "honorific_distinction"
        | "spiritual_overlay"
      curriculum_status:
        | "pending_authorship"
        | "authored"
        | "faculty_review"
        | "accreditation_review"
        | "approved"
      degree_program_status:
        | "active_public"
        | "pilot_private"
        | "internal_development"
      employment_verification_state:
        | "self_reported"
        | "employer_verified"
        | "partially_verified"
        | "expired"
        | "rejected"
      evidence_verification_state:
        | "pending"
        | "verified"
        | "expired"
        | "rejected"
      faculty_assignment_state:
        | "proposed"
        | "approved"
        | "active"
        | "completed"
        | "cancelled"
        | "blocked"
      faculty_category:
        | "founding_faculty"
        | "visiting_scholar"
        | "research_fellow"
        | "advisory_faculty"
        | "seminar_faculty"
      faculty_verification_status: "pending" | "verified" | "retired"
      grade_status:
        | "in_progress"
        | "provisional"
        | "final"
        | "withdrawn"
        | "incomplete"
      institutional_layer:
        | "accreditation_track"
        | "research_innovation"
        | "scroll_distinction"
      integrity_alert_severity: "info" | "warning" | "critical"
      integrity_alert_status: "open" | "acknowledged" | "resolved" | "dismissed"
      mentorship_session_type:
        | "initial_consultation"
        | "progress_review"
        | "spiritual_guidance"
        | "academic_coaching"
        | "career_counseling"
        | "prophetic_activation"
        | "scroll_alignment"
      outcome_status:
        | "pending"
        | "reviewed"
        | "verified"
        | "rejected"
        | "retracted"
        | "expired"
      peer_review_state:
        | "not_reviewed"
        | "under_review"
        | "peer_reviewed"
        | "retracted"
      practicum_incident_severity: "minor" | "moderate" | "serious" | "critical"
      practicum_incident_status:
        | "open"
        | "under_review"
        | "resolved"
        | "escalated"
      practicum_log_status: "submitted" | "attested" | "rejected" | "disputed"
      practicum_placement_status:
        | "proposed"
        | "approved"
        | "active"
        | "on_hold"
        | "completed"
        | "withdrawn"
        | "failed"
      practicum_site_status:
        | "pending_review"
        | "approved"
        | "suspended"
        | "revoked"
        | "expired"
      research_output_type:
        | "paper"
        | "conference"
        | "repository"
        | "patent"
        | "public_demo"
        | "dataset"
        | "thesis"
      scroll_degree_level:
        | "scroll_certificate"
        | "scroll_diploma"
        | "bachelor"
        | "master"
        | "doctorate"
        | "dpt"
        | "dshr"
        | "dehsm"
        | "sman"
        | "dsgei"
        | "sef"
      skill_proficiency_level:
        | "novice"
        | "beginner"
        | "intermediate"
        | "advanced"
        | "expert"
        | "master"
        | "prophet"
      thesis_committee_role:
        | "chair"
        | "supervisor"
        | "co_supervisor"
        | "internal_examiner"
        | "external_examiner"
        | "observer"
      thesis_defense_mode:
        | "oral_public"
        | "oral_closed"
        | "virtual_public"
        | "virtual_closed"
      thesis_defense_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "postponed"
      thesis_flag_state:
        | "open"
        | "under_review"
        | "dismissed"
        | "substantiated"
        | "remediated"
      thesis_integrity_kind:
        | "plagiarism"
        | "ai_misuse"
        | "data_integrity"
        | "authorship"
        | "other"
      thesis_member_state: "invited" | "accepted" | "declined" | "removed"
      thesis_project_type: "capstone" | "thesis" | "dissertation"
      thesis_recommendation:
        | "accept"
        | "accept_with_minor_revisions"
        | "major_revisions"
        | "reject"
      thesis_status:
        | "proposal_draft"
        | "proposal_submitted"
        | "proposal_approved"
        | "in_progress"
        | "submitted_for_defense"
        | "defense_scheduled"
        | "defended"
        | "revisions_required"
        | "passed"
        | "failed"
        | "withdrawn"
        | "archived"
      thesis_submission_kind: "proposal" | "draft" | "revision" | "final"
      thesis_vote_value:
        | "pass"
        | "pass_with_revisions"
        | "major_revisions"
        | "fail"
        | "abstain"
      transcript_kind: "unofficial" | "official"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      academic_term_status: [
        "planned",
        "open",
        "in_session",
        "closed",
        "archived",
      ],
      academic_term_type: [
        "fall",
        "spring",
        "summer",
        "winter",
        "trimester",
        "custom",
      ],
      app_role: ["student", "faculty", "admin", "superadmin", "registrar"],
      assessment_type: [
        "academic",
        "prophetic",
        "divine",
        "practical",
        "collaborative",
        "scroll_defense",
      ],
      claim_subject_kind: [
        "program",
        "course",
        "faculty",
        "institution",
        "partnership",
        "infrastructure",
        "ai_capability",
      ],
      claim_type: [
        "accreditation",
        "faculty",
        "curriculum",
        "practicum",
        "employment",
        "research",
        "ai_tutor",
        "infrastructure",
        "partnership",
        "transcript_equivalency",
      ],
      claim_verification_state: [
        "not_yet_verified",
        "under_review",
        "pilot",
        "experimental",
        "internal_only",
        "verified",
        "expired",
        "retracted",
      ],
      credential_class: [
        "academic_degree",
        "professional_certificate",
        "diploma",
        "research_fellowship",
        "honorific_distinction",
        "spiritual_overlay",
      ],
      curriculum_status: [
        "pending_authorship",
        "authored",
        "faculty_review",
        "accreditation_review",
        "approved",
      ],
      degree_program_status: [
        "active_public",
        "pilot_private",
        "internal_development",
      ],
      employment_verification_state: [
        "self_reported",
        "employer_verified",
        "partially_verified",
        "expired",
        "rejected",
      ],
      evidence_verification_state: [
        "pending",
        "verified",
        "expired",
        "rejected",
      ],
      faculty_assignment_state: [
        "proposed",
        "approved",
        "active",
        "completed",
        "cancelled",
        "blocked",
      ],
      faculty_category: [
        "founding_faculty",
        "visiting_scholar",
        "research_fellow",
        "advisory_faculty",
        "seminar_faculty",
      ],
      faculty_verification_status: ["pending", "verified", "retired"],
      grade_status: [
        "in_progress",
        "provisional",
        "final",
        "withdrawn",
        "incomplete",
      ],
      institutional_layer: [
        "accreditation_track",
        "research_innovation",
        "scroll_distinction",
      ],
      integrity_alert_severity: ["info", "warning", "critical"],
      integrity_alert_status: ["open", "acknowledged", "resolved", "dismissed"],
      mentorship_session_type: [
        "initial_consultation",
        "progress_review",
        "spiritual_guidance",
        "academic_coaching",
        "career_counseling",
        "prophetic_activation",
        "scroll_alignment",
      ],
      outcome_status: [
        "pending",
        "reviewed",
        "verified",
        "rejected",
        "retracted",
        "expired",
      ],
      peer_review_state: [
        "not_reviewed",
        "under_review",
        "peer_reviewed",
        "retracted",
      ],
      practicum_incident_severity: ["minor", "moderate", "serious", "critical"],
      practicum_incident_status: [
        "open",
        "under_review",
        "resolved",
        "escalated",
      ],
      practicum_log_status: ["submitted", "attested", "rejected", "disputed"],
      practicum_placement_status: [
        "proposed",
        "approved",
        "active",
        "on_hold",
        "completed",
        "withdrawn",
        "failed",
      ],
      practicum_site_status: [
        "pending_review",
        "approved",
        "suspended",
        "revoked",
        "expired",
      ],
      research_output_type: [
        "paper",
        "conference",
        "repository",
        "patent",
        "public_demo",
        "dataset",
        "thesis",
      ],
      scroll_degree_level: [
        "scroll_certificate",
        "scroll_diploma",
        "bachelor",
        "master",
        "doctorate",
        "dpt",
        "dshr",
        "dehsm",
        "sman",
        "dsgei",
        "sef",
      ],
      skill_proficiency_level: [
        "novice",
        "beginner",
        "intermediate",
        "advanced",
        "expert",
        "master",
        "prophet",
      ],
      thesis_committee_role: [
        "chair",
        "supervisor",
        "co_supervisor",
        "internal_examiner",
        "external_examiner",
        "observer",
      ],
      thesis_defense_mode: [
        "oral_public",
        "oral_closed",
        "virtual_public",
        "virtual_closed",
      ],
      thesis_defense_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "postponed",
      ],
      thesis_flag_state: [
        "open",
        "under_review",
        "dismissed",
        "substantiated",
        "remediated",
      ],
      thesis_integrity_kind: [
        "plagiarism",
        "ai_misuse",
        "data_integrity",
        "authorship",
        "other",
      ],
      thesis_member_state: ["invited", "accepted", "declined", "removed"],
      thesis_project_type: ["capstone", "thesis", "dissertation"],
      thesis_recommendation: [
        "accept",
        "accept_with_minor_revisions",
        "major_revisions",
        "reject",
      ],
      thesis_status: [
        "proposal_draft",
        "proposal_submitted",
        "proposal_approved",
        "in_progress",
        "submitted_for_defense",
        "defense_scheduled",
        "defended",
        "revisions_required",
        "passed",
        "failed",
        "withdrawn",
        "archived",
      ],
      thesis_submission_kind: ["proposal", "draft", "revision", "final"],
      thesis_vote_value: [
        "pass",
        "pass_with_revisions",
        "major_revisions",
        "fail",
        "abstain",
      ],
      transcript_kind: ["unofficial", "official"],
    },
  },
} as const
