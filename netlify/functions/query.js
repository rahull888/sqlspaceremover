<script>
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwjFug3Ec7DVn4DME5DqKyLKaGW-JWQrkoSPhPMSYug3eHChHfNhhKKDPm0lsck3-2Cng/exec"; // <- replace
  const WRITE_TOKEN = "535a437e64979f710a8e25fa2fa9a9055a0bc7d4ae077e0819c45c58cc0d3dde"; // <- if you configured token in Apps Script

  async function sendToSheet(cleaned, original){
    try {
      const body = { cleaned: cleaned, original: original };
      if (WRITE_TOKEN) body.token = WRITE_TOKEN;

      // add optional client metadata as query params (Apps Script can read e.parameter)
      const url = WEB_APP_URL + `?_user_agent=${encodeURIComponent(navigator.userAgent || '')}`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const j = await resp.json();
      if (j && j.status === 'ok') {
        console.log('Saved to sheet');
        return true;
      } else {
        console.warn('Save failed', j);
        return false;
      }
    } catch (e) {
      console.error('sendToSheet error', e);
      return false;
    }
  }

  // integrate with existing buttons
  document.getElementById('clean').onclick = async () => {
    const cleaned = collapseSimple(inEl.value || '');
    outEl.textContent = cleaned;
    // send to sheet but do not block UI
    sendToSheet(cleaned, inEl.value);
  };

  document.getElementById('preserve').onclick = async () => {
    const cleaned = collapsePreserveQuotes(inEl.value || '');
    outEl.textContent = cleaned;
    sendToSheet(cleaned, inEl.value);
  };
</script>
