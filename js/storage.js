window.saveBriefings = function(t, briefings) {
  // Truncate history globally to ensure we only ever keep the FIRST version
  // and discard anything else to save space.
  var cleanBriefings = briefings.map(function(b) {
     if (b.versions && b.versions.length > 1) {
        // Since we originally used unshift, the absolute first version is at the end of the array.
        b.versions = [ b.versions[b.versions.length - 1] ];
     }
     return b;
  });

  var json = JSON.stringify(cleanBriefings);
  var chunks = json.match(/.{1,3000}/g) || [];
  
  return t.get('card', 'shared').then(function(shared) {
    var promises = [];
    var keysToRemove = [];
    
    // Save chunks count separately to avoid object stringify length limits
    promises.push(t.set('card', 'shared', 'briefings_chunks', chunks.length));
    
    var oldChunks = shared ? (shared.briefings_chunks || 0) : 0;
    
    for (var i = 0; i < Math.max(chunks.length, oldChunks); i++) {
      if (i < chunks.length) {
        // Save each chunk individually
        promises.push(t.set('card', 'shared', 'briefings_chunk_' + i, chunks[i]));
      } else {
        keysToRemove.push('briefings_chunk_' + i);
      }
    }
    
    if (shared && shared.briefings) keysToRemove.push('briefings');
    
    return Promise.all(promises).then(function() {
      if (keysToRemove.length > 0) {
        return t.remove('card', 'shared', keysToRemove);
      }
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
