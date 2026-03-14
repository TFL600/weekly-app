/**
 * Sync Module - GitHub Gist sync for cross-device data persistence
 */
const Sync = (() => {
  const KEYS = {
    token: 'gist_token',
    gistId: 'gist_id',
    lastSync: 'last_sync_time',
    lastModified: 'last_modified_time'
  };

  function getToken() {
    return localStorage.getItem(KEYS.token) || '';
  }

  function getGistId() {
    return localStorage.getItem(KEYS.gistId) || '';
  }

  function getHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  function markModified() {
    localStorage.setItem(KEYS.lastModified, Date.now().toString());
  }

  function isUnsynced() {
    if (!getToken()) return false;
    const mod = parseInt(localStorage.getItem(KEYS.lastModified) || '0');
    const sync = parseInt(localStorage.getItem(KEYS.lastSync) || '0');
    return mod > sync;
  }

  function resetSyncTimestamp() {
    const now = Date.now().toString();
    localStorage.setItem(KEYS.lastSync, now);
    localStorage.setItem(KEYS.lastModified, now);
  }

  async function discoverGistId(token) {
    try {
      const res = await fetch('https://api.github.com/gists', { headers: getHeaders(token) });
      if (!res.ok) return null;
      const gists = await res.json();
      const match = gists.find(g => g.description === 'Weekly App Sync');
      if (match) {
        localStorage.setItem(KEYS.gistId, match.id);
        return match.id;
      }
    } catch (e) {}
    return null;
  }

  async function push() {
    const token = getToken();
    if (!token) return { ok: false, reason: 'no_token' };

    const content = Storage.exportData();
    let gistId = getGistId();

    try {
      if (gistId) {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'PATCH',
          headers: getHeaders(token),
          body: JSON.stringify({ files: { 'weekly-app.json': { content } } })
        });
        if (!res.ok) return { ok: false, reason: 'push_failed', status: res.status };
      } else {
        // No gistId — check if one already exists before creating
        const discovered = await discoverGistId(token);
        if (discovered) return push();

        const res = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: getHeaders(token),
          body: JSON.stringify({
            description: 'Weekly App Sync',
            public: false,
            files: { 'weekly-app.json': { content } }
          })
        });
        if (!res.ok) return { ok: false, reason: 'create_failed', status: res.status };
        const json = await res.json();
        localStorage.setItem(KEYS.gistId, json.id);
      }

      resetSyncTimestamp();
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'network_error', error: e.message };
    }
  }

  async function pull() {
    const token = getToken();
    if (!token) return { ok: false, reason: 'no_token' };
    let gistId = getGistId();
    if (!gistId) {
      gistId = await discoverGistId(token);
      if (!gistId) return push(); // No remote gist yet — create one
    }

    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: getHeaders(token)
      });
      if (!res.ok) return { ok: false, reason: 'pull_failed', status: res.status };

      const json = await res.json();
      const content = json.files?.['weekly-app.json']?.content;
      if (!content) return { ok: false, reason: 'no_content' };

      const remoteUpdatedAt = new Date(json.updated_at).getTime();
      const lastSync = parseInt(localStorage.getItem(KEYS.lastSync) || '0');
      const lastModified = parseInt(localStorage.getItem(KEYS.lastModified) || '0');

      const remoteChanged = remoteUpdatedAt > lastSync;
      const localChanged = lastModified > lastSync;

      // Conflict: both sides changed since last sync
      if (remoteChanged && localChanged && lastSync > 0) {
        return {
          ok: true,
          conflict: true,
          remoteData: JSON.parse(content),
          localData: Storage.getData()
        };
      }

      if (remoteChanged || lastSync === 0) {
        Storage.importData(content);
        resetSyncTimestamp();
        return { ok: true, updated: true };
      }

      // Local is newer — push
      if (localChanged) {
        return push();
      }

      return { ok: true, updated: false };
    } catch (e) {
      return { ok: false, reason: 'network_error', error: e.message };
    }
  }

  async function resolveConflict(keepLocal) {
    if (keepLocal) {
      return push();
    } else {
      // Force pull without conflict check
      const token = getToken();
      const gistId = getGistId();
      try {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          headers: getHeaders(token)
        });
        const json = await res.json();
        const content = json.files?.['weekly-app.json']?.content;
        if (content) {
          Storage.importData(content);
          resetSyncTimestamp();
          return { ok: true };
        }
        return { ok: false, reason: 'no_content' };
      } catch (e) {
        return { ok: false, reason: 'network_error', error: e.message };
      }
    }
  }

  async function autoSync() {
    return pull();
  }

  return { push, pull, autoSync, markModified, isUnsynced, resolveConflict, getToken, getGistId, KEYS };
})();
