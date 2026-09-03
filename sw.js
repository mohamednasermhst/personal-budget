/* Service worker for the Household Budget Dashboard.
   Place this file in the SAME folder as the dashboard HTML.

   Network-first, deliberately. A budget tool that silently served a stale
   build after an update would be worse than one that needs a connection --
   you could be reading last month's logic against this month's data. So:
   try the network, fall back to the cache only when genuinely offline. */
/* Bump this on every release. Changing the value is what makes the
   activate handler below delete the previous cache -- without a bump an
   installed app can keep serving old files even though the server has
   new ones. */
var CACHE = "household-budget-v53";

self.addEventListener("install", function(){ self.skipWaiting(); });

// The page asks the waiting worker to take over immediately, rather than
// waiting for every tab to close (which on an installed PWA may be never).
self.addEventListener("message", function(e){
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
                             .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  if (e.request.method !== "GET") return;
  e.respondWith(
    // cache:"reload" bypasses the BROWSER's HTTP cache. Without it a
    // "network-first" fetch can still be answered from that cache (GitHub
    // Pages sends max-age=600), so the worker faithfully caches a stale
    // file and the user never sees the new build. This was the real cause
    // of updates not landing.
    fetch(new Request(e.request, { cache: "reload" })).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copy); }).catch(function(){});
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(hit){
        return hit || caches.match("./") || caches.match("index.html");
      });
    })
  );
});
