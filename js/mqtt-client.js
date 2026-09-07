/**
 * Shared MQTT helper (depends on global `mqtt` from CDN + MQTT_CONFIG).
 */
(function (global) {
  const cfg = () => global.MQTT_CONFIG || {};
  const prefix = () => (cfg().topicPrefix || 'synopex/raw-uf').replace(/\/$/, '');

  let client = null;
  let connectPromise = null;
  const tagCache = new Map();
  const historyCache = new Map();
  const handlers = {
    tags: new Set(),
    online: new Set(),
    history: new Set(),
  };

  function topics() {
    const p = prefix();
    return {
      realtimeAll: `${p}/realtime/all`,
      realtimeWildcard: `${p}/realtime/#`,
      online: `${p}/status/online`,
      historyWildcard: `${p}/history/#`,
      history: (year, month) =>
        `${p}/history/${year}/${String(month).padStart(2, '0')}`,
    };
  }

  function parsePayload(buf) {
    try {
      const text = typeof buf === 'string' ? buf : buf.toString();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function emitTags() {
    const tags = Array.from(tagCache.entries()).map(([tagId, value]) => ({
      tagId,
      value,
    }));
    const envelope = { data: { tags } };
    handlers.tags.forEach((fn) => {
      try {
        fn(envelope, tags);
      } catch (e) {
        console.error('[mqtt] tags handler', e);
      }
    });
  }

  function applySnapshot(payload) {
    if (!payload) return;
    const list = payload.tags || payload.data?.tags;
    if (!Array.isArray(list)) return;
    for (const t of list) {
      if (t && t.tagId != null && t.value !== undefined) {
        tagCache.set(String(t.tagId), t.value);
      }
    }
    emitTags();
  }

  function applySingleTag(payload, topic) {
    if (!payload) return;
    let tagId = payload.tagId;
    if (!tagId && topic) {
      const parts = topic.split('/');
      tagId = parts[parts.length - 1];
      if (tagId === 'all') return;
    }
    if (!tagId || payload.value === undefined) return;
    tagCache.set(String(tagId), payload.value);
    emitTags();
  }

  function handleMessage(topic, payloadBuf) {
    const payload = parsePayload(payloadBuf);
    const t = topics();

    if (topic === t.online) {
      const online = !!(payload && payload.online);
      handlers.online.forEach((fn) => {
        try {
          fn(online, payload);
        } catch (e) {
          console.error('[mqtt] online handler', e);
        }
      });
      return;
    }

    if (topic === t.realtimeAll || topic.endsWith('/realtime/all')) {
      applySnapshot(payload);
      return;
    }

    if (topic.includes('/realtime/')) {
      applySingleTag(payload, topic);
      return;
    }

    if (topic.includes('/history/')) {
      if (payload) historyCache.set(topic, payload);
      handlers.history.forEach((fn) => {
        try {
          fn(topic, payload);
        } catch (e) {
          console.error('[mqtt] history handler', e);
        }
      });
    }
  }

  function isEnabled() {
    return cfg().enabled !== false && typeof global.mqtt !== 'undefined';
  }

  function connect() {
    if (!isEnabled()) {
      return Promise.reject(new Error('MQTT disabled or mqtt.js not loaded'));
    }
    if (client && client.connected) return Promise.resolve(client);
    if (connectPromise) return connectPromise;

    const conf = cfg();
    if (!conf.url || conf.url.includes('xxxxxxxx')) {
      return Promise.reject(new Error('MQTT_CONFIG.url not configured'));
    }

    connectPromise = new Promise((resolve, reject) => {
      const clientId = `${conf.clientIdPrefix || 'raw-uf-web'}-${Math.random()
        .toString(16)
        .slice(2, 10)}`;

      const c = global.mqtt.connect(conf.url, {
        clientId,
        username: conf.username || undefined,
        password: conf.password || undefined,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 15_000,
        protocolVersion: 4,
      });

      const onConnect = () => {
        client = c;
        const t = topics();
        const qos = conf.qos ?? 1;

        if (conf.useSnapshotAll !== false) {
          c.subscribe(t.realtimeAll, { qos });
        }
        c.subscribe(t.realtimeWildcard, { qos });
        c.subscribe(t.online, { qos });
        c.subscribe(t.historyWildcard, { qos });

        console.log('[mqtt] connected', conf.url);
        resolve(c);
      };

      c.once('connect', onConnect);
      c.once('error', (err) => {
        connectPromise = null;
        reject(err);
      });
      c.on('message', handleMessage);
      c.on('reconnect', () => console.log('[mqtt] reconnecting...'));
      c.on('close', () => console.warn('[mqtt] closed'));
    });

    return connectPromise;
  }

  function onTags(fn) {
    handlers.tags.add(fn);
    return () => handlers.tags.delete(fn);
  }

  function onOnline(fn) {
    handlers.online.add(fn);
    return () => handlers.online.delete(fn);
  }

  function onHistory(fn) {
    handlers.history.add(fn);
    return () => handlers.history.delete(fn);
  }

  function getCachedTagsEnvelope() {
    if (!tagCache.size) return null;
    return {
      data: {
        tags: Array.from(tagCache.entries()).map(([tagId, value]) => ({
          tagId,
          value,
        })),
      },
    };
  }

  function historyTopic(year, month) {
    return topics().history(year, month);
  }

  function publishHistory(year, month, locThoA, locThoB) {
    if (!client || !client.connected) {
      return Promise.reject(new Error('MQTT not connected'));
    }
    const topic = historyTopic(year, month);
    const payload = JSON.stringify({
      systemId: 'raw-uf',
      year,
      month,
      unit: 'm3',
      RAWUF_LocThoA: locThoA,
      RAWUF_LocThoB: locThoB,
      ts: new Date().toISOString(),
    });
    const qos = cfg().qos ?? 1;
    return new Promise((resolve, reject) => {
      client.publish(topic, payload, { qos, retain: true }, (err) =>
        err ? reject(err) : resolve()
      );
    });
  }

  function waitForHistory(year, month, timeoutMs = 4000) {
    const want = historyTopic(year, month);
    if (historyCache.has(want)) {
      return Promise.resolve(historyCache.get(want));
    }
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        off();
        resolve(historyCache.get(want) || null);
      }, timeoutMs);

      const off = onHistory((topic, payload) => {
        if (topic !== want || done) return;
        done = true;
        clearTimeout(timer);
        off();
        resolve(payload);
      });
    });
  }

  global.RawUfMqtt = {
    isEnabled,
    connect,
    onTags,
    onOnline,
    onHistory,
    getCachedTagsEnvelope,
    historyTopic,
    publishHistory,
    waitForHistory,
    topics,
  };
})(window);
