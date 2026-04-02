import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import StatCard from '../../components/StatCard';
import {
  TrendingUp,
  Users,
  Eye,
  Target,
  DollarSign,
  BarChart3,
  RefreshCw,
  Link2,
  AlertCircle,
} from 'lucide-react';

const formatCurrency = (val) => {
  if (val == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

const formatNumber = (val) => {
  if (val == null) return '0';
  return new Intl.NumberFormat('en-US').format(val);
};

const formatTime = (date) =>
  new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/* ---- skeleton loader ---- */
function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          width: '60%',
          height: '12px',
          borderRadius: '4px',
          backgroundColor: 'var(--color-border)',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          width: '40%',
          height: '28px',
          borderRadius: '4px',
          backgroundColor: 'var(--color-border)',
          opacity: 0.4,
        }}
      />
    </div>
  );
}

/* ---- connection badge ---- */
function ConnectionBadge({ label, connected, onConnect }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${connected ? 'var(--color-success)' : 'var(--color-danger)'}`,
        borderRadius: '8px',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: connected ? 'var(--color-success)' : 'var(--color-danger)',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: 500 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: '12px',
          color: connected ? 'var(--color-success)' : 'var(--color-danger)',
        }}
      >
        {connected ? 'Connected' : 'Not connected'}
      </span>
      {!connected && onConnect && (
        <button
          onClick={onConnect}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 12px',
            backgroundColor: 'var(--color-accent)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Link2 size={12} />
          Connect
        </button>
      )}
    </div>
  );
}

/* ---- top post card ---- */
function TopPostCard({ post }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
      }}
    >
      {post.thumbnail_url && (
        <img
          src={post.thumbnail_url}
          alt=""
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '6px',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 6px',
            fontSize: '13px',
            color: 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {post.caption || 'Untitled post'}
        </p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Likes {formatNumber(post.likes)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Comments {formatNumber(post.comments)}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Reach {formatNumber(post.reach)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---- best ad card ---- */
function BestAdCard({ ad }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      <h4
        style={{
          margin: '0 0 12px',
          fontSize: '14px',
          color: 'var(--color-text)',
          fontWeight: 600,
        }}
      >
        {ad.name || 'Top Ad'}
      </h4>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
        }}
      >
        <div>
          <span
            style={{
              display: 'block',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}
          >
            Spend
          </span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
            {formatCurrency(ad.spend)}
          </span>
        </div>
        <div>
          <span
            style={{
              display: 'block',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}
          >
            Results
          </span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
            {formatNumber(ad.results)}
          </span>
        </div>
        <div>
          <span
            style={{
              display: 'block',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}
          >
            Cost / Result
          </span>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
            {formatCurrency(ad.cost_per_result)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ==== MAIN COMPONENT ==== */
export default function LiveStats() {
  const { client } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function fetchStats(isManualRefresh) {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api(`/stats/${client.id}`);
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (client?.id) fetchStats(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  function handleConnect() {
    window.open(`/api/meta/connect?client_id=${client.id}`, '_blank');
  }

  const ig = stats?.instagram || {};
  const meta = stats?.meta || {};

  const sectionHeading = {
    margin: '0 0 16px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-text)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const statGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  };

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text)' }}>Live Stats</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Last updated {formatTime(lastUpdated)}
            </span>
          )}
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text)',
              fontSize: '13px',
              cursor: refreshing ? 'default' : 'pointer',
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing ? 'livestats-spin 1s linear infinite' : 'none',
              }}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <style>{`@keyframes livestats-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>

      {/* Connection Status */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        <ConnectionBadge
          label="Meta Ads"
          connected={client?.meta_connected}
          onConnect={!client?.meta_connected ? handleConnect : undefined}
        />
        <ConnectionBadge
          label="Instagram"
          connected={client?.instagram_connected}
          onConnect={!client?.instagram_connected ? handleConnect : undefined}
        />
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid var(--color-danger)',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <AlertCircle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <span style={{ fontSize: '14px', color: 'var(--color-danger)' }}>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* ---- Instagram Section ---- */}
          {client?.instagram_connected && (
            <section style={{ marginBottom: '40px' }}>
              <h3 style={sectionHeading}>
                <Users size={18} style={{ color: 'var(--color-accent)' }} />
                Instagram
              </h3>

              {!ig.followers && !ig.reach ? (
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-text-secondary)',
                    padding: '24px 0',
                  }}
                >
                  No Instagram data yet. Stats will appear once the account is synced.
                </p>
              ) : (
                <>
                  <div style={statGrid}>
                    <StatCard
                      label="Followers"
                      value={formatNumber(ig.followers)}
                      trend={
                        ig.followers_growth > 0
                          ? 'up'
                          : ig.followers_growth < 0
                            ? 'down'
                            : undefined
                      }
                      trendValue={
                        ig.followers_growth != null
                          ? `${ig.followers_growth > 0 ? '+' : ''}${ig.followers_growth}%`
                          : undefined
                      }
                    />
                    <StatCard label="Reach" value={formatNumber(ig.reach)} />
                    <StatCard label="Profile Visits" value={formatNumber(ig.profile_visits)} />
                    <StatCard label="Post Impressions" value={formatNumber(ig.impressions)} />
                    <StatCard label="Media Count" value={formatNumber(ig.media_count)} />
                  </div>

                  {/* Top Performing Content */}
                  {ig.top_posts?.length > 0 && (
                    <div>
                      <h4
                        style={{
                          margin: '0 0 12px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--color-text)',
                        }}
                      >
                        <Eye
                          size={14}
                          style={{
                            marginRight: '6px',
                            verticalAlign: '-2px',
                            color: 'var(--color-accent)',
                          }}
                        />
                        Top Performing Content This Month
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {ig.top_posts.slice(0, 3).map((post, idx) => (
                          <TopPostCard key={post.id || idx} post={post} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* ---- Meta Ads Section ---- */}
          {client?.meta_connected && (
            <section style={{ marginBottom: '40px' }}>
              <h3 style={sectionHeading}>
                <BarChart3 size={18} style={{ color: 'var(--color-accent)' }} />
                Meta Ads
              </h3>

              {!meta.active_campaigns && !meta.total_spend ? (
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-text-secondary)',
                    padding: '24px 0',
                  }}
                >
                  No ad data yet. Stats will appear once campaigns are running.
                </p>
              ) : (
                <>
                  <div style={statGrid}>
                    <StatCard
                      label="Active Campaigns"
                      value={formatNumber(meta.active_campaigns)}
                    />
                    <StatCard
                      label="Total Ad Spend"
                      value={formatCurrency(meta.total_spend)}
                      trend={
                        meta.spend_trend > 0
                          ? 'up'
                          : meta.spend_trend < 0
                            ? 'down'
                            : undefined
                      }
                      trendValue={
                        meta.spend_trend != null
                          ? `${meta.spend_trend > 0 ? '+' : ''}${meta.spend_trend}%`
                          : undefined
                      }
                    />
                    <StatCard
                      label="Cost Per Lead"
                      value={formatCurrency(meta.cost_per_lead)}
                    />
                    <StatCard
                      label="Cost Per Profile Visit"
                      value={formatCurrency(meta.cost_per_profile_visit)}
                    />
                    <StatCard
                      label="Retargeting Audience"
                      value={formatNumber(meta.retargeting_audience_size)}
                    />
                  </div>

                  {/* Best Performing Ad */}
                  {meta.best_ad && (
                    <div>
                      <h4
                        style={{
                          margin: '0 0 12px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--color-text)',
                        }}
                      >
                        <Target
                          size={14}
                          style={{
                            marginRight: '6px',
                            verticalAlign: '-2px',
                            color: 'var(--color-accent)',
                          }}
                        />
                        Best Performing Ad
                      </h4>
                      <BestAdCard ad={meta.best_ad} />
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* Neither connected */}
          {!client?.meta_connected && !client?.instagram_connected && (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 20px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
            >
              <Link2
                size={32}
                style={{ color: 'var(--color-text-secondary)', marginBottom: '12px' }}
              />
              <p style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--color-text)' }}>
                No platforms connected
              </p>
              <p
                style={{
                  margin: '0 0 20px',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Connect Meta or Instagram to start seeing live performance data.
              </p>
              <button
                onClick={handleConnect}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  backgroundColor: 'var(--color-accent)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Link2 size={14} />
                Connect Accounts
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
