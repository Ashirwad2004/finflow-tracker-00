import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("WARNING: Supabase URL and Keys are not fully defined in environment variables!");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// requireAuth extracts JWT token from Authorization header and verifies it via Supabase
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('requireAuth Error:', err);
    return res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
}

// rateLimiter implements an in-memory sliding-window request limiter
const rateLimits = new Map();
export function rateLimiter(limit, windowMs) {
  return (req, res, next) => {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const now = Date.now();

      if (!rateLimits.has(ip)) {
        rateLimits.set(ip, []);
      }

      const timestamps = rateLimits.get(ip).filter(t => now - t < windowMs);
      timestamps.push(now);
      rateLimits.set(ip, timestamps);

      if (timestamps.length > limit) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }

      next();
    } catch (err) {
      next(); // fallback to let execution continue if error occurs
    }
  };
}

// roleCheck verifies that the authenticated user owns the store/order
export async function roleCheck(req, res, next) {
  try {
    const userId = req.user.id;
    const paymentId = req.body.paymentId || req.query.paymentId;
    const storeId = req.body.storeId || req.query.storeId;

    if (paymentId) {
      // Fetch payment to check if store owner matches
      const { data: payment, error } = await supabaseAdmin
        .from('payments')
        .select('user_id')
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden: You do not own this transaction' });
      }
    } else if (storeId) {
      // Check if storeId matches the authenticated userId
      if (storeId !== userId) {
        return res.status(403).json({ error: 'Forbidden: You do not own this store' });
      }
    }

    next();
  } catch (err) {
    console.error('roleCheck Error:', err);
    return res.status(500).json({ error: 'Internal Server Error checking permissions' });
  }
}

// validateRequest validates fields in request body
export function validateRequest(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, type] of Object.entries(schema)) {
      const val = req.body[field];
      if (val === undefined || val === null) {
        errors.push(`Missing required field: ${field}`);
      } else if (type === 'number' && isNaN(Number(val))) {
        errors.push(`Invalid type for field ${field}. Expected number.`);
      } else if (type === 'string' && typeof val !== 'string') {
        errors.push(`Invalid type for field ${field}. Expected string.`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }
    next();
  };
}
