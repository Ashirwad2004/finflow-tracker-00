import * as fs from 'fs';

const path = 'frontend/src/core/integrations/supabase/types.ts';
let content = fs.readFileSync(path, 'utf8');

// Add generate_overdue_notifications to Functions
content = content.replace('Functions: {\n      [_ in never]: never;\n    };', 'Functions: {\n      generate_overdue_notifications: {\n        Args: Record<PropertyKey, never>;\n        Returns: any;\n      };\n    };');

// Add store_salesmen and order_returns to Tables
// We can just append them before "Views: {"
const tablesStr = `
      store_salesmen: {
        Row: any;
        Insert: any;
        Update: any;
        Relationships: [];
      };
      order_returns: {
        Row: any;
        Insert: any;
        Update: any;
        Relationships: [];
      };
    };
    Views: {
`;

content = content.replace('    };\n    Views: {', tablesStr);

fs.writeFileSync(path, content, 'utf8');
console.log('Added missing types to types.ts');
