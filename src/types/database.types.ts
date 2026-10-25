/**
 * Planora AI — Database Type Definitions
 * 
 * NOTE: This file represents the TypeScript contract for the PostgreSQL schema
 * defined in `supabase/migrations/20261022193000_initial_schema.sql`.
 * 
 * To automatically regenerate and synchronize these types with your live
 * or local Supabase instance, run:
 * 
 *   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.types.ts
 * 
 * or with a local Supabase CLI daemon:
 * 
 *   npx supabase gen types typescript --local > src/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EventStatus =
  | "draft"
  | "planning"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type RiskStatus =
  | "identified"
  | "monitoring"
  | "mitigated"
  | "accepted"
  | "resolved";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          event_type: string;
          event_date: string | null;
          location: string | null;
          guest_count: number;
          budget: number;
          preferences: string | null;
          constraints: string | null;
          cultural_requirements: string | null;
          status: EventStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          event_type: string;
          event_date?: string | null;
          location?: string | null;
          guest_count?: number;
          budget?: number;
          preferences?: string | null;
          constraints?: string | null;
          cultural_requirements?: string | null;
          status?: EventStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          event_type?: string;
          event_date?: string | null;
          location?: string | null;
          guest_count?: number;
          budget?: number;
          preferences?: string | null;
          constraints?: string | null;
          cultural_requirements?: string | null;
          status?: EventStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      budget_items: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          plan_revision_id: string | null;
          category: string;
          item_name: string;
          estimated_amount: number;
          actual_amount: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          plan_revision_id?: string | null;
          category: string;
          item_name: string;
          estimated_amount?: number;
          actual_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          plan_revision_id?: string | null;
          category?: string;
          item_name?: string;
          estimated_amount?: number;
          actual_amount?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_budget_items_event_user";
            columns: ["event_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "budget_items_plan_revision_id_fkey";
            columns: ["plan_revision_id"];
            isOneToOne: false;
            referencedRelation: "plan_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          plan_revision_id: string | null;
          title: string;
          description: string | null;
          due_date: string | null;
          priority: TaskPriority;
          status: TaskStatus;
          is_vendor_checklist: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          plan_revision_id?: string | null;
          title: string;
          description?: string | null;
          due_date?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          is_vendor_checklist?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          plan_revision_id?: string | null;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          is_vendor_checklist?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_tasks_event_user";
            columns: ["event_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "tasks_plan_revision_id_fkey";
            columns: ["plan_revision_id"];
            isOneToOne: false;
            referencedRelation: "plan_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      risks: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          risk_type: string;
          title: string;
          description: string | null;
          severity: RiskSeverity;
          mitigation: string | null;
          status: RiskStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          risk_type: string;
          title: string;
          description?: string | null;
          severity?: RiskSeverity;
          mitigation?: string | null;
          status?: RiskStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          risk_type?: string;
          title?: string;
          description?: string | null;
          severity?: RiskSeverity;
          mitigation?: string | null;
          status?: RiskStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_risks_event_user";
            columns: ["event_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      plan_revisions: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          revision_number: number;
          structured_plan: Json;
          summary: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          revision_number: number;
          structured_plan?: Json;
          summary?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          revision_number?: number;
          structured_plan?: Json;
          summary?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_plan_revisions_event_user";
            columns: ["event_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_plan_blueprint: {
        Args: {
          p_event_id: string;
          p_user_id: string;
          p_structured_plan: Json;
          p_summary: string | null;
          p_tasks?: Json;
          p_budget_items?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      event_status: EventStatus;
      task_priority: TaskPriority;
      task_status: TaskStatus;
      risk_severity: RiskSeverity;
      risk_status: RiskStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
