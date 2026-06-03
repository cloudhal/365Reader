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
const ALL_FEEDS_FILTER = "all";
const SCROLL_BOTTOM_THRESHOLD_PX = 24;
const LOAD_MORE_INDICATOR_MS = 180;

const FEEDS = [
  {
    name: "TechCommunity: Exchange Team Blog",
    filterLabel: "Exchange",
    pack: "core",
    defaultEnabled: true,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=Exchange",
  },
  {
    name: "TechCommunity: Microsoft Teams Blog",
    filterLabel: "Teams",
    pack: "core",
    defaultEnabled: true,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=MicrosoftTeamsBlog",
  },
  {
    name: "TechCommunity: Microsoft SharePoint Blog",
    filterLabel: "SharePoint",
    pack: "core",
    defaultEnabled: true,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=SPBlog",
  },
  {
    name: "TechCommunity: Intune Customer Success",
    filterLabel: "Intune",
    pack: "core",
    defaultEnabled: true,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=IntuneCustomerSuccess",
  },
  {
    name: "TechCommunity: Microsoft Security Experts Blog",
    filterLabel: "Security",
    pack: "core",
    defaultEnabled: true,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=MicrosoftSecurityExperts",
  },
  {
    name: "Microsoft Azure Blog",
    filterLabel: "Azure Blog",
    pack: "core",
    defaultEnabled: true,
    url: "https://azure.microsoft.com/en-us/blog/feed/",
  },
  {
    name: "TechCommunity: Azure Topics",
    filterLabel: "Azure",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=Azure",
  },
  {
    name: "TechCommunity: Microsoft 365 Copilot Topics",
    filterLabel: "Copilot",
    pack: "core",
    defaultEnabled: true,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=Microsoft365Copilot",
  },
  {
    name: "M365 Roadmap",
    filterLabel: "Roadmap",
    pack: "core",
    defaultEnabled: true,
    url: "https://www.microsoft.com/releasecommunications/api/v2/m365/rss",
  },
  {
    name: "TechCommunity: Microsoft Sentinel Blog",
    filterLabel: "Sentinel",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=MicrosoftSentinelBlog",
  },
  {
    name: "TechCommunity: Microsoft Intune Blog",
    filterLabel: "Intune Blog",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=MicrosoftIntuneBlog",
  },
  {
    name: "TechCommunity: FastTrack Blog",
    filterLabel: "FastTrack",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=FastTrackBlog",
  },
  {
    name: "TechCommunity: Microsoft OneDrive Blog",
    filterLabel: "OneDrive",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=OneDriveBlog",
  },
  {
    name: "TechCommunity: Azure Virtual Desktop Blog",
    filterLabel: "AVD",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=AzureVirtualDesktopBlog",
  },
  {
    name: "TechCommunity: Microsoft Mechanics Blog",
    filterLabel: "Mechanics",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=MicrosoftMechanicsBlog",
  },
  {
    name: "TechCommunity: Windows Server News and Best Practices",
    filterLabel: "Windows Server",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=WindowsServerNewsandBestPractices",
  },
  {
    name: "TechCommunity: Windows 11 IT Pro Blog",
    filterLabel: "Windows 11",
    pack: "core",
    defaultEnabled: true,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=Windows-ITPro-blog",
  },
  {
    name: "TechCommunity: Microsoft Defender for Office 365 Blog",
    filterLabel: "Defender O365",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=MicrosoftDefenderforOffice365Blog",
  },
  {
    name: "TechCommunity: Viva Goals Blog",
    filterLabel: "Viva Goals",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=VivaGoalsBlog",
  },
  {
    name: "TechCommunity: Microsoft 365 Insider Blog",
    filterLabel: "M365 Insider",
    pack: "optional",
    defaultEnabled: false,
    url: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=Microsoft365InsiderBlog",
  },
];

const FEED_LABEL_BY_NAME = FEEDS.reduce((map, feed) => {
  map[feed.name] = feed.filterLabel || feed.name;
  return map;
}, {});

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
    map[feed.name] = Boolean(feed.defaultEnabled);
    return map;
  }, {});
}

function normalizeEnabledFeeds(storedFeeds) {
  const defaults = createDefaultEnabledFeeds();
  if (!storedFeeds || typeof storedFeeds !== "object") {
    return defaults;
  }

  FEEDS.forEach((feed) => {
    if (typeof storedFeeds[feed.name] === "boolean") {
      defaults[feed.name] = storedFeeds[feed.name];
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

  return FEEDS.filter((feed) => feedSet.has(feed.name));
}

function getFeedDisplayLabel(feedName) {
  if (FEED_LABEL_BY_NAME[feedName]) {
    return FEED_LABEL_BY_NAME[feedName];
  }

  return String(feedName || "").replace(/^TechCommunity:\s*/i, "") || "Feed";
}

function normalizeActiveFeedFilters(value) {
  if (Array.isArray(value)) {
    const normalized = [...new Set(value.filter((item) => typeof item === "string" && item.trim().length > 0))];
    return normalized.length > 0 ? normalized : [ALL_FEEDS_FILTER];
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
    activeFeedFilters = [ALL_FEEDS_FILTER];
  } else {
    const nextSelection = activeFeedFilters.filter((feedName) => feedName !== ALL_FEEDS_FILTER);
    const valueIndex = nextSelection.indexOf(value);

    if (valueIndex >= 0) {
      nextSelection.splice(valueIndex, 1);
    } else {
      nextSelection.push(value);
    }

    activeFeedFilters = nextSelection.length > 0 ? nextSelection : [ALL_FEEDS_FILTER];
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

      return {
        title: (titleNode && titleNode.textContent ? titleNode.textContent : "Untitled").trim(),
        link: (href || "#").trim(),
        pubDate: (pubDateNode && pubDateNode.textContent ? pubDateNode.textContent : "").trim(),
        source: sourceName,
      };
    });
  }

  return items.map((item) => {
    const titleNode = item.querySelector("title");
    const linkNode = item.querySelector("link");
    const pubDateNode = item.querySelector("pubDate");

    return {
      title: (titleNode && titleNode.textContent ? titleNode.textContent : "Untitled").trim(),
      link: (linkNode && linkNode.textContent ? linkNode.textContent : "#").trim(),
      pubDate: (pubDateNode && pubDateNode.textContent ? pubDateNode.textContent : "").trim(),
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
    const key = `${item.link}|${item.pubDate}|${item.title}`;
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
  const response = await fetch(buildFeedPageUrl(feed.url, page));
  if (!response.ok) {
    throw new Error(`Failed to fetch ${feed.url} (page ${page})`);
  }

  const xmlText = await response.text();
  return parseFeed(xmlText, feed.name);
}

async function loadMoreForFeed(feedName) {
  const feed = FEEDS.find((item) => item.name === feedName);
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

  return feedFiltered.filter(
    (post) =>
      post.title.toLowerCase().includes(query) ||
      post.source.toLowerCase().includes(query) ||
      getFeedDisplayLabel(post.source).toLowerCase().includes(query)
  );
}

function buildPostsFromFeedItems(feedItemsMap, activeFeedNames) {
  return activeFeedNames
    .flatMap((feedName) => (feedItemsMap[feedName] || []).map((item) => ({ ...item, source: feedName })))
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

async function loadFeeds(maxItems, forceRefresh = false) {
  const status = document.getElementById("status");
  const activeFeeds = FEEDS.filter((feed) => enabledFeeds[feed.name]);
  const activeFeedNames = activeFeeds.map((feed) => feed.name);
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
          throw new Error(`Feed returned no items: ${feed.url}`);
        }

        return { feedName: feed.name, items: parsedItems };
      })
    );

    const successfulResults = settledResults
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    lastFeedFailures = settledResults
      .map((result, index) => ({ result, feed: activeFeeds[index] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ result, feed }) => ({
        name: feed.name,
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
  const feedOptions = [{ name: ALL_FEEDS_FILTER, filterLabel: "All feeds" }, ...availableFeeds];

  let activeLabel = "All feeds";
  if (!areAllFeedsSelected()) {
    activeLabel = activeFeedFilters.length === 1
      ? getFeedDisplayLabel(activeFeedFilters[0])
      : `${activeFeedFilters.length} feeds`;
  }

  if (toggleLabel) {
    toggleLabel.textContent = `Filter: ${activeLabel}`;
  }

  feedOptions.forEach((feed) => {
    const value = feed.name;
    const label = feed.filterLabel;
    const isSelected = value === ALL_FEEDS_FILTER
      ? areAllFeedsSelected()
      : !areAllFeedsSelected() && activeFeedFilters.includes(value);

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

function renderFeedToggles() {
  const container = document.getElementById("feed-toggle-list");
  container.innerHTML = "";

  const groups = [
    { key: "core", label: "Core feeds" },
    { key: "optional", label: "Optional feeds" },
  ];

  groups.forEach((group) => {
    const groupFeeds = FEEDS.filter((feed) => (feed.pack || "core") === group.key);
    if (groupFeeds.length === 0) {
      return;
    }

    const section = document.createElement("section");
    section.className = "space-y-2";

    const heading = document.createElement("p");
    heading.className = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";
    heading.textContent = group.label;
    section.appendChild(heading);

    const selectAllRow = document.createElement("label");
    selectAllRow.className = "feed-toggle-row";
    selectAllRow.setAttribute("for", `feed-toggle-${group.key}-all`);

    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.id = `feed-toggle-${group.key}-all`;
    selectAllCheckbox.className =
      "h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900 dark:focus:ring-sky-400";

    const selectAllText = document.createElement("span");
    selectAllText.className = "font-medium";
    selectAllText.textContent = "Select all";

    selectAllRow.appendChild(selectAllCheckbox);
    selectAllRow.appendChild(selectAllText);
    section.appendChild(selectAllRow);

    const feedCheckboxes = [];

    groupFeeds.forEach((feed, index) => {
      const row = document.createElement("label");
      row.className = "feed-toggle-row";
      row.setAttribute("for", `feed-toggle-${group.key}-${index}`);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `feed-toggle-${group.key}-${index}`;
      checkbox.dataset.feedName = feed.name;
      checkbox.className =
        "h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-900 dark:focus:ring-sky-400";
      checkbox.checked = Boolean(enabledFeeds[feed.name]);
      feedCheckboxes.push(checkbox);

      const labelText = document.createElement("span");
      labelText.textContent = feed.name;

      row.appendChild(checkbox);
      row.appendChild(labelText);
      section.appendChild(row);
    });

    const updateSelectAllState = () => {
      const checkedCount = feedCheckboxes.filter((checkbox) => checkbox.checked).length;
      selectAllCheckbox.checked = checkedCount === feedCheckboxes.length;
      selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < feedCheckboxes.length;
    };

    selectAllCheckbox.addEventListener("change", () => {
      feedCheckboxes.forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;
      });
      updateSelectAllState();
    });

    feedCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", updateSelectAllState);
    });

    updateSelectAllState();

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

  visiblePosts.forEach((post) => {
    const postCard = document.createElement("a");
    postCard.href = post.link;
    postCard.target = "_blank";
    postCard.rel = "noreferrer";
    postCard.className = "article-card";

    const dateLabel = post.pubDate ? new Date(post.pubDate).toLocaleDateString() : "";
    const sourceLabel = getFeedDisplayLabel(post.source);

    postCard.innerHTML = `
      <p class="text-xs text-sky-700 dark:text-sky-300">${sourceLabel}${dateLabel ? ` • ${dateLabel}` : ""}</p>
      <p class="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">${post.title}</p>
    `;

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

    if (/^[0-9]$/.test(key)) {
      event.preventDefault();

      if (key === "0") {
        applyFeedFilterSelection(ALL_FEEDS_FILTER);
        return;
      }

      const feedIndex = Number.parseInt(key, 10) - 1;
      const availableFeeds = getAvailableFeedFilters(allPosts);
      if (availableFeeds[feedIndex]) {
        applyFeedFilterSelection(availableFeeds[feedIndex].name);
      }
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
            .filter((feed) => enabledFeeds[feed.name])
            .map((feed) => feed.name);
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

  renderFeedFilters();
  populateAboutModal();

  Promise.all([
    readActiveFeedFilter(),
    readActiveSearch(),
    readFeedFilterPanelOpen(),
    new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => resolve(settings));
    }),
  ]).then(([storedFeedFilter, storedSearch, feedFilterPanelOpen, settings]) => {
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
