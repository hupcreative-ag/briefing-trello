window.saveBriefings = function(t, briefings) {
  var json = JSON.stringify(briefings);
  // Trello limit is 4096 chars per key. Using 3000 to be strictly safe.
  var chunks = json.match(/.{1,3000}/g) || [];
  
  return t.get('card', 'shared').then(function(shared) {
    var data = { briefings_chunks: chunks.length };
    
    // Apply chunks and clear old chunks if the new size is smaller
    var oldChunks = shared ? (shared.briefings_chunks || 0) : 0;
    for (var i = 0; i < Math.max(chunks.length, oldChunks); i++) {
      if (i < chunks.length) {
        data['briefings_chunk_' + i] = chunks[i];
      } else {
        data['briefings_chunk_' + i] = null; // Delete extra chunks
      }
    }
    
    // Clear legacy key to free up space
    if (shared && shared.briefings) data.briefings = null;
    
    return t.set('card', 'shared', data);
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
    
    // Migration logic for old single briefing
    if (briefings.length === 0 && shared.briefing) {
       briefings.push({
         id: Math.random().toString(36).substr(2, 9),
         title: 'Briefing Inicial',
         content: shared.briefing.content,
         updatedAt: shared.briefing.updatedAt,
         updatedBy: shared.briefing.updatedBy
       });
       // Resave using new chunk system
       window.saveBriefings(t, briefings);
    }
    return briefings;
  });
};
