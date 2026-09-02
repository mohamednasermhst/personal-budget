/* Service worker for the Household Budget Dashboard.
   Place this file in the SAME folder as the dashboard HTML.

   Network-first, deliberately. A budget tool that silently served a stale
   build after an update would be worse than one that needs a connection --
   you could be reading last month's logic against this month's data. So:
   try the network, fall back to the cache only when genuinely offline. */
var CACHE = "household-budget-v1";

self.addEventListener("install", function(){ self.skipWaiting(); });

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
    fetch(e.request).then(function(res){
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
