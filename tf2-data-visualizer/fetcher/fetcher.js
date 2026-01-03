(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  const CONFIG = {
    tab: 'playermatchhistory',
    delay: 100,
    maxPages: 2000,
    maxRetries: 5,
    retryBaseDelay: 1000,
    parseDates: true,
    parseNumbers: true,
    dedupe: true
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSOLE STYLING
  // ═══════════════════════════════════════════════════════════════════════════
  // TF2 Color Palette
  const STYLES = {
    title: 'font-size:18px; font-weight:bold; color:#F09040; background:#3D3D3D; padding:8px 16px; border-radius:4px;',
    subtitle: 'color:#B8A090; font-style:italic;',
    success: 'color:#7A9F6B; font-weight:bold;',
    info: 'color:#8FAFC4;',
    warning: 'color:#C9A857; font-weight:bold;',
    error: 'color:#B86A6A; font-weight:bold;',
    progress: 'color:#A89080;',
    dim: 'color:#7E9A9A;',
    box: 'background:#3D3D3D; color:#F0E8E0; padding:10px 14px; border-radius:4px; border-left:3px solid #F09040;'
  };

  const log = {
    banner: () => {
      console.log('');
      console.log('%c TF2 Match History Fetcher ', STYLES.title);
      console.log('%c Extracting your casual match data...', STYLES.subtitle);
      console.log('');
    },
    info: (msg, ...args) => console.log(`%c● ${msg}`, STYLES.info, ...args),
    success: (msg, ...args) => console.log(`%c✔ ${msg}`, STYLES.success, ...args),
    warning: (msg, ...args) => console.log(`%c⚠ ${msg}`, STYLES.warning, ...args),
    error: (msg, ...args) => console.log(`%c✖ ${msg}`, STYLES.error, ...args),
    progress: (current, matches) => {
      console.log(`%c● Page ${current} | ${matches} matches`, STYLES.progress);
    },
    summary: (data) => {
      console.log('');
      console.log('%c╔════════════════════════════════════════╗', STYLES.box);
      console.log('%c║          FETCH COMPLETE                ║', STYLES.box);
      console.log('%c╠════════════════════════════════════════╣', STYLES.box);
      console.log(`%c║  User:     ${data.username.padEnd(26)} ║`, STYLES.box);
      console.log(`%c║  Pages:    ${String(data.pages).padEnd(26)} ║`, STYLES.box);
      console.log(`%c║  Matches:  ${String(data.matches).padEnd(26)} ║`, STYLES.box);
      console.log(`%c║  Columns:  ${String(data.columns).padEnd(26)} ║`, STYLES.box);
      console.log(`%c║  File:     ${data.filename.padEnd(26)} ║`, STYLES.box);
      console.log('%c╚════════════════════════════════════════╝', STYLES.box);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function downloadBlob(content, filename, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function getSessionID() {
    if (typeof window.g_sessionID !== 'undefined' && window.g_sessionID) {
      return window.g_sessionID;
    }
    const m = document.cookie.match(/(?:^|; )sessionid=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function sanitizeFilename(name) {
    return (name || 'unknown')
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // USERNAME EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════
  function extractUsername() {
    // Blacklist of false positive values
    const blacklist = ['you & friends', 'you &amp; friends', 'store', 'community', 'chat', 'support'];
    
    // Try multiple sources in order of reliability
    const selectors = [
      '#account_pulldown',                    // Account dropdown button (most reliable)
      '.profile_small_header_name a',         // Small profile header
      '.persona_name_text_content',           // Profile header
      '.actual_persona_name'                  // Actual persona name element
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const name = el.textContent?.trim();
        // Filter out nav items and blacklisted values
        if (name && name.length > 0 && name.length < 100 && !blacklist.includes(name.toLowerCase())) {
          return name;
        }
      }
    }

    // Fallback: try to get from g_steamID and page content
    if (typeof window.g_steamID !== 'undefined') {
      log.warning('Could not find username, using Steam ID');
      return window.g_steamID;
    }

    return 'unknown_user';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════
  function ensureOnGCPDPage() {
    const gcpdPattern = /steamcommunity\.com\/profiles\/\d+\/gcpd\/440/;
    const myGcpdPattern = /steamcommunity\.com\/my\/gcpd\/440/;
    const currentUrl = location.href;

    // Already on the correct page
    if (gcpdPattern.test(currentUrl) || myGcpdPattern.test(currentUrl)) {
      // Make sure we're on the match history tab
      if (!currentUrl.includes('tab=playermatchhistory')) {
        const newUrl = currentUrl.includes('?') 
          ? currentUrl + '&tab=playermatchhistory'
          : currentUrl + '?tab=playermatchhistory';
        if (currentUrl !== newUrl && !currentUrl.includes('playermatchhistory')) {
          log.info('Switching to Match History tab...');
          window.location.href = newUrl;
          return false;
        }
      }
      return true;
    }

    // On Steam Community but wrong page - navigate to GCPD
    if (location.hostname === 'steamcommunity.com') {
      log.info('Navigating to TF2 Match History page...');
      window.location.href = 'https://steamcommunity.com/my/gcpd/440/?tab=playermatchhistory';
      return false;
    }

    // Not on Steam at all
    throw new Error('Please run this script from steamcommunity.com');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA PARSING
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Canonical field mapping
  const CANONICAL_MAP = {
    reached_conclusion: 'reached_conclusion',
    type: 'type',
    map_index: 'map_index',
    match_creation_time: 'match_creation_time',
    match_ip: 'match_ip',
    match_port: 'match_port',
    datacenter: 'datacenter',
    match_size: 'match_size',
    join_time: 'join_time',
    party_id_at_join: 'party_id_at_join',
    team_at_join: 'team_at_join',
    ping_estimate_at_join: 'ping_estimate_at_join',
    joined_after_match_start: 'joined_after_match_start',
    time_in_queue: 'time_in_queue',
    match_end_time: 'match_end_time',
    season_id: 'season_id',
    match_status: 'match_status',
    match_duration: 'match_duration',
    red_team_final_score: 'red_team_final_score',
    blu_team_final_score: 'blu_team_final_score',
    winning_team: 'winning_team',
    game_mode: 'game_mode',
    win_reason: 'win_reason',
    match_flags: 'match_flags',
    match_included_bots: 'match_included_bots',
    time_left_match: 'time_left_match',
    result_partyid: 'result_partyid',
    result_team: 'result_team',
    result_score: 'result_score',
    result_ping: 'result_ping',
    result_player_flags: 'result_player_flags',
    result_displayed_rating: 'result_displayed_rating',
    result_displayed_rating_change: 'result_displayed_rating_change',
    result_rank: 'result_rank',
    classes_played: 'classes_played',
    kills: 'kills',
    deaths: 'deaths',
    damage: 'damage',
    healing: 'healing',
    support: 'support',
    score_medal: 'score_medal',
    kills_medal: 'kills_medal',
    damage_medal: 'damage_medal',
    healing_medal: 'healing_medal',
    support_medal: 'support_medal',
    leave_reason: 'leave_reason',
    connection_time: 'connection_time'
  };

  // Fixed column order for CSV output
  const ORDERED_COLUMNS = [
    'match_id', 'match_title', 'type', 'season_id', 'reached_conclusion',
    'match_creation_time', 'connection_time', 'join_time', 'joined_after_match_start',
    'time_in_queue', 'match_end_time', 'time_left_match',
    'game_mode', 'map_index', 'datacenter', 'match_ip', 'match_port',
    'match_size', 'match_status', 'match_duration', 'match_flags', 'match_included_bots',
    'red_team_final_score', 'blu_team_final_score', 'winning_team', 'win_reason',
    'party_id_at_join', 'team_at_join', 'ping_estimate_at_join',
    'result_partyid', 'result_team', 'result_score', 'result_ping',
    'result_player_flags', 'result_displayed_rating', 'result_displayed_rating_change', 'result_rank',
    'classes_played', 'kills', 'deaths', 'damage', 'healing', 'support',
    'score_medal', 'kills_medal', 'damage_medal', 'healing_medal', 'support_medal',
    'leave_reason'
  ];

  function normalizeKey(label) {
    return (label || '')
      .replace(/\u00A0/g, ' ')
      .trim()
      .replace(/[:–—\-\/\\]+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  function tryParseNumber(s) {
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
    return null;
  }

  function tryParseDate(s) {
    if (!s || !s.trim()) return null;
    const d = new Date(s);
    if (!isNaN(d.valueOf())) return d.toISOString();
    const m = s.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    if (m) return new Date(m[1] + 'T' + m[2] + 'Z').toISOString();
    return null;
  }

  function parseValue(raw) {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim();
    if (s === '') return null;
    
    const low = s.toLowerCase();
    if (low === 'yes') return true;
    if (low === 'no') return false;
    
    if (CONFIG.parseNumbers) {
      const n = tryParseNumber(s);
      if (n !== null) return n;
    }
    
    if (CONFIG.parseDates) {
      const iso = tryParseDate(s);
      if (iso) return iso;
    }
    
    return s;
  }

  function parseMatchHtml(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const table = doc.querySelector('table.generic_kv_table') || doc.querySelector('table');
    if (!table) return null;

    const out = {};
    const th = table.querySelector('th');
    if (th) {
      const header = (th.textContent || '').trim();
      const m = header.match(/Match\s*([0-9]+)/i);
      if (m) out.match_id = String(m[1]);
      else out.match_title = header;
    }

    const rows = table.querySelectorAll('tr');
    for (const r of rows) {
      const cells = r.querySelectorAll('td');
      if (cells.length !== 2) continue;
      const rawKey = (cells[0].textContent || '').trim();
      const rawVal = (cells[1].textContent || '').trim();
      const keyNorm = normalizeKey(rawKey);
      const keyCanon = CANONICAL_MAP[keyNorm] || keyNorm;
      out[keyCanon] = parseValue(rawVal);
    }

    return out;
  }

  function extractTablesFromHtml(bigHtml) {
    const doc = new DOMParser().parseFromString(bigHtml || '', 'text/html');
    let tables = Array.from(doc.querySelectorAll('table.generic_kv_table'));
    if (!tables.length) tables = Array.from(doc.querySelectorAll('table'));
    
    return tables.map((t) => {
      const th = t.querySelector('th');
      let id = null;
      if (th) {
        const m = (th.textContent || '').match(/Match\s*([0-9]+)/i);
        if (m) id = String(m[1]);
      }
      return { id, html: t.outerHTML };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CSV BUILDING
  // ═══════════════════════════════════════════════════════════════════════════
  function buildCsv(rows) {
    // Collect all unique keys, including extras not in ORDERED_COLUMNS
    const knownSet = new Set(ORDERED_COLUMNS);
    const extrasSet = new Set();
    
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!knownSet.has(key) && !key.startsWith('_')) {
          extrasSet.add(key);
        }
      }
    }
    
    const extras = Array.from(extrasSet).sort();
    const headers = [...ORDERED_COLUMNS, ...extras];

    // Escape function for CSV values
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    // Build CSV using array join (more efficient than string concat)
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => escape(row[h])).join(','));
    }

    if (extras.length) {
      log.info(`Extra fields found: ${extras.join(', ')}`);
    }

    return { csv: lines.join('\n'), headers };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK FETCHING
  // ═══════════════════════════════════════════════════════════════════════════
  async function safeFetch(urlStr) {
    let attempt = 0;
    
    while (attempt <= CONFIG.maxRetries) {
      try {
        const res = await fetch(urlStr, {
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        
        if (!res.ok) {
          if (res.status === 429 || res.status === 503) {
            const backoff = CONFIG.retryBaseDelay * Math.pow(2, attempt);
            log.warning(`Rate limited (${res.status}), waiting ${backoff}ms...`);
            await wait(backoff);
            attempt++;
            continue;
          }
          throw new Error('HTTP ' + res.status);
        }
        
        return JSON.parse(await res.text());
      } catch (err) {
        attempt++;
        if (attempt > CONFIG.maxRetries) throw err;
        const backoff = CONFIG.retryBaseDelay * Math.pow(2, attempt - 1);
        log.warning(`Fetch error, retry ${attempt}/${CONFIG.maxRetries} in ${backoff}ms`);
        await wait(backoff);
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN FETCH LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  async function fetchAllMatches() {
    const base = location.origin + location.pathname.replace(/\/$/, '');
    const sessionid = getSessionID();
    const username = extractUsername();
    
    log.banner();
    log.info(`User: ${username}`);
    log.info(`Session: ${sessionid ? 'Found' : 'Not found'}`);
    log.info('Starting data extraction...');
    console.log('');

    const results = [];
    const seen = new Set();
    let token = null;
    let page = 0;

    while (page < CONFIG.maxPages) {
      page++;
      
      const url = new URL(base);
      url.searchParams.set('ajax', '1');
      url.searchParams.set('tab', CONFIG.tab);
      if (token) url.searchParams.set('continue_token', token);
      if (sessionid) url.searchParams.set('sessionid', sessionid);

      const json = await safeFetch(url.toString());
      
      if (!json || !json.success) {
        log.warning('No more data available');
        break;
      }

      const tables = extractTablesFromHtml(json.html || '');
      let added = 0;
      
      for (const t of tables) {
        const parsed = parseMatchHtml(t.html);
        if (!parsed) continue;
        
        if (t.id && !parsed.match_id) parsed.match_id = String(t.id);
        
        const key = CONFIG.dedupe && parsed.match_id ? 'id:' + parsed.match_id : '';
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        
        results.push(parsed);
        added++;
      }

      // Show progress every 5 pages
      if (page % 5 === 0 || page === 1) {
        log.progress(page, results.length);
      }

      const newToken = json.continue_token || null;
      if (!newToken || newToken === token) {
        log.success('Reached end of match history');
        break;
      }
      
      token = newToken;
      await wait(CONFIG.delay);
    }

    // Build and download CSV
    const { csv, headers } = buildCsv(results);
    const filename = `casual_${sanitizeFilename(username)}.csv`;
    downloadBlob(csv, filename, 'text/csv');

    // Show summary
    log.summary({
      username,
      pages: page,
      matches: results.length,
      columns: headers.length,
      filename
    });

    return {
      status: 'done',
      username,
      pages: page,
      matches: results.length,
      columns: headers.length,
      filename
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTRY POINT
  // ═══════════════════════════════════════════════════════════════════════════
  (async function main() {
    try {
      // Check if we're on the right page, navigate if needed
      if (!ensureOnGCPDPage()) {
        // Navigation in progress, script will re-run on new page
        return;
      }

      // Run the fetcher
      const result = await fetchAllMatches();
      log.success('All done! Check your downloads folder.');
      return result;
    } catch (err) {
      log.error(`Fatal error: ${err.message}`);
      console.error(err);
      throw err;
    }
  })();
})();