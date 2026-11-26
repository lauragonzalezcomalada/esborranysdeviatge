export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string;
          group_id: number;
          id: number;
          name: string;
          position: number;
        };
        Insert: {
          created_at?: string;
          group_id: number;
          id?: never;
          name: string;
          position?: number;
        };
        Update: {
          created_at?: string;
          group_id?: number;
          id?: never;
          name?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          description: string;
          id: number;
          name: string;
          position: number;
          trip_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: never;
          name: string;
          position?: number;
          trip_id: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: never;
          name?: string;
          position?: number;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      options: {
        Row: {
          category_id: number;
          created_at: string;
          currency: string;
          id: number;
          link: string | null;
          name: string;
          position: number;
          quantity: number;
          member_id: number | null;
          selected: boolean;
          unit_price: number | null;
        };
        Insert: {
          category_id: number;
          created_at?: string;
          currency?: string;
          id?: never;
          link?: string | null;
          member_id?: number | null;
          name: string;
          position?: number;
          quantity?: number;
          selected?: boolean;
          unit_price?: number | null;
        };
        Update: {
          category_id?: number;
          created_at?: string;
          currency?: string;
          id?: never;
          link?: string | null;
          member_id?: number | null;
          name?: string;
          position?: number;
          quantity?: number;
          selected?: boolean;
          unit_price?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "options_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "options_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          created_at: string;
          id: number;
          name: string;
          trip_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          name: string;
          trip_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          name?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      lists: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          trip_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          trip_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lists_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      list_items: {
        Row: {
          created_at: string;
          id: string;
          list_id: string;
          name: string;
          selected: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          list_id: string;
          name: string;
          selected?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          list_id?: string;
          name?: string;
          selected?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      places: {
        Row: {
          created_at: string;
          days: number | null;
          description: string | null;
          id: number;
          latitude: number | null;
          longitude: number | null;
          name: string | null;
          order_weight: number | null;
          trip_id: string | null;
        };
        Insert: {
          created_at?: string;
          days?: number | null;
          description?: string | null;
          id?: number;
          latitude?: number | null;
          longitude?: number | null;
          name?: string | null;
          order_weight?: number | null;
          trip_id?: string | null;
        };
        Update: {
          created_at?: string;
          days?: number | null;
          description?: string | null;
          id?: number;
          latitude?: number | null;
          longitude?: number | null;
          name?: string | null;
          order_weight?: number | null;
          trip_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "places_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          parent_id: string | null;
          title: string;
          trip_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          parent_id?: string | null;
          title: string;
          trip_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          parent_id?: string | null;
          title?: string;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collections_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collections_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          collection_id: string | null;
          created_at: string;
          description: string | null;
          file_path: string | null;
          id: number;
          link: string | null;
          name: string;
          trip_id: string | null;
        };
        Insert: {
          collection_id?: string | null;
          created_at?: string;
          description?: string | null;
          file_path?: string | null;
          id?: number;
          link?: string | null;
          name: string;
          trip_id?: string | null;
        };
        Update: {
          collection_id?: string | null;
          created_at?: string;
          description?: string | null;
          file_path?: string | null;
          id?: number;
          link?: string | null;
          name?: string;
          trip_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "resources_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resources_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trips: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          owner_id: string | null;
          public: boolean;
          public_token: string | null;
          start_date: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          owner_id?: string | null;
          public?: boolean;
          public_token?: string | null;
          start_date?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          owner_id?: string | null;
          public?: boolean;
          public_token?: string | null;
          start_date?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
