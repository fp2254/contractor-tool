export type Database = {
  public: {
    Tables: {
      orgs: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string;
          default_payment_terms_days: number;
          created_at: string;
        };
      };
      org_members: {
        Row: { id: string; org_id: string; user_id: string; role: "owner" | "member"; created_at: string };
      };
      message_templates: {
        Row: {
          id: string;
          org_id: string;
          created_at: string;
          updated_at: string;
          created_by: string;
          name: string;
          channel: "sms" | "email";
          subject: string | null;
          body: string;
          is_default: boolean;
        };
      };
      followups: {
        Row: {
          id: string;
          org_id: string;
          created_at: string;
          updated_at: string;
          created_by: string;
          quote_id: string;
          customer_id: string;
          scheduled_for: string;
          status: "pending" | "sent" | "skipped";
          channel: "sms" | "email";
          template_id: string | null;
          sent_at: string | null;
          last_error: string | null;
        };
      };
      activity_log: {
        Row: {
          id: string;
          org_id: string;
          created_at: string;
          user_id: string | null;
          entity_type: "job" | "quote" | "invoice" | "payment" | "lead";
          entity_id: string | null;
          action: string;
          description: string | null;
        };
      };
      customers: {
        Row: {
          id: string;
          org_id: string;
          created_at: string;
          updated_at: string;
          first_name: string | null;
          last_name: string | null;
          company_name: string | null;
          phone: string | null;
          email: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          notes: string | null;
          created_by_user: string | null;
        };
      };
      leads: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          lead_source: string | null;
          job_type: string | null;
          notes: string | null;
          status: "new" | "contacted" | "quoted" | "scheduled" | "won" | "lost";
          converted_customer_id: string | null;
          created_by_user: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      quotes: {
        Row: {
          id: string;
          org_id: string;
          customer_id: string;
          status: "draft" | "sent" | "accepted" | "declined";
          total_amount: number;
          notes: string | null;
          sent_at: string | null;
          accepted_at: string | null;
          declined_at: string | null;
          invoice_id: string | null;
          created_by_user: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      quote_items: {
        Row: {
          id: string;
          org_id: string;
          quote_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
      };
      invoices: {
        Row: {
          id: string;
          org_id: string;
          customer_id: string;
          job_id: string | null;
          invoice_number: string | null;
          status: "unpaid" | "paid" | "overdue";
          total_amount: number;
          due_date: string | null;
          created_by_user: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      invoice_items: {
        Row: {
          id: string;
          org_id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
      };
      jobs: {
        Row: {
          id: string;
          org_id: string;
          customer_id: string;
          quote_id: string | null;
          job_title: string;
          status: "scheduled" | "in_progress" | "completed" | "cancelled";
          started_at: string | null;
          completed_at: string | null;
          labor_minutes: number | null;
          labor_rate: number | null;
          profit_estimate: number | null;
          scheduled_date: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          notes: string | null;
          created_by_user: string | null;
          created_at: string;
          updated_at: string;
          invoice_id: string | null;
        };
      };
      job_materials: {
        Row: {
          id: string;
          org_id: string;
          job_id: string;
          material_name: string;
          cost: number | null;
          quantity: number | null;
          created_at: string;
        };
      };
      payments: {
        Row: {
          id: string;
          org_id: string;
          invoice_id: string;
          customer_id: string;
          amount: number;
          payment_method: "cash" | "check" | "card" | "venmo" | "paypal" | "other";
          payment_date: string;
          notes: string | null;
          created_by_user: string | null;
          created_at: string;
        };
      };
      notes: {
        Row: {
          id: string;
          org_id: string;
          entity_type: "lead" | "customer" | "job" | "invoice" | "quote";
          entity_id: string;
          body: string;
          created_by: string | null;
          created_at: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
