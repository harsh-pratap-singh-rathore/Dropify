/**
 * Automated test suite for backend stream proxy, redirect following, and SSRF hardening.
 * Tests:
 * 1. SEC-05: Non-HTTPS upstream URL rejection.
 * 2. SEC-05: Non-whitelisted domain rejection (SSRF defense against cloud metadata / LAN IPs).
 * 3. BE-05: Safe HTTP 302 redirect following to validated googlevideo.com edge hosts.
 * 4. BE-05: Malicious HTTP 302 redirect rejection (SSRF defense against redirect chaining).
 * 5. BE-03: HTTP 416 Range Not Satisfiable clean handling.
 */
const assert = require('assert');
const EventEmitter = require('events');
const axios = require('axios');
const innertube = require('./services/innertubeService');

// Mock Express req and res
function createMockReqRes(options = {}) {
  const req = new EventEmitter();
  req.headers = options.headers || {};
  req.query = options.query || {};
  req.destroyed = false;

  const res = new EventEmitter();
  res.headersSent = false;
  res._headers = {};
  res._status = 200;
  res._ended = false;
  res._data = [];

  res.setHeader = (name, value) => {
    res._headers[name.toLowerCase()] = value;
  };
  res.getHeader = (name) => res._headers[name.toLowerCase()];

  res.status = (code) => {
    res._status = code;
    return res;
  };

  res.json = (body) => {
    res.headersSent = true;
    res._json = body;
    res._ended = true;
    res.emit('finish');
    return res;
  };

  res.end = (chunk) => {
    res.headersSent = true;
    if (chunk) res._data.push(chunk);
    res._ended = true;
    res.emit('finish');
    return res;
  };

  res.write = (chunk) => {
    res._data.push(chunk);
    return true;
  };

  return { req, res };
}

async function runTests() {
  console.log('--- Starting Backend Stream Redirect & SSRF Security Tests ---');
  let passed = 0;
  let total = 0;

  // Save original axios.get
  const originalAxiosGet = axios.get;

  // Helper to wrap test assertions
  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
    } finally {
      axios.get = originalAxiosGet;
      innertube.streamUrlCache.clear();
    }
  }

  // Test 1: Reject HTTP non-SSL URLs (SSRF / insecure transport)
  await test('SEC-05: Rejects insecure HTTP upstream URLs', async () => {
    const videoId = 'test_http_reject';
    innertube.streamUrlCache.set(videoId, {
      format: { url: 'http://rr1---sn-abc.googlevideo.com/videoplayback', mimeType: 'audio/mp4' },
      expiresAt: Date.now() + 60000
    });

    const { req, res } = createMockReqRes();
    await innertube.streamAudio(videoId, req, res);

    assert.strictEqual(res._status, 500);
    assert.ok(res._json && res._json.error === 'Playback stream failed');
    assert.ok(res._json.message.includes('Forbidden upstream audio host'));
  });

  // Test 2: Reject non-whitelisted domains (e.g. AWS metadata endpoint 169.254.169.254)
  await test('SEC-05: Rejects SSRF attempt against internal IP / metadata endpoint', async () => {
    const videoId = 'test_ssrf_metadata';
    innertube.streamUrlCache.set(videoId, {
      format: { url: 'https://169.254.169.254/latest/meta-data/', mimeType: 'audio/mp4' },
      expiresAt: Date.now() + 60000
    });

    const { req, res } = createMockReqRes();
    await innertube.streamAudio(videoId, req, res);

    assert.strictEqual(res._status, 500);
    assert.ok(res._json && res._json.error === 'Playback stream failed');
    assert.ok(res._json.message.includes('Forbidden upstream audio host'));
  });

  // Test 3: Reject non-whitelisted attacker domain (evil.com)
  await test('SEC-05: Rejects arbitrary third-party domain', async () => {
    const videoId = 'test_evil_domain';
    innertube.streamUrlCache.set(videoId, {
      format: { url: 'https://attacker.evil.com/audio.mp3', mimeType: 'audio/mp4' },
      expiresAt: Date.now() + 60000
    });

    const { req, res } = createMockReqRes();
    await innertube.streamAudio(videoId, req, res);

    assert.strictEqual(res._status, 500);
    assert.ok(res._json && res._json.message.includes('Forbidden upstream audio host'));
  });

  // Test 4: Follows legitimate HTTP 302 redirect to valid googlevideo.com edge CDN
  await test('BE-05: Safely follows HTTP 302 redirect to valid googlevideo.com CDN', async () => {
    const videoId = 'test_redirect_success';
    const initialUrl = 'https://manifest.googlevideo.com/videoplayback?id=1';
    const redirectUrl = 'https://rr2---sn-4g5edn6e.googlevideo.com/videoplayback?id=1&edge=1';

    innertube.streamUrlCache.set(videoId, {
      format: { url: initialUrl, mimeType: 'audio/mp4' },
      expiresAt: Date.now() + 60000
    });

    const mockStream = new EventEmitter();
    mockStream.destroy = () => {};
    mockStream.pipe = (destination) => {
      destination.write(Buffer.from('AUDIO_MOCK_DATA'));
      destination.end();
    };

    let callCount = 0;
    axios.get = async (targetUrl, options) => {
      callCount++;
      if (callCount === 1) {
        assert.strictEqual(targetUrl, initialUrl);
        // Simulate HTTP 302 redirect from Google CDN
        const redirectStream = new EventEmitter();
        redirectStream.destroy = () => {};
        return {
          status: 302,
          headers: { location: redirectUrl },
          data: redirectStream
        };
      } else if (callCount === 2) {
        assert.strictEqual(targetUrl, redirectUrl);
        // Final audio stream response
        return {
          status: 206,
          headers: {
            'content-range': 'bytes 0-100/101',
            'content-length': '15',
            'content-type': 'audio/mp4'
          },
          data: mockStream
        };
      }
    };

    const { req, res } = createMockReqRes({ headers: { range: 'bytes=0-100' } });
    await innertube.streamAudio(videoId, req, res);

    assert.strictEqual(callCount, 2, 'Should have made exactly 2 calls (initial + redirect)');
    assert.strictEqual(res._status, 206);
    assert.strictEqual(res.getHeader('accept-ranges'), 'bytes');
    assert.strictEqual(res.getHeader('content-range'), 'bytes 0-100/101');
    assert.strictEqual(res.getHeader('content-length'), '15');
    assert.strictEqual(res.getHeader('access-control-allow-origin'), '*');
  });

  // Test 5: Reject malicious redirect target (e.g. 302 redirect to attacker server)
  await test('BE-05 & SEC-05: Rejects malicious 302 redirect target', async () => {
    const videoId = 'test_malicious_redirect';
    const initialUrl = 'https://manifest.googlevideo.com/videoplayback?id=2';
    const maliciousTarget = 'https://internal-bank.corporate.internal/admin';

    innertube.streamUrlCache.set(videoId, {
      format: { url: initialUrl, mimeType: 'audio/mp4' },
      expiresAt: Date.now() + 60000
    });

    let redirectStreamDestroyed = false;
    axios.get = async (targetUrl, options) => {
      const redirectStream = new EventEmitter();
      redirectStream.destroy = () => { redirectStreamDestroyed = true; };
      return {
        status: 302,
        headers: { location: maliciousTarget },
        data: redirectStream
      };
    };

    const { req, res } = createMockReqRes();
    await innertube.streamAudio(videoId, req, res);

    assert.strictEqual(res._status, 500);
    assert.ok(res._json && res._json.message.includes('Forbidden upstream audio host'));
    assert.strictEqual(redirectStreamDestroyed, true, 'Redirect stream should be destroyed to avoid socket leaks');
  });

  // Test 6: Cleanly handles HTTP 416 Range Not Satisfiable
  await test('BE-03: Cleanly handles HTTP 416 Range Not Satisfiable', async () => {
    const videoId = 'test_range_416';
    innertube.streamUrlCache.set(videoId, {
      format: { url: 'https://rr1---sn-abc.googlevideo.com/videoplayback', mimeType: 'audio/mp4' },
      expiresAt: Date.now() + 60000
    });

    axios.get = async () => {
      return {
        status: 416,
        headers: {
          'content-range': 'bytes */5000000'
        },
        data: null
      };
    };

    const { req, res } = createMockReqRes({ headers: { range: 'bytes=9999999-10000000' } });
    await innertube.streamAudio(videoId, req, res);

    assert.strictEqual(res._status, 416);
    assert.strictEqual(res.getHeader('accept-ranges'), 'bytes');
    assert.strictEqual(res.getHeader('content-range'), 'bytes */5000000');
    assert.strictEqual(res._ended, true);
  });

  console.log(`\nTests completed: ${passed}/${total} passed (${Math.round(passed/total * 100)}%)`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
