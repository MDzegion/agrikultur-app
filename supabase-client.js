/**
 * Nandoor — Supabase Client
 * Handles all backend communication: Auth, Database queries
 */
(function() {

// Supabase configuration
const SUPABASE_URL = 'https://jbogcumoovgknshqwyij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impib2djdW1vb3Zna25zaHF3eWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTI4MjMsImV4cCI6MjA5MTgyODgyM30.7B1n5IqqXoV3IDm_73Tzvmhe-XZbWRSE4I4p5IR4cpE';

// Initialize Supabase client with defensive checks
let supabaseClient;

if (window.supabase && window.supabase.createClient) {
  // Standard CDN pattern (supabase-js v2 UMD)
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else if (window.createClient) {
  // Alternative export pattern
  supabaseClient = window.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('❌ Supabase SDK not loaded! Check your CDN script tag.');
}

// Alias for internal use
const supabase = supabaseClient;

// ================================================
// AUTH FUNCTIONS
// ================================================

/**
 * Register new agent account
 * @param {string} email - User email
 * @param {string} password - User password (min 6 chars)
 * @param {string} fullName - Agent's full name
 * @returns {object} { data, error }
 */
async function signUp(email, password, fullName) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Sign up error:', error.message);
    return { data: null, error };
  }
}

/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {object} { data, error }
 */
async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Sign in error:', error.message);
    return { data: null, error };
  }
}

/**
 * Logout current user
 */
async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error.message);
    return { error };
  }
}

/**
 * Get current session (check if user is logged in)
 * @returns {object|null} session object or null
 */
async function getSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Get session error:', error.message);
    return null;
  }
}

// ================================================
// DATABASE QUERY FUNCTIONS
// ================================================

/**
 * Fetch all commodities from database
 * @returns {Array} List of commodities
 */
async function fetchCommodities() {
  try {
    const { data, error } = await supabase
      .from('commodities')
      .select('*')
      .order('price_per_kg', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Fetch commodities error:', error.message);
    return [];
  }
}

/**
 * Fetch single commodity with its suppliers
 * @param {string} commodityId
 * @returns {object} commodity with suppliers
 */
async function fetchCommodityDetail(commodityId) {
  try {
    const [commodityRes, suppliersRes] = await Promise.all([
      supabase.from('commodities').select('*').eq('id', commodityId).single(),
      supabase.from('suppliers').select('*').eq('commodity_id', commodityId)
    ]);

    if (commodityRes.error) throw commodityRes.error;

    return {
      commodity: commodityRes.data,
      suppliers: suppliersRes.data || []
    };
  } catch (error) {
    console.error('Fetch commodity detail error:', error.message);
    return { commodity: null, suppliers: [] };
  }
}

/**
 * Fetch transactions for logged-in agent
 * @returns {Array} List of transactions
 */
async function fetchTransactions() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Fetch transactions error:', error.message);
    return [];
  }
}

/**
 * Fetch agent profile for logged-in user
 * @returns {object|null} Agent profile
 */
async function fetchAgentProfile() {
  try {
    const session = await getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Fetch agent profile error:', error.message);
    return null;
  }
}

/**
 * Update agent profile fields
 * @param {object} updates - Fields to update
 * @returns {object} { data, error }
 */
async function updateAgentProfile(updates) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Update agent profile error:', error.message);
    return { data: null, error };
  }
}

// ================================================
// UTILITY FUNCTIONS
// ================================================

/**
 * Format number to Indonesian Rupiah
 * @param {number} amount
 * @returns {string} Formatted currency string
 */
function formatRupiah(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

/**
 * Format relative date label
 * @param {string} dateString - ISO date string
 * @returns {string} "Hari Ini", "Kemarin", or formatted date
 */
function formatDateLabel(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hari Ini';
  if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';

  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ================================================
// EXPOSE FUNCTIONS GLOBALLY (for app.js to use)
// ================================================
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.getSession = getSession;
window.fetchCommodities = fetchCommodities;
window.fetchCommodityDetail = fetchCommodityDetail;
window.fetchTransactions = fetchTransactions;
window.fetchAgentProfile = fetchAgentProfile;
window.updateAgentProfile = updateAgentProfile;
window.formatRupiah = formatRupiah;
window.formatDateLabel = formatDateLabel;

console.log('🔗 Supabase client initialized');
})();
