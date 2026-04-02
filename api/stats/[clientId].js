import supabaseAdmin from '../lib/supabase.js';
import { authenticate } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await authenticate(req, res);
  if (!user) return;

  const { clientId } = req.query;

  // Agency can view any client; clients can only view their own
  if (user.role !== 'agency' && user.client_id !== clientId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Fetch the client record to get Meta tokens
  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('meta_access_token, meta_token_expires_at, instagram_account_id, meta_ad_account_id')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const result = {
    instagram: null,
    ads: null,
    errors: [],
  };

  // Check if Meta token exists and is not expired
  if (!client.meta_access_token) {
    result.errors.push('Meta account not connected. Please connect via Meta OAuth.');
    return res.status(200).json(result);
  }

  const tokenExpiry = new Date(client.meta_token_expires_at);
  if (tokenExpiry < new Date()) {
    result.errors.push('Meta access token has expired. Please reconnect the Meta account.');
    return res.status(200).json(result);
  }

  const token = client.meta_access_token;

  // Fetch Instagram stats
  if (client.instagram_account_id) {
    try {
      const igFields = 'followers_count,media_count';
      const igUrl = `https://graph.facebook.com/v19.0/${client.instagram_account_id}?fields=${igFields}&access_token=${token}`;
      const igResponse = await fetch(igUrl);
      const igData = await igResponse.json();

      if (igData.error) {
        result.errors.push(`Instagram profile error: ${igData.error.message}`);
      } else {
        // Fetch insights (reach, impressions, profile_views) for the last 30 days
        const insightsUrl = `https://graph.facebook.com/v19.0/${client.instagram_account_id}/insights?metric=reach,impressions,profile_views&period=day&since=${getDateDaysAgo(30)}&until=${getTodayDate()}&access_token=${token}`;
        const insightsResponse = await fetch(insightsUrl);
        const insightsData = await insightsResponse.json();

        let reach = 0;
        let impressions = 0;
        let profileViews = 0;

        if (insightsData.data && !insightsData.error) {
          for (const metric of insightsData.data) {
            const total = metric.values.reduce((sum, v) => sum + (v.value || 0), 0);
            if (metric.name === 'reach') reach = total;
            if (metric.name === 'impressions') impressions = total;
            if (metric.name === 'profile_views') profileViews = total;
          }
        } else if (insightsData.error) {
          result.errors.push(`Instagram insights error: ${insightsData.error.message}`);
        }

        result.instagram = {
          follower_count: igData.followers_count,
          media_count: igData.media_count,
          reach,
          impressions,
          profile_views: profileViews,
        };
      }
    } catch (err) {
      result.errors.push(`Instagram fetch failed: ${err.message}`);
    }
  } else {
    result.errors.push('No Instagram account ID configured for this client.');
  }

  // Fetch Meta Ads stats
  if (client.meta_ad_account_id) {
    try {
      const adsUrl = `https://graph.facebook.com/v19.0/act_${client.meta_ad_account_id}/campaigns?fields=name,status,insights{spend,cost_per_result,actions}&date_preset=this_month&access_token=${token}`;
      const adsResponse = await fetch(adsUrl);
      const adsData = await adsResponse.json();

      if (adsData.error) {
        result.errors.push(`Meta Ads error: ${adsData.error.message}`);
      } else {
        const campaigns = (adsData.data || []).map((campaign) => {
          const insights = campaign.insights?.data?.[0] || {};
          return {
            name: campaign.name,
            status: campaign.status,
            spend: insights.spend || '0',
            cost_per_result: insights.cost_per_result || null,
            actions: insights.actions || [],
          };
        });

        const totalSpend = campaigns.reduce(
          (sum, c) => sum + parseFloat(c.spend || 0),
          0
        );

        result.ads = {
          campaigns,
          total_spend: totalSpend.toFixed(2),
        };
      }
    } catch (err) {
      result.errors.push(`Meta Ads fetch failed: ${err.message}`);
    }
  } else {
    result.errors.push('No Meta Ad account ID configured for this client.');
  }

  return res.status(200).json(result);
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}
