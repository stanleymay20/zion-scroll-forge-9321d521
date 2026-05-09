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
      academic_terms: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
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
          line1?: string
          line2?: string | null
          postal_code?: string
          state?: string | null
          updated_at?: string
          user_id?: string
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
          content: Json | null
          content_char_count: number | null
          content_md: string | null
          course_id: string | null
          created_at: string | null
          duration_minutes: number | null
          has_audio_script: boolean | null
          has_study_guide: boolean | null
          has_video_script: boolean | null
          id: string
          institution_id: string
          material_url: string | null
          order_index: number | null
          quality_verified: boolean | null
          quiz_data: Json | null
          rewards_amount: number | null
          title: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          content?: Json | null
          content_char_count?: number | null
          content_md?: string | null
          course_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          has_audio_script?: boolean | null
          has_study_guide?: boolean | null
          has_video_script?: boolean | null
          id?: string
          institution_id: string
          material_url?: string | null
          order_index?: number | null
          quality_verified?: boolean | null
          quiz_data?: Json | null
          rewards_amount?: number | null
          title: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          content?: Json | null
          content_char_count?: number | null
          content_md?: string | null
          course_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          has_audio_script?: boolean | null
          has_study_guide?: boolean | null
          has_video_script?: boolean | null
          id?: string
          institution_id?: string
          material_url?: string | null
          order_index?: number | null
          quality_verified?: boolean | null
          quiz_data?: Json | null
          rewards_amount?: number | null
          title?: string
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
          department_id: string | null
          description: string | null
          duration: string | null
          estimated_duration_hours: number | null
          faculty: string | null
          faculty_id: string | null
          id: string
          institution_id: string
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
          department_id?: string | null
          description?: string | null
          duration?: string | null
          estimated_duration_hours?: number | null
          faculty?: string | null
          faculty_id?: string | null
          id?: string
          institution_id: string
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
          department_id?: string | null
          description?: string | null
          duration?: string | null
          estimated_duration_hours?: number | null
          faculty?: string | null
          faculty_id?: string | null
          id?: string
          institution_id?: string
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
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
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
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
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
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      degree_programs: {
        Row: {
          career_paths: string[] | null
          created_at: string | null
          credit_hour_equivalence: Json | null
          description: string | null
          duration: string | null
          faculty: string | null
          governance_version: string | null
          id: string
          institution_id: string | null
          instructor_of_record_placeholder: string | null
          is_active: boolean | null
          level: string | null
          lock_reason: string | null
          locked_at: string | null
          locked_baseline: boolean | null
          locked_by: string | null
          min_gpa: number | null
          program_status: string | null
          scroll_level: string | null
          spiritual_requirements: Json | null
          title: string
          total_credits: number | null
        }
        Insert: {
          career_paths?: string[] | null
          created_at?: string | null
          credit_hour_equivalence?: Json | null
          description?: string | null
          duration?: string | null
          faculty?: string | null
          governance_version?: string | null
          id?: string
          institution_id?: string | null
          instructor_of_record_placeholder?: string | null
          is_active?: boolean | null
          level?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          locked_baseline?: boolean | null
          locked_by?: string | null
          min_gpa?: number | null
          program_status?: string | null
          scroll_level?: string | null
          spiritual_requirements?: Json | null
          title: string
          total_credits?: number | null
        }
        Update: {
          career_paths?: string[] | null
          created_at?: string | null
          credit_hour_equivalence?: Json | null
          description?: string | null
          duration?: string | null
          faculty?: string | null
          governance_version?: string | null
          id?: string
          institution_id?: string | null
          instructor_of_record_placeholder?: string | null
          is_active?: boolean | null
          level?: string | null
          lock_reason?: string | null
          locked_at?: string | null
          locked_baseline?: boolean | null
          locked_by?: string | null
          min_gpa?: number | null
          program_status?: string | null
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
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          devotional_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          devotional_id?: string
          id?: string
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
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          institution_id: string
          progress?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string
          progress?: number | null
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
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
          },
        ]
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
          user_id: string | null
        }
        Insert: {
          acknowledged_lordship?: boolean | null
          created_at?: string | null
          id?: string
          note?: string | null
          user_id?: string | null
        }
        Update: {
          acknowledged_lordship?: boolean | null
          created_at?: string | null
          id?: string
          note?: string | null
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
          created_at: string | null
          credits_attempted: number | null
          credits_earned: number | null
          cumulative_gpa: number | null
          dean_list: boolean | null
          gpa: number | null
          honors: string | null
          id: string
          last_calculated_at: string | null
          semester_id: string | null
          standing: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_attempted?: number | null
          credits_earned?: number | null
          cumulative_gpa?: number | null
          dean_list?: boolean | null
          gpa?: number | null
          honors?: string | null
          id?: string
          last_calculated_at?: string | null
          semester_id?: string | null
          standing?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_attempted?: number | null
          credits_earned?: number | null
          cumulative_gpa?: number | null
          dean_list?: boolean | null
          gpa?: number | null
          honors?: string | null
          id?: string
          last_calculated_at?: string | null
          semester_id?: string | null
          standing?: string | null
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
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
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
          blocks_graduation: boolean
          blocks_registration: boolean
          blocks_transcript: boolean
          created_at: string
          hold_type: string
          id: string
          is_active: boolean
          notes: string | null
          placed_at: string
          placed_by: string | null
          reason: string
          removed_at: string | null
          removed_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocks_graduation?: boolean
          blocks_registration?: boolean
          blocks_transcript?: boolean
          created_at?: string
          hold_type: string
          id?: string
          is_active?: boolean
          notes?: string | null
          placed_at?: string
          placed_by?: string | null
          reason: string
          removed_at?: string | null
          removed_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocks_graduation?: boolean
          blocks_registration?: boolean
          blocks_transcript?: boolean
          created_at?: string
          hold_type?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          placed_at?: string
          placed_by?: string | null
          reason?: string
          removed_at?: string | null
          removed_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
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
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
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
      testimonies: {
        Row: {
          approved_at: string | null
          approved_by: string | null
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
      ai_tutor_analytics: {
        Row: {
          avg_duration: number | null
          avg_satisfaction: number | null
          date: string | null
          total_interactions: number | null
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
            referencedRelation: "degree_programs"
            referencedColumns: ["id"]
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
      admin_override_enrollment: {
        Args: { p_course_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      admin_reassign_program: {
        Args: { p_new_program_id: string; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      archive_academic_year: { Args: { p_year_id: string }; Returns: boolean }
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
      check_graduation_eligibility: {
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
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_default_institution_membership: { Args: never; Returns: string }
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
      is_registration_open: {
        Args: { p_term_id: string; p_user_id: string }
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
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
      spend_scrollcoin: {
        Args: { p_amount: number; p_desc: string; p_user_id: string }
        Returns: undefined
      }
      track_common_question: {
        Args: { p_category: string; p_question: string }
        Returns: undefined
      }
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
      waitlist_position: { Args: { p_student_id: string }; Returns: number }
    }
    Enums: {
      app_role: "student" | "faculty" | "admin" | "superadmin"
      assessment_type:
        | "academic"
        | "prophetic"
        | "divine"
        | "practical"
        | "collaborative"
        | "scroll_defense"
      degree_program_status:
        | "active_public"
        | "pilot_private"
        | "internal_development"
      mentorship_session_type:
        | "initial_consultation"
        | "progress_review"
        | "spiritual_guidance"
        | "academic_coaching"
        | "career_counseling"
        | "prophetic_activation"
        | "scroll_alignment"
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
      app_role: ["student", "faculty", "admin", "superadmin"],
      assessment_type: [
        "academic",
        "prophetic",
        "divine",
        "practical",
        "collaborative",
        "scroll_defense",
      ],
      degree_program_status: [
        "active_public",
        "pilot_private",
        "internal_development",
      ],
      mentorship_session_type: [
        "initial_consultation",
        "progress_review",
        "spiritual_guidance",
        "academic_coaching",
        "career_counseling",
        "prophetic_activation",
        "scroll_alignment",
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
    },
  },
} as const
