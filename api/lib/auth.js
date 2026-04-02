import supabaseAdmin from './supabase.js';

/**
 * Verify the Supabase JWT from the Authorization header,
 * extract the user, and attach it to the request object.
 *
 * Returns the user object on success or sends a 401 and returns null.
 */
export async function authenticate(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  // Fetch the user's profile to get their role and client_id
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    res.status(401).json({ error: 'User profile not found' });
    return null;
  }

  req.user = { ...user, ...profile };
  return req.user;
}

/**
 * Check whether the authenticated user has the 'agency' role.
 * Returns true if agency, otherwise sends a 403 and returns false.
 */
export function requireAgency(user, res) {
  if (user.role !== 'agency') {
    res.status(403).json({ error: 'Forbidden: agency access required' });
    return false;
  }
  return true;
}
