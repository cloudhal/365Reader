/*
 * Copyright © 2026 Cloudrun Ltd
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const DEFAULT_SETTINGS = {
  theme: "system",
  maxItems: 20,
  maxAdditionalPagesPerFeed: 6,
  enabledFeeds: {},
};

const FEED_CACHE_KEY = "feedCacheV1";
const FEED_CACHE_TTL_MS = 10 * 60 * 1000;
const ACTIVE_FEED_FILTER_KEY = "activeFeedFilterV1";
const ACTIVE_SEARCH_KEY = "activeSearchV1";
const FEED_FILTER_PANEL_OPEN_KEY = "feedFilterPanelOpenV1";
const POPUP_WIDTH_KEY = "popupExpandedV1";
const ALL_FEEDS_FILTER = "all";
const SCROLL_BOTTOM_THRESHOLD_PX = 24;
const LOAD_MORE_INDICATOR_MS = 180;

class Feed {
  constructor(blogName, filterLabel, category, defaultEnabled, feedURL, blogURL) {
    this.blogName = blogName;
    this.filterLabel = filterLabel;
    this.category = category;
    this.defaultEnabled = defaultEnabled;
    this.feedURL = feedURL;
    this.blogURL = blogURL;
  }
}

let FEEDS = [];
let FEED_LABEL_BY_NAME = {};

function rebuildFeedLookup() {
  FEED_LABEL_BY_NAME = FEEDS.reduce((map, feed) => {
    map[feed.blogName] = feed.filterLabel || feed.blogName;
    return map;
  }, {});
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function normalizeFeedUrl(value) {
  const text = String(value || "").trim();

  if (!text || /^no feed$/i.test(text)) {
    return "";
  }

  if (/^https?:\/\//i.test(text)) {
    return text;
  }

  if (/^\/\//.test(text)) {
    return `https:${text}`;
  }

  return `https://${text}`;
}

function parseFeedsCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines
    .slice(1)
    .map((line) => {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

      const feedURL = normalizeFeedUrl(row.feedURL);
      if (!feedURL) {
        return null;
      }

      return new Feed(
        row.blogName || "",
        row.filterLabel || row.blogName || "",
        row.category || "Uncategorized",
        /^(true|1|yes|y)$/i.test(String(row.defaultEnabled || "").trim()),
        feedURL,
        normalizeFeedUrl(row.blogURL)
      );
    })
    .filter(Boolean);
}

async function loadFeedsCatalog() {
  const response = await fetch(chrome.runtime.getURL("feeds.csv"), { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load feeds.csv: ${response.status}`);
  }

  FEEDS = parseFeedsCsv(await response.text());
  rebuildFeedLookup();
  return FEEDS;
}

let allPosts = [];
let activeSearch = "";
let activeFeedFilters = [ALL_FEEDS_FILTER];
let enabledFeeds = {};
let lastFeedFailures = [];
let lastLoadedFeedCount = 0;
let postsPageSize = DEFAULT_SETTINGS.maxItems;
let visiblePostCount = DEFAULT_SETTINGS.maxItems;
let isLoadingMore = false;
let feedItemsByName = {};
let feedNextPageByName = {};
let feedHasMoreByName = {};
let maxAdditionalPagesPerFeed = DEFAULT_SETTINGS.maxAdditionalPagesPerFeed;
let supplementalStatusNote = "";

function normalizeMaxItems(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SETTINGS.maxItems;
  }

  return Math.min(100, Math.max(1, parsed));
}

function normalizeMaxAdditionalPages(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SETTINGS.maxAdditionalPagesPerFeed;
  }

  return Math.min(20, Math.max(1, parsed));
}

function createDefaultEnabledFeeds() {
  return FEEDS.reduce((map, feed) => {
    map[feed.blogName] = Boolean(feed.defaultEnabled);
    return map;
  }, {});
}

function normalizeEnabledFeeds(storedFeeds) {
  const defaults = createDefaultEnabledFeeds();
  if (!storedFeeds || typeof storedFeeds !== "object") {
    return defaults;
  }

  FEEDS.forEach((feed) => {
    if (typeof storedFeeds[feed.blogName] === "boolean") {
      defaults[feed.blogName] = storedFeeds[feed.blogName];
    }
  });

  return defaults;
}

function getAvailableFeedFilters(posts) {
  const feedSet = new Set();

  posts.forEach((post) => {
    if (post.source) {
      feedSet.add(post.source);
    }
  });

  return FEEDS.filter((feed) => feedSet.has(feed.blogName));
}


const ROADMAP_STATUS_KEYWORDS = [
  "Launched",
  "Rolling out",
  "In development",
  "Cancelled",
];

function getRoadmapStatus(categories) {
  if (!Array.isArray(categories)) {
    return null;
  }

  return categories.find((cat) => ROADMAP_STATUS_KEYWORDS.includes(cat)) || null;
}

function getStatusBadgeHtml(status) {
  if (!status) {
    return "";
  }

  const badgeClass =
    status === "Launched"
      ? "badge badge-launched"
      : status === "Rolling out"
        ? "badge badge-rolling"
        : status === "In development"
          ? "badge badge-dev"
          : status === "Cancelled"
            ? "badge badge-cancelled"
            : "badge";

  const icon =
    status === "Launched"
      ? "✓"
      : status === "Rolling out"
        ? "⟳"
        : status === "In development"
          ? "○"
          : status === "Cancelled"
            ? "✕"
            : "";

  return `<span class="${badgeClass}">${icon ? `${icon} ` : ""}${status}</span>`;
}

function getFeedDisplayLabel(feedName) {
  if (FEED_LABEL_BY_NAME[feedName]) {
    return FEED_LABEL_BY_NAME[feedName];
  }

  return String(feedName || "").replace(/^TechCommunity:\s*/i, "") || "Feed";
}

function normalizeActiveFeedFilters(value) {
  if (Array.isArray(value)) {
    return [...new Set(
      value.filter((item) => typeof item === "string" && item.trim().length > 0)
    )];
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }

  return [ALL_FEEDS_FILTER];
}

function areAllFeedsSelected() {
  return activeFeedFilters.includes(ALL_FEEDS_FILTER);
}

function getSingleSelectedFeedName() {
  if (areAllFeedsSelected()) {
    return null;
  }

  return activeFeedFilters.length === 1 ? activeFeedFilters[0] : null;
}

async function applyFeedFilterSelection(value) {
  if (value === ALL_FEEDS_FILTER) {
    if (activeFeedFilters.includes(ALL_FEEDS_FILTER)) {
      activeFeedFilters = [];
    } else {
      activeFeedFilters = [ALL_FEEDS_FILTER];
    }
  } else {
    const isAllMode = activeFeedFilters.includes(ALL_FEEDS_FILTER);
    const isNoneMode = activeFeedFilters.length === 0;

    if (isAllMode) {
      const availableFeedNames = getAvailableFeedFilters(allPosts)
        .map((feed) => feed.blogName)
        .filter(Boolean);
      activeFeedFilters = availableFeedNames.filter((name) => name !== value);
    } else if (isNoneMode) {
      activeFeedFilters = [value];
    } else {
      const valueIndex = activeFeedFilters.indexOf(value);
      if (valueIndex >= 0) {
        activeFeedFilters = activeFeedFilters.filter((name) => name !== value);
      } else {
        activeFeedFilters = [...activeFeedFilters, value];
      }
    }
  }

  await writeActiveFeedFilter(activeFeedFilters);
  supplementalStatusNote = "";
  visiblePostCount = postsPageSize;
  renderFeedFilters();
  renderPosts();
}

function setResolvedTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function applyTheme(theme) {
  if (theme === "system") {
    const darkModeEnabled =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setResolvedTheme(darkModeEnabled ? "dark" : "light");
    return;
  }

  setResolvedTheme(theme);
}

function createModalController(modalId) {
  const modal = document.getElementById(modalId);

  const close = () => {
    modal.dataset.open = "false";
    modal.setAttribute("aria-hidden", "true");
  };

  const open = () => {
    modal.dataset.open = "true";
    modal.setAttribute("aria-hidden", "false");
  };

  modal.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", close);
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      close();
    }
  });

  return { open, close };
}

function stripHtml(html) {
  if (!html) {
    return "";
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").trim();
}

function parseCategories(item) {
  const cats = Array.from(item.querySelectorAll("category"));
  return cats
    .map((cat) => (cat.textContent || "").trim())
    .filter(Boolean);
}

function parseFeed(xmlText, sourceName) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error(`Invalid XML for ${sourceName}`);
  }
  const items = Array.from(xmlDoc.querySelectorAll("item"));

  if (items.length === 0) {
    const entries = Array.from(xmlDoc.querySelectorAll("entry"));
    return entries.map((entry) => {
      const titleNode = entry.querySelector("title");
      const linkNode = entry.querySelector("link");
      const pubDateNode = entry.querySelector("updated") || entry.querySelector("published");
      const href = linkNode ? linkNode.getAttribute("href") : "#";
      const contentNode = entry.querySelector("content") || entry.querySelector("summary");
      const rawDescription = contentNode ? contentNode.textContent : "";
      const authorNode = entry.querySelector("author name") || entry.getElementsByTagName("dc:creator")[0];
      const updatedNode = entry.querySelector("updated");
      const guidNode = entry.querySelector("id");

      return {
        title: (titleNode && titleNode.textContent ? titleNode.textContent : "Untitled").trim(),
        link: (href || "#").trim(),
        pubDate: (pubDateNode && pubDateNode.textContent ? pubDateNode.textContent : "").trim(),
        description: stripHtml(rawDescription),
        categories: parseCategories(entry),
        author: authorNode && authorNode.textContent ? authorNode.textContent.trim() : "",
        updated: updatedNode && updatedNode.textContent ? updatedNode.textContent.trim() : "",
        guid: guidNode && guidNode.textContent ? guidNode.textContent.trim() : "",
        source: sourceName,
      };
    });
  }

  return items.map((item) => {
    const titleNode = item.querySelector("title");
    const linkNode = item.querySelector("link");
    const pubDateNode = item.querySelector("pubDate");
    const descriptionNode = item.querySelector("description");
    const rawDescription = descriptionNode ? descriptionNode.textContent : "";
    const creatorNode = item.getElementsByTagName("dc:creator")[0];
    const updatedNode = item.getElementsByTagName("a10:updated")[0];
    const guidNode = item.querySelector("guid");

    return {
      title: (titleNode && titleNode.textContent ? titleNode.textContent : "Untitled").trim(),
      link: (linkNode && linkNode.textContent ? linkNode.textContent : "#").trim(),
      pubDate: (pubDateNode && pubDateNode.textContent ? pubDateNode.textContent : "").trim(),
      description: stripHtml(rawDescription),
      categories: parseCategories(item),
      author: creatorNode && creatorNode.textContent ? creatorNode.textContent.trim() : "",
      updated: updatedNode && updatedNode.textContent ? updatedNode.textContent.trim() : "",
      guid: guidNode && guidNode.textContent ? guidNode.textContent.trim() : "",
      source: sourceName,
    };
  });
}

function getFeedCacheKey(feedNames) {
  return [...feedNames].sort().join("|");
}

function buildFeedPageUrl(baseUrl, page) {
  if (page <= 1) {
    return baseUrl;
  }

  if (baseUrl.includes("azure.microsoft.com")) {
    const joiner = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${joiner}paged=${page}`;
  }

  if (baseUrl.includes("techcommunity.microsoft.com")) {
    const joiner = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${joiner}page=${page}`;
  }

  const joiner = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${joiner}page=${page}`;
}

function dedupeFeedItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.guid || `${item.link}|${item.pubDate}|${item.title}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function rebuildAllPostsFromFeedItems(activeFeedNames) {
  allPosts = buildPostsFromFeedItems(feedItemsByName, activeFeedNames);
}

function resetFeedPagingState(activeFeedNames) {
  const nextPageMap = {};
  const hasMoreMap = {};

  activeFeedNames.forEach((feedName) => {
    nextPageMap[feedName] = 2;
    hasMoreMap[feedName] = true;
  });

  feedNextPageByName = nextPageMap;
  feedHasMoreByName = hasMoreMap;
}

async function fetchFeedPage(feed, page) {
  const url = buildFeedPageUrl(feed.feedURL, page);

  const fetchViaBackground = () =>
    new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "fetchFeed", url }, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!result || !result.ok) {
          reject(new Error(result?.error || "Background fetch failed"));
        } else {
          resolve(result.data);
        }
      });
    });

  let xmlText;
  try {
    xmlText = await fetchViaBackground();
  } catch (bgError) {
    throw new Error(`Failed to fetch ${feed.feedURL} (page ${page}): ${bgError.message}`);
  }

  return parseFeed(xmlText, feed.blogName);
}

async function loadMoreForFeed(feedName) {
  const feed = FEEDS.find((item) => item.blogName === feedName);
  if (!feed) {
    return false;
  }

  if (feedHasMoreByName[feedName] === false) {
    return false;
  }

  const nextPage = feedNextPageByName[feedName] || 2;
  if (nextPage > maxAdditionalPagesPerFeed + 1) {
    feedHasMoreByName[feedName] = false;
    return false;
  }

  try {
    const pageItems = await fetchFeedPage(feed, nextPage);
    if (pageItems.length === 0) {
      feedHasMoreByName[feedName] = false;
      return false;
    }

    const existingItems = feedItemsByName[feedName] || [];
    const beforeCount = existingItems.length;
    const merged = dedupeFeedItems([...existingItems, ...pageItems]);
    feedItemsByName[feedName] = merged;
    feedNextPageByName[feedName] = nextPage + 1;

    if (merged.length === beforeCount) {
      feedHasMoreByName[feedName] = false;
      return false;
    }

    if (pageItems.length < 5) {
      feedHasMoreByName[feedName] = false;
    }

    return true;
  } catch (error) {
    feedHasMoreByName[feedName] = false;
    console.error(error);
    return false;
  }
}

function readFeedCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get([FEED_CACHE_KEY], (data) => {
      resolve(data[FEED_CACHE_KEY] || null);
    });
  });
}

function writeFeedCache(payload) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FEED_CACHE_KEY]: payload }, () => resolve());
  });
}

function readActiveFeedFilter() {
  return new Promise((resolve) => {
    chrome.storage.local.get([ACTIVE_FEED_FILTER_KEY], (data) => {
      const selectedFilter = data[ACTIVE_FEED_FILTER_KEY];
      resolve(normalizeActiveFeedFilters(selectedFilter));
    });
  });
}

function writeActiveFeedFilter(value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [ACTIVE_FEED_FILTER_KEY]: normalizeActiveFeedFilters(value) }, () => resolve());
  });
}

function readActiveSearch() {
  return new Promise((resolve) => {
    chrome.storage.local.get([ACTIVE_SEARCH_KEY], (data) => {
      const value = data[ACTIVE_SEARCH_KEY];
      resolve(typeof value === "string" ? value : "");
    });
  });
}

function writeActiveSearch(value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [ACTIVE_SEARCH_KEY]: value }, () => resolve());
  });
}

function readFeedFilterPanelOpen() {
  return new Promise((resolve) => {
    chrome.storage.local.get([FEED_FILTER_PANEL_OPEN_KEY], (data) => {
      resolve(Boolean(data[FEED_FILTER_PANEL_OPEN_KEY]));
    });
  });
}

function writeFeedFilterPanelOpen(value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FEED_FILTER_PANEL_OPEN_KEY]: Boolean(value) }, () => resolve());
  });
}

function isCacheFresh(cacheTimestamp) {
  if (!cacheTimestamp) {
    return false;
  }

  return Date.now() - cacheTimestamp <= FEED_CACHE_TTL_MS;
}

function resetAllSettings() {
  chrome.storage.local.clear(() => {
    chrome.storage.sync.clear(() => {
      localStorage.clear();
      location.reload();
    });
  });
}

function resetVisiblePosts(maxItems) {
  postsPageSize = normalizeMaxItems(maxItems);
  visiblePostCount = postsPageSize;
}

function getFilteredPosts() {
  const query = activeSearch.trim().toLowerCase();
  const feedFiltered = areAllFeedsSelected()
    ? allPosts
    : allPosts.filter((post) => activeFeedFilters.includes(post.source));

  if (!query) {
    return feedFiltered;
  }

  const keywords = query.split(/\s+/).filter(Boolean);

  return feedFiltered.filter((post) =>
    keywords.every((keyword) =>
      post.title.toLowerCase().includes(keyword) ||
      post.source.toLowerCase().includes(keyword) ||
      getFeedDisplayLabel(post.source).toLowerCase().includes(keyword) ||
      (post.author && post.author.toLowerCase().includes(keyword)) ||
      (Array.isArray(post.categories) && post.categories.some((cat) => cat.toLowerCase().includes(keyword)))
    )
  );
}

function buildPostsFromFeedItems(feedItemsMap, activeFeedNames) {
  return activeFeedNames
    .flatMap((feedName) => (feedItemsMap[feedName] || []).map((item) => ({ ...item, source: feedName })))
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

async function loadFeeds(maxItems, forceRefresh = false) {
  const status = document.getElementById("status");
  const activeFeeds = FEEDS.filter((feed) => enabledFeeds[feed.blogName]);
  const activeFeedNames = activeFeeds.map((feed) => feed.blogName);
  lastFeedFailures = [];
  lastLoadedFeedCount = 0;
  supplementalStatusNote = "";
  resetVisiblePosts(maxItems);

  if (activeFeeds.length === 0) {
    allPosts = [];
    status.textContent = "No feeds enabled. Open Settings to enable at least one feed.";
    renderFeedFilters();
    renderPosts();
    return;
  }

  status.textContent = forceRefresh ? "Refreshing feeds..." : "Loading feeds...";

  if (!forceRefresh) {
    const cached = await readFeedCache();
    if (cached && isCacheFresh(cached.savedAt) && cached.feedKey === getFeedCacheKey(activeFeedNames)) {
      feedItemsByName = cached.feedItems || {};
      rebuildAllPostsFromFeedItems(activeFeedNames);
      resetFeedPagingState(activeFeedNames);
      lastLoadedFeedCount = activeFeedNames.length;
      status.textContent = `Showing ${allPosts.length} cached posts`;
      renderFeedFilters();
      renderPosts();
      return;
    }
  }

  try {
    const settledResults = await Promise.allSettled(
      activeFeeds.map(async (feed) => {
        const parsedItems = await fetchFeedPage(feed, 1);
        if (parsedItems.length === 0) {
          throw new Error(`Feed returned no items: ${feed.feedURL}`);
        }

        return { feedName: feed.blogName, items: parsedItems };
      })
    );

    const successfulResults = settledResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    lastFeedFailures = settledResults
      .map((result, index) => ({ result, feed: activeFeeds[index] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ result, feed }) => ({
        name: feed.blogName,
        message: result.reason && result.reason.message ? result.reason.message : "Unknown error",
      }));

    lastLoadedFeedCount = successfulResults.length;

    feedItemsByName = successfulResults.reduce((map, result) => {
      map[result.feedName] = result.items;
      return map;
    }, {});

    resetFeedPagingState(activeFeedNames);
    rebuildAllPostsFromFeedItems(activeFeedNames);

    if (successfulResults.length > 0) {
      await writeFeedCache({
        savedAt: Date.now(),
        feedKey: getFeedCacheKey(activeFeedNames),
        feedItems: feedItemsByName,
      });
    }

    if (!areAllFeedsSelected()) {
      const validSelectedFeeds = activeFeedFilters.filter((feedName) => activeFeedNames.includes(feedName));
      activeFeedFilters = validSelectedFeeds.length > 0 ? validSelectedFeeds : [ALL_FEEDS_FILTER];
      await writeActiveFeedFilter(activeFeedFilters);
    }

    const failureSummary = lastFeedFailures
      .map((failure) => `${failure.name} (${failure.message})`)
      .join("; ");

    if (lastLoadedFeedCount === 0) {
      const likelyPermissionIssue = lastFeedFailures.every((failure) =>
        failure.message.toLowerCase().includes("failed to fetch")
      );
      const reloadHint = likelyPermissionIssue
        ? " Reload the extension to apply host permission changes."
        : "";
      status.textContent = `Could not load feeds: ${failureSummary}.${reloadHint}`;
    } else if (lastFeedFailures.length > 0) {
      status.textContent = `Loaded ${allPosts.length} posts. Failed: ${failureSummary}`;
    } else {
      status.textContent = `Loaded ${allPosts.length} posts from ${lastLoadedFeedCount} feed${lastLoadedFeedCount === 1 ? "" : "s"}`;
    }

    renderFeedFilters();
    renderPosts();
  } catch (error) {
    status.textContent = "Could not load feeds";
    console.error(error);
  }
}

function renderFeedFilters() {
  const container = document.getElementById("feed-filters");
  const toggleLabel = document.getElementById("feed-filters-toggle-label");
  container.innerHTML = "";

  const availableFeeds = getAvailableFeedFilters(allPosts);
  const feedOptions = [{ blogName: ALL_FEEDS_FILTER, filterLabel: "All feeds" }, ...availableFeeds];

  const allFeedFiltersSelected = areAllFeedsSelected();

  let activeLabel = "All feeds";
  if (activeFeedFilters.length === 0) {
    activeLabel = "None";
  } else if (!allFeedFiltersSelected) {
    activeLabel = activeFeedFilters.length === 1
      ? getFeedDisplayLabel(activeFeedFilters[0])
      : `${activeFeedFilters.length} feeds`;
  }

  if (toggleLabel) {
    toggleLabel.textContent = `Filter: ${activeLabel}`;
  }

  feedOptions.forEach((feed) => {
    const value = feed.blogName;
    const label = feed.filterLabel;
    const isSelected = value === ALL_FEEDS_FILTER
      ? allFeedFiltersSelected
      : allFeedFiltersSelected || activeFeedFilters.includes(value);

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "category-chip";
    chip.dataset.feed = value;
    chip.setAttribute("aria-pressed", String(isSelected));
    chip.textContent = label;
    chip.addEventListener("click", () => {
      applyFeedFilterSelection(value);
    });
    container.appendChild(chip);
  });
}

const CATEGORY_COLLAPSED_KEY = "categoryCollapsedV1";

function renderFeedToggles() {
  const container = document.getElementById("feed-toggle-list");
  container.innerHTML = "";

  const stored = localStorage.getItem(CATEGORY_COLLAPSED_KEY);
  let collapsedCategories;

  if (stored) {
    collapsedCategories = new Set(JSON.parse(stored));
  } else {
    const categories = [...new Set(FEEDS.map((feed) => feed.category).filter(Boolean))];
    collapsedCategories = new Set(categories);
  }

  const saveCollapsedState = () => {
    localStorage.setItem(CATEGORY_COLLAPSED_KEY, JSON.stringify([...collapsedCategories]));
  };

  const categories = [...new Set(FEEDS.map((feed) => feed.category).filter(Boolean))];

  categories.forEach((category) => {
    const groupFeeds = FEEDS.filter((feed) => feed.category === category);
    if (groupFeeds.length === 0) return;

    const isCollapsed = collapsedCategories.has(category);
    const section = document.createElement("section");
    section.className = "space-y-1";

    const header = document.createElement("button");
    header.type = "button";
    header.className =
      "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60";

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.setAttribute("viewBox", "0 0 20 20");
    chevron.setAttribute("fill", "currentColor");
    chevron.setAttribute("class", "h-4 w-4 shrink-0 transition-transform duration-200");
    chevron.style.transform = isCollapsed ? "rotate(-90deg)" : "rotate(0deg)";
    const chevronPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    chevronPath.setAttribute("fill-rule", "evenodd");
    chevronPath.setAttribute("clip-rule", "evenodd");
    chevronPath.setAttribute("d", "M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06");
    chevron.appendChild(chevronPath);

    const headingText = document.createElement("span");
    headingText.className = "flex-1";
    headingText.textContent = category;

    const countBadge = document.createElement("span");
    countBadge.className = "text-[10px] font-normal normal-case text-slate-400 dark:text-slate-500";
    countBadge.textContent = `${groupFeeds.length} feed${groupFeeds.length !== 1 ? "s" : ""}`;

    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.id = `cat-toggle-${category}-all`;
    selectAllCheckbox.className =
      "h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900 dark:focus:ring-sky-400";
    selectAllCheckbox.title = "Select all";

    header.appendChild(chevron);
    header.appendChild(headingText);
    header.appendChild(countBadge);
    header.appendChild(selectAllCheckbox);
    section.appendChild(header);

    const body = document.createElement("div");
    body.className = "space-y-1 overflow-hidden transition-all duration-200";
    body.style.display = isCollapsed ? "none" : "";

    const feedCheckboxes = [];

    groupFeeds.forEach((feed, index) => {
      const row = document.createElement("label");
      row.className = "feed-toggle-row ml-5";
      row.setAttribute("for", `cat-toggle-${category}-${index}`);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `cat-toggle-${category}-${index}`;
      checkbox.dataset.feedName = feed.blogName;
      checkbox.className =
        "h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900 dark:focus:ring-sky-400";
      checkbox.checked = Boolean(enabledFeeds[feed.blogName]);
      feedCheckboxes.push(checkbox);

      const labelText = document.createElement("span");
      labelText.textContent = feed.blogName;

      row.appendChild(checkbox);
      row.appendChild(labelText);
      body.appendChild(row);
    });

    const updateSelectAllState = () => {
      const checkedCount = feedCheckboxes.filter((cb) => cb.checked).length;
      selectAllCheckbox.checked = checkedCount === feedCheckboxes.length;
      selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < feedCheckboxes.length;
    };

    header.addEventListener("click", (event) => {
      if (event.target === selectAllCheckbox) return;
      const willCollapse = !collapsedCategories.has(category);
      if (willCollapse) {
        collapsedCategories.add(category);
      } else {
        collapsedCategories.delete(category);
      }
      saveCollapsedState();
      chevron.style.transform = willCollapse ? "rotate(-90deg)" : "rotate(0deg)";
      body.style.display = willCollapse ? "none" : "";
    });

    selectAllCheckbox.addEventListener("change", () => {
      feedCheckboxes.forEach((cb) => {
        cb.checked = selectAllCheckbox.checked;
      });
      updateSelectAllState();
    });

    feedCheckboxes.forEach((cb) => {
      cb.addEventListener("change", updateSelectAllState);
    });

    updateSelectAllState();

    section.appendChild(body);
    container.appendChild(section);
  });
}

function renderPosts() {
  const status = document.getElementById("status");
  const list = document.getElementById("feed-list");
  list.innerHTML = "";

  const appendListStateMessage = (message) => {
    const state = document.createElement("div");
    state.className =
      "rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-2 text-center text-xs font-medium text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300";
    state.textContent = message;
    list.appendChild(state);
  };

  const filteredPosts = getFilteredPosts();
  const visiblePosts = filteredPosts.slice(0, visiblePostCount);

  if (allPosts.length > 0 || lastFeedFailures.length > 0) {
    const base = allPosts.length > 0
      ? `Showing ${visiblePosts.length} of ${filteredPosts.length} posts`
      : "No posts available";
    const supplementalNote = supplementalStatusNote
      ? ` • ${supplementalStatusNote}`
      : "";
    const failureNote = lastFeedFailures.length > 0
      ? ` • Failed: ${lastFeedFailures.map((failure) => failure.name).join(", ")}`
      : "";
    status.textContent = `${base}${supplementalNote}${failureNote}`;
  }

  if (visiblePosts.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className =
      "rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-6 text-center text-xs font-medium text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300";
    emptyState.textContent = "No posts found";
    list.appendChild(emptyState);
    return;
  }

  visiblePosts.forEach((post, index) => {
    const postCard = document.createElement("div");
    postCard.className = "article-card cursor-pointer";
    postCard.dataset.expandedIndex = String(index);

    const sourceLabel = getFeedDisplayLabel(post.source);
    const hasDescription = Boolean(post.description && post.description.length > 0);
    let displayDescription = hasDescription ? post.description : "No description available.";
    if (hasDescription && post.description.length > 450) {
      const rest = post.description.slice(450);
      const nextSpace = rest.search(/\s/);
      const wordEnd = nextSpace >= 0 ? 450 + nextSpace : post.description.length;
      displayDescription = post.description.slice(0, wordEnd).trimEnd() + "…";
    }

    const roadmapStatus = getRoadmapStatus(post.categories);
    const statusBadgeHtml = getStatusBadgeHtml(roadmapStatus);
    const hasAuthor = Boolean(post.author);

    const pubDate = post.pubDate ? new Date(post.pubDate) : null;
    const updatedDate = post.updated && post.updated !== post.pubDate ? new Date(post.updated) : null;
    const dateParts = [];
    if (pubDate) {
      dateParts.push(pubDate.toLocaleDateString());
    }
    if (updatedDate) {
      dateParts.push(`Updated: ${updatedDate.toLocaleDateString()}`);
    }
    const dateStr = dateParts.join(" • ");

    const chevronId = `article-chevron-${index}`;
    const contentId = `article-desc-${index}`;

    postCard.innerHTML = `
      <div class="article-header" role="button" tabindex="0" aria-expanded="false">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-xs text-sky-700 dark:text-sky-300">
              ${sourceLabel}${dateStr ? ` • ${dateStr}` : ""}
            </p>
            ${statusBadgeHtml}
            <p class="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">${post.title}</p>
          </div>
          <svg id="${chevronId}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="article-chevron mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
      <div id="${contentId}" class="article-description" hidden>
        ${hasAuthor ? `<p class="text-xs text-slate-500 dark:text-slate-400">By ${post.author}</p>` : ""}
        <p class="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">${displayDescription}</p>
        <a href="${post.link}" target="_blank" rel="noreferrer"
           class="view-more-btn">View more</a>
      </div>
    `;

    const header = postCard.querySelector(".article-header");
    const toggleExpanded = () => {
      const descPanel = document.getElementById(contentId);
      const chevron = document.getElementById(chevronId);
      const isHidden = descPanel.hasAttribute("hidden");
      if (isHidden) {
        descPanel.removeAttribute("hidden");
        postCard.classList.add("article-card-expanded");
        chevron.style.transform = "rotate(180deg)";
        header.setAttribute("aria-expanded", "true");
      } else {
        descPanel.setAttribute("hidden", "");
        postCard.classList.remove("article-card-expanded");
        chevron.style.transform = "rotate(0deg)";
        header.setAttribute("aria-expanded", "false");
      }
    };

    header.addEventListener("click", toggleExpanded);
    header.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleExpanded();
      }
    });

    list.appendChild(postCard);
  });

  if (isLoadingMore && visiblePosts.length < filteredPosts.length) {
    appendListStateMessage("Loading more...");
    return;
  }

  const atListEnd = visiblePosts.length >= filteredPosts.length;
  if (!atListEnd || filteredPosts.length === 0) {
    return;
  }

  const singleSelectedFeed = getSingleSelectedFeedName();
  if (!singleSelectedFeed) {
    appendListStateMessage("End of loaded posts.");
    return;
  }

  if (feedHasMoreByName[singleSelectedFeed] === false) {
    appendListStateMessage("No more posts are available from this feed source.");
    return;
  }

  appendListStateMessage("Scroll to load more posts.");
}

function decorateChange(change) {
  if (change.includes("Added")) {
    return `✨ ${change}`;
  }

  if (change.includes("Fixed")) {
    return `🔧 ${change}`;
  }

  if (change.includes("Improved") || change.includes("Optimized")) {
    return `🚀 ${change}`;
  }

  if (change.includes("Updated")) {
    return `🔄 ${change}`;
  }

  return change;
}

function populateAboutModal() {
  const versionEl = document.getElementById("version");
  const releaseDateEl = document.getElementById("release-date");
  const changesListEl = document.getElementById("changes-list");

  if (!versionEl || !releaseDateEl || !changesListEl) {
    return;
  }

  const manifest = chrome.runtime.getManifest();
  versionEl.innerText = `Version: ${manifest.version}`;

  fetch(chrome.runtime.getURL("changelog.json"))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load changelog (${response.status})`);
      }

      return response.json();
    })
    .then((data) => {
      releaseDateEl.innerText = data.release_date
        ? `Released on: ${data.release_date}`
        : "Release date unavailable";

      changesListEl.innerHTML = "";
      const changes = Array.isArray(data.changes) ? data.changes : [];
      changes.forEach((change) => {
        const listItem = document.createElement("li");
        listItem.innerText = decorateChange(String(change));
        changesListEl.appendChild(listItem);
      });

      if (changes.length === 0) {
        const listItem = document.createElement("li");
        listItem.innerText = "No changelog entries available.";
        changesListEl.appendChild(listItem);
      }
    })
    .catch((error) => {
      releaseDateEl.innerText = "Release date unavailable";
      changesListEl.innerHTML = "";
      const listItem = document.createElement("li");
      listItem.innerText = "Could not load changelog.";
      changesListEl.appendChild(listItem);
      console.error(error);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const aboutModal = createModalController("about-modal");
  const settingsModal = createModalController("settings-modal");
  const searchInput = document.getElementById("search-input");
  const refreshButton = document.getElementById("refresh-btn");
  const feedList = document.getElementById("feed-list");
  const feedFiltersToggle = document.getElementById("feed-filters-toggle");
  const feedFiltersPanel = document.getElementById("feed-filters-panel");
  const feedFiltersChevron = document.getElementById("feed-filters-chevron");
  const themeSelect = document.getElementById("theme");
  const maxItemsSelect = document.getElementById("max-items");
  const maxAdditionalPagesSelect = document.getElementById("max-additional-pages");

  const setFeedFiltersExpanded = (expanded) => {
    feedFiltersPanel.classList.toggle("hidden", !expanded);
    feedFiltersToggle.setAttribute("aria-expanded", String(expanded));
    feedFiltersChevron.style.transform = expanded ? "rotate(180deg)" : "rotate(0deg)";
  };

  feedFiltersToggle.addEventListener("click", async () => {
    const expanded = feedFiltersToggle.getAttribute("aria-expanded") !== "true";
    setFeedFiltersExpanded(expanded);
    await writeFeedFilterPanelOpen(expanded);
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTypingContext =
      target instanceof HTMLElement &&
      (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTypingContext) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === "f") {
      event.preventDefault();
      const expanded = feedFiltersToggle.getAttribute("aria-expanded") !== "true";
      setFeedFiltersExpanded(expanded);
      writeFeedFilterPanelOpen(expanded);
      return;
    }

    if (key === "a") {
      event.preventDefault();
      applyFeedFilterSelection(ALL_FEEDS_FILTER);
      return;
    }
  });

  function loadSettingsIntoForm() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      enabledFeeds = normalizeEnabledFeeds(settings.enabledFeeds);
      themeSelect.value = settings.theme;
      maxItemsSelect.value = String(normalizeMaxItems(settings.maxItems));
      maxAdditionalPagesSelect.value = String(
        normalizeMaxAdditionalPages(settings.maxAdditionalPagesPerFeed)
      );
      renderFeedToggles();
      applyTheme(settings.theme);
    });
  }

  document.getElementById("about-icon").addEventListener("click", () => {
    aboutModal.open();
  });

  document.getElementById("settings-icon").addEventListener("click", () => {
    loadSettingsIntoForm();
    settingsModal.open();
  });

  const expandBtn = document.getElementById("expand-btn");
  const expandIcon = document.getElementById("expand-icon");
  const setExpanded = (isExpanded) => {
    document.body.classList.toggle("popup-expanded", isExpanded);
    expandBtn.setAttribute("aria-label", isExpanded ? "Collapse popup" : "Expand popup");
    expandBtn.setAttribute("title", isExpanded ? "Collapse wide popup" : "Toggle wide popup");
    expandIcon.innerHTML = isExpanded
      ? '<path stroke-linecap="round" stroke-linejoin="round" d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />'
      : '<path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />';
    localStorage.setItem(POPUP_WIDTH_KEY, isExpanded ? "wide" : "compact");
  };
  expandBtn.addEventListener("click", () => {
    setExpanded(!document.body.classList.contains("popup-expanded"));
  });
  if (localStorage.getItem(POPUP_WIDTH_KEY) === "wide") {
    setExpanded(true);
  }

  document.getElementById("save-settings").addEventListener("click", () => {
    const theme = themeSelect.value;
    const maxItems = normalizeMaxItems(maxItemsSelect.value);
    const maxAdditionalPages = normalizeMaxAdditionalPages(maxAdditionalPagesSelect.value);
    maxItemsSelect.value = String(maxItems);
    maxAdditionalPagesSelect.value = String(maxAdditionalPages);
    const nextEnabledFeeds = createDefaultEnabledFeeds();

    document.querySelectorAll("#feed-toggle-list input[type='checkbox']").forEach((checkbox) => {
      const feedName = checkbox.dataset.feedName;
      if (feedName) {
        nextEnabledFeeds[feedName] = checkbox.checked;
      }
    });

    enabledFeeds = nextEnabledFeeds;
    maxAdditionalPagesPerFeed = maxAdditionalPages;

    chrome.storage.sync.set({ theme, maxItems, maxAdditionalPagesPerFeed: maxAdditionalPages, enabledFeeds }, () => {
      applyTheme(theme);
      loadFeeds(maxItems, true);
      settingsModal.close();
    });
  });

  document.getElementById("reset-settings").addEventListener("click", () => {
    if (confirm("Reset all settings, filters, and cache to defaults? This cannot be undone.")) {
      resetAllSettings();
    }
  });

  refreshButton.addEventListener("click", () => {
    const maxItems = normalizeMaxItems(maxItemsSelect.value || DEFAULT_SETTINGS.maxItems);
    maxItemsSelect.value = String(maxItems);
    loadFeeds(maxItems, true);
  });

  searchInput.addEventListener("input", async (event) => {
    activeSearch = event.target.value || "";
    await writeActiveSearch(activeSearch);
    supplementalStatusNote = "";
    visiblePostCount = postsPageSize;
    renderPosts();
  });

  feedList.addEventListener("scroll", () => {
    if (isLoadingMore) {
      return;
    }

    const nearBottom =
      feedList.scrollTop + feedList.clientHeight >= feedList.scrollHeight - SCROLL_BOTTOM_THRESHOLD_PX;
    if (!nearBottom) {
      return;
    }

    const filteredPosts = getFilteredPosts();
    if (visiblePostCount >= filteredPosts.length) {
      const singleSelectedFeed = getSingleSelectedFeedName();
      if (!singleSelectedFeed) {
        return;
      }

      isLoadingMore = true;
      renderPosts();

      window.setTimeout(async () => {
        const loadedMore = await loadMoreForFeed(singleSelectedFeed);
        if (loadedMore) {
          const activeFeedNames = FEEDS
            .filter((feed) => enabledFeeds[feed.blogName])
            .map((feed) => feed.blogName);
          rebuildAllPostsFromFeedItems(activeFeedNames);
          const nextFilteredPosts = getFilteredPosts();
          supplementalStatusNote = "";
          visiblePostCount = Math.min(visiblePostCount + postsPageSize, nextFilteredPosts.length);
        } else {
          supplementalStatusNote = "No additional posts are exposed by this feed source.";
        }

        isLoadingMore = false;
        renderPosts();
      }, LOAD_MORE_INDICATOR_MS);

      return;
    }

    isLoadingMore = true;
    renderPosts();

    window.setTimeout(() => {
      supplementalStatusNote = "";
      visiblePostCount = Math.min(visiblePostCount + postsPageSize, filteredPosts.length);
      isLoadingMore = false;
      renderPosts();
    }, LOAD_MORE_INDICATOR_MS);
  });

  function focusSearchInput() {
    searchInput.focus();
  }

  renderFeedFilters();
  populateAboutModal();
  focusSearchInput();

  Promise.all([
    loadFeedsCatalog(),
    readActiveFeedFilter(),
    readActiveSearch(),
    readFeedFilterPanelOpen(),
    new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => resolve(settings));
    }),
  ]).then(([loadedFeeds, storedFeedFilter, storedSearch, feedFilterPanelOpen, settings]) => {
    FEEDS = loadedFeeds;
    rebuildFeedLookup();
    activeFeedFilters = normalizeActiveFeedFilters(storedFeedFilter);
    activeSearch = storedSearch;
    setFeedFiltersExpanded(feedFilterPanelOpen);
    searchInput.value = storedSearch;
    enabledFeeds = normalizeEnabledFeeds(settings.enabledFeeds);
    themeSelect.value = settings.theme;
    maxAdditionalPagesPerFeed = normalizeMaxAdditionalPages(settings.maxAdditionalPagesPerFeed);
    maxAdditionalPagesSelect.value = String(maxAdditionalPagesPerFeed);
    const maxItems = normalizeMaxItems(settings.maxItems);
    maxItemsSelect.value = String(maxItems);
    renderFeedToggles();
    applyTheme(settings.theme);
    loadFeeds(maxItems, false);
  });
});
