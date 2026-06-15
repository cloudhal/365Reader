/*
 * Copyright © 2026 Cloudrun Ltd
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Background service worker — handles feed fetches to bypass CORS
 * restrictions that block direct fetch() from the popup context.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchFeed") {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    fetch(request.url, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timeout);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then((text) => sendResponse({ ok: true, data: text }))
      .catch((error) => {
        clearTimeout(timeout);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }
});
