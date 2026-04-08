window.saveBriefings = function(t, briefings) {
  var cleanBriefings = briefings.map(function(b) {
     if (b.versions && b.versions.length > 1) {
        b.versions = [ b.versions[b.versions.length - 1] ];
     }
     return b;
  });

  var json = JSON.stringify(cleanBriefings);
  // Using [\s\S] ensures it works even if there are any unexpected literal newlines.
  var chunks = json.match(/[\s\S]{1,3000}/g) || [];
  
  return t.get('card', 'shared').then(function(shared) {
    var data = { briefings_chunks: chunks.length };
    var keysToRemove = [];
    
    var oldChunks = shared ? (shared.briefings_chunks || 0) : 0;
    
    for (var i = 0; i < Math.max(chunks.length, oldChunks); i++) {
      if (i < chunks.length) {
        data['briefings_chunk_' + i] = chunks[i];
      } else {
        keysToRemove.push('briefings_chunk_' + i);
      }
    }
    
    if (shared && shared.briefings) keysToRemove.push('briefings');
    
    // First remove old keys to free up Trello's absolute 102KB data limit
    var p = keysToRemove.length > 0 ? t.remove('card', 'shared', keysToRemove) : Promise.resolve();
    
    // Then set the new data keys using individual calls to bypass the SDK's object stringification trap!
    return p.then(function() {
      var promises = [ t.set('card', 'shared', 'briefings_chunks', chunks.length) ];
      for (var j = 0; j < chunks.length; j++) {
        promises.push(t.set('card', 'shared', 'briefings_chunk_' + j, chunks[j]));
      }
      return Promise.all(promises);
    });
  });
};

window.loadBriefings = function(t) {
  return t.get('card', 'shared').then(function(shared) {
    if (!shared) return [];
    
    if (shared.briefings_chunks !== undefined) {
      var json = "";
      for (var i = 0; i < shared.briefings_chunks; i++) {
        json += shared['briefings_chunk_' + i] || '';
      }
      if (json) {
        try { return JSON.parse(json); } catch(e) { console.error("Parse error", e); return []; }
      }
    }
    
    var briefings = shared.briefings || [];
    if (briefings.length === 0 && shared.briefing) {
       briefings.push({
         id: Math.random().toString(36).substr(2, 9),
         title: 'Briefing Inicial',
         content: shared.briefing.content,
         updatedAt: shared.briefing.updatedAt,
         updatedBy: shared.briefing.updatedBy
       });
       window.saveBriefings(t, briefings);
    }
    return briefings;
  });
};
