// CampaignTracker.js - Vet INC v1.1
// Manages campaign activation, tracking, and analytics

const CampaignTracker = (() => {
  const SB_URL = 'https://rnqhhzatlxmyvccdvqkr.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucWhoemF0bHhteXZjY2R2cWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMTQ5ODUsImV4cCI6MjA5MDU5MDk4NX0.zokle21pVEPG5bIOFiyZIWYkYIwhkolWNOhJ7Cbub30';
  const CLINIC_ID = 'rosslyn';

  // Fetch helper
  async function sbFetch(table, query) {
    const url = `${SB_URL}/rest/v1/${table}?${query}`;
    const res = await fetch(url, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase ${res.status}: ${text}`);
    }
    return res.json();
  }

  async function sbInsert(table, data) {
    const url = `${SB_URL}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase ${res.status}: ${text}`);
    }
    return res.json();
  }

  async function sbUpdate(table, match, data) {
    const url = `${SB_URL}/rest/v1/${table}?${match}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase ${res.status}: ${text}`);
    }
    return res.json();
  }

  // Get active campaign by type
  async function getActiveCampaign(campaignType) {
    const rows = await sbFetch('campaigns',
      `select=*&clinic_id=eq.${CLINIC_ID}&campaign_type=eq.${campaignType}&status=eq.active&order=activated_at.desc&limit=1`
    );
    return rows[0] || null;
  }

  // Get all campaigns for a type (including completed)
  async function getCampaignHistory(campaignType) {
    return sbFetch('campaigns',
      `select=*&clinic_id=eq.${CLINIC_ID}&campaign_type=eq.${campaignType}&order=activated_at.desc`
    );
  }

  // Get campaign items
  async function getCampaignItems(campaignId) {
    return sbFetch('campaign_items',
      `select=*&campaign_id=eq.${campaignId}&order=potential_uplift.desc`
    );
  }

  // Get campaign snapshots (for analytics chart)
  async function getCampaignSnapshots(campaignId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return sbFetch('campaign_snapshots',
      `select=*&campaign_id=eq.${campaignId}&snapshot_date=gte.${since}&order=snapshot_date.asc`
    );
  }

  // Activate a new campaign
  async function activateCampaign(campaignType, items) {
    // Create campaign record
    const campaign = {
      clinic_id: CLINIC_ID,
      campaign_type: campaignType,
      name: getCampaignName(campaignType),
      status: 'active',
      activated_at: new Date().toISOString(),
      total_items: items.length,
      implemented_items: 0,
      total_potential: items.reduce((sum, i) => sum + (i.uplift || 0), 0),
      total_captured: 0
    };

    const [created] = await sbInsert('campaigns', campaign);
    const campaignId = created.id;

    // Create campaign items
    const campaignItems = items.map(item => ({
      campaign_id: campaignId,
      treatment_code: item.id,
      treatment_name: item.name,
      old_price: item.price,
      suggested_price: item.suggested,
      current_price: item.price,
      status: 'pending',
      annual_volume: item.usage || 0,
      potential_uplift: item.uplift || 0,
      captured_uplift: 0
    }));

    // Insert in batches of 100
    for (let i = 0; i < campaignItems.length; i += 100) {
      await sbInsert('campaign_items', campaignItems.slice(i, i + 100));
    }

    // Log activation event
    await sbInsert('campaign_history', {
      campaign_id: campaignId,
      event_type: 'activated',
      event_data: { item_count: items.length, total_potential: campaign.total_potential }
    });

    // Create initial snapshot
    await sbInsert('campaign_snapshots', {
      campaign_id: campaignId,
      snapshot_date: new Date().toISOString().split('T')[0],
      implemented_count: 0,
      total_count: items.length,
      captured_revenue: 0,
      potential_revenue: campaign.total_potential
    });

    return created;
  }

  // Check progress (called by nightly ETL or manually)
  async function checkProgress(campaignId) {
    const campaign = (await sbFetch('campaigns', `select=*&id=eq.${campaignId}`))[0];
    if (!campaign || campaign.status !== 'active') return;

    // Get current prices from prices table
    const items = await sbFetch('campaign_items', `select=*&campaign_id=eq.${campaignId}`);
    const codes = items.map(i => i.treatment_code);

    // Fetch current prices
    const currentPrices = await sbFetch('prices',
      `select=treatment_code,price&treatment_code=in.(${codes.join(',')})`
    );
    const priceMap = {};
    currentPrices.forEach(p => priceMap[p.treatment_code] = p.price);

    let newImplemented = 0;
    let newCaptured = 0;

    // Check each item
    for (const item of items) {
      if (item.status === 'implemented') {
        newImplemented++;
        newCaptured += item.captured_uplift;
        continue;
      }

      const currentPrice = priceMap[item.treatment_code];
      if (currentPrice !== undefined) {
        // Update current price
        await sbUpdate('campaign_items', `id=eq.${item.id}`, { current_price: currentPrice });

        // Check if implemented (price matches suggested within $0.01)
        if (Math.abs(currentPrice - item.suggested_price) < 0.01) {
          const capturedUplift = item.potential_uplift;
          await sbUpdate('campaign_items', `id=eq.${item.id}`, {
            status: 'implemented',
            implemented_at: new Date().toISOString(),
            captured_uplift: capturedUplift
          });
          newImplemented++;
          newCaptured += capturedUplift;

          // Log event
          await sbInsert('campaign_history', {
            campaign_id: campaignId,
            event_type: 'item_implemented',
            event_data: { code: item.treatment_code, captured: capturedUplift }
          });
        }
      }
    }

    // Update campaign totals
    await sbUpdate('campaigns', `id=eq.${campaignId}`, {
      implemented_items: newImplemented,
      total_captured: newCaptured,
      updated_at: new Date().toISOString()
    });

    // Create daily snapshot
    await sbInsert('campaign_snapshots', {
      campaign_id: campaignId,
      snapshot_date: new Date().toISOString().split('T')[0],
      implemented_count: newImplemented,
      total_count: campaign.total_items,
      captured_revenue: newCaptured,
      potential_revenue: campaign.total_potential
    });

    return { implemented: newImplemented, captured: newCaptured };
  }

  // Skip an item (mark as won't implement)
  async function skipItem(itemId, reason = '') {
    return sbUpdate('campaign_items', `id=eq.${itemId}`, {
      status: 'skipped',
      notes: reason,
      updated_at: new Date().toISOString()
    });
  }

  // Mark item as implemented manually
  async function implementItem(itemId) {
    const item = (await sbFetch('campaign_items', `select=*&id=eq.${itemId}`))[0];
    if (!item) return;

    await sbUpdate('campaign_items', `id=eq.${itemId}`, {
      status: 'implemented',
      implemented_at: new Date().toISOString(),
      captured_uplift: item.potential_uplift,
      current_price: item.suggested_price
    });

    // Log and update campaign
    await sbInsert('campaign_history', {
      campaign_id: item.campaign_id,
      event_type: 'item_implemented',
      event_data: { code: item.treatment_code, captured: item.potential_uplift, manual: true }
    });

    // Recalculate campaign totals
    const items = await sbFetch('campaign_items', `select=*&campaign_id=eq.${item.campaign_id}`);
    const implemented = items.filter(i => i.status === 'implemented');
    const captured = implemented.reduce((s, i) => s + i.captured_uplift, 0);

    await sbUpdate('campaigns', `id=eq.${item.campaign_id}`, {
      implemented_items: implemented.length,
      total_captured: captured
    });

    return { implemented: implemented.length, captured };
  }

  // Pause/Resume campaign
  async function setCampaignStatus(campaignId, status) {
    return sbUpdate('campaigns', `id=eq.${campaignId}`, {
      status,
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
    });
  }

  // Helper: Get campaign display name
  function getCampaignName(type) {
    const names = {
      'inflation': 'Inflation Price Adjustment',
      '99-pricing': '.99 Pricing Recovery',
      'micro-margin': 'Inventory Micro Margin'
    };
    return names[type] || type;
  }

  // Format currency
  function fmt$(n) {
    if (n == null || isNaN(n)) return '$0';
    return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // --- Health Tracking Functions ---

  // Capture today's health metrics into campaign_snapshots
  async function captureHealthSnapshot(campaignId) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Fetch today's data
    const [revenue, visits, clients, exams] = await Promise.all([
      sbFetch('csi_pf_totals', `select=ros&date=eq.${today}`),
      sbFetch('visits', `select=ref_id&visit_date=eq.${today}`),
      sbFetch('visits', `select=ref_id&visit_date=eq.${today}`),
      sbFetch('services', `select=amount&or=(description.like.*HC%,description.like.*HEF%)&service_date=eq.${today}`)
    ]);

    const dailyRevenue = revenue.reduce((s, r) => s + (parseFloat(r.ros) || 0), 0);
    const dailyVisits = visits.length;
    const uniqueClients = new Set(clients.map(c => c.ref_id).filter(Boolean)).size;
    const examCount = exams.length;
    const examRevenue = exams.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const avgVisitValue = dailyVisits > 0 ? dailyRevenue / dailyVisits : 0;

    // Upsert snapshot
    const existing = await sbFetch('campaign_snapshots',
      `select=id&campaign_id=eq.${campaignId}&snapshot_date=eq.${today}`
    );

    const data = {
      campaign_id: campaignId,
      snapshot_date: today,
      daily_revenue: Math.round(dailyRevenue * 100) / 100,
      daily_visits: dailyVisits,
      exam_count: examCount,
      exam_revenue: Math.round(examRevenue * 100) / 100,
      avg_visit_value: Math.round(avgVisitValue * 100) / 100,
      unique_clients: uniqueClients
    };

    if (existing.length) {
      return sbUpdate('campaign_snapshots', `id=eq.${existing[0].id}`, data);
    } else {
      return sbInsert('campaign_snapshots', {
        ...data,
        implemented_count: 0,
        total_count: 0,
        captured_revenue: 0,
        potential_revenue: 0
      });
    }
  }

  // Check health metrics against baselines and create alerts
  async function checkHealthAlerts(campaignId) {
    const today = new Date().toISOString().split('T')[0];

    const [baselines, snapshots] = await Promise.all([
      sbFetch('campaign_baselines', `select=*&campaign_id=eq.${campaignId}`),
      sbFetch('campaign_snapshots', `select=*&campaign_id=eq.${campaignId}&snapshot_date=eq.${today}`)
    ]);

    if (!baselines.length || !snapshots.length) return [];

    const snap = snapshots[0];
    const newAlerts = [];

    for (const bl of baselines) {
      const actual = parseFloat(snap[bl.metric]);
      if (actual == null || isNaN(actual)) continue;

      const threshold = parseFloat(bl.alert_threshold) || -10;
      const pctChange = ((actual - bl.baseline_value) / bl.baseline_value) * 100;

      if (pctChange < threshold) {
        const severity = pctChange < threshold * 2 ? 'critical' : 'warning';
        const alert = {
          campaign_id: campaignId,
          alert_date: today,
          metric: bl.metric,
          baseline_value: bl.baseline_value,
          actual_value: actual,
          pct_change: Math.round(pctChange * 100) / 100,
          severity
        };
        await sbInsert('campaign_alerts', alert);
        newAlerts.push(alert);
      }
    }

    return newAlerts;
  }

  // Get unacknowledged alerts
  async function getHealthAlerts(campaignId) {
    return sbFetch('campaign_alerts',
      `select=*&campaign_id=eq.${campaignId}&acknowledged=eq.false&order=alert_date.desc`
    );
  }

  // Acknowledge an alert
  async function acknowledgeAlert(alertId) {
    return sbUpdate('campaign_alerts', `id=eq.${alertId}`, { acknowledged: true });
  }

  // Get health chart data (snapshots + baselines for charting)
  async function getHealthChart(campaignId, days = 30) {
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const [snapshots, baselines] = await Promise.all([
      sbFetch('campaign_snapshots', `select=*&campaign_id=eq.${campaignId}&snapshot_date=gte.${since}&order=snapshot_date.asc`),
      sbFetch('campaign_baselines', `select=*&campaign_id=eq.${campaignId}`)
    ]);
    return { snapshots, baselines };
  }

  // Run full daily health check (snapshot + alert check)
  async function runDailyHealthCheck(campaignId) {
    await captureHealthSnapshot(campaignId);
    const alerts = await checkHealthAlerts(campaignId);
    return alerts;
  }

  return {
    getActiveCampaign,
    getCampaignHistory,
    getCampaignItems,
    getCampaignSnapshots,
    activateCampaign,
    checkProgress,
    skipItem,
    implementItem,
    setCampaignStatus,
    getCampaignName,
    fmt$,
    captureHealthSnapshot,
    checkHealthAlerts,
    getHealthAlerts,
    acknowledgeAlert,
    getHealthChart,
    runDailyHealthCheck
  };
})();

// Export for use
if (typeof module !== 'undefined') module.exports = CampaignTracker;
