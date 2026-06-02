var PB_URL = 'https://hupcreative-pocketbase.cfnjsp.easypanel.host';

window.saveBriefings = function(t, briefings) {
  var cleanBriefings = briefings.map(function(b) {
     return {
       id: b.id,
       pbId: b.pbId,
       title: b.title,
       content: b.content,
       updatedAt: b.updatedAt,
       updatedBy: b.updatedBy
     };
  });

  // Trello Native Saving - Primary Reliable Source
  var json = JSON.stringify(cleanBriefings);
  var chunks = json.match(/[\s\S]{1,3000}/g) || [];
  
  var trelloSavePromise = t.get('card', 'shared').then(function(shared) {
    var keysToRemove = [];
    var oldChunks = shared ? (shared.briefings_chunks || 0) : 0;
    
    for (var i = 0; i < Math.max(chunks.length, oldChunks); i++) {
      if (i >= chunks.length) {
        keysToRemove.push('briefings_chunk_' + i);
      }
    }
    if (shared && shared.briefings) keysToRemove.push('briefings');
    
    var p = keysToRemove.length > 0 ? t.remove('card', 'shared', keysToRemove) : Promise.resolve();
    
    return p.then(function() {
      var promises = [ t.set('card', 'shared', 'briefings_chunks', chunks.length) ];
      for (var j = 0; j < chunks.length; j++) {
        promises.push(t.set('card', 'shared', 'briefings_chunk_' + j, chunks[j]));
      }
      return Promise.all(promises);
    });
  });

  // PocketBase Mirroring - Background Sync
  var pbSyncPromise = Promise.all([
    t.card('id', 'name').catch(function() { return null; }),
    t.board('id', 'name').catch(function() { return null; })
  ]).then(function(contextData) {
     var cardContext = contextData[0];
     var boardContext = contextData[1];

     var cardId = cardContext ? cardContext.id : t.getContext().card;
     var cardName = cardContext ? cardContext.name : 'Unknown Card';
     var boardName = boardContext ? boardContext.name : 'Unknown Board';

     if (!cardId) {
        console.warn("PB Sync: Não há cardId neste contexto.");
        return;
     }

     return fetch(PB_URL + '/api/collections/briefings/records?filter=(trelloCardId="' + cardId + '")')
       .then(r => r.json())
       .then(data => {
          var existing = data.items || [];
          var syncPromises = [];
          
          existing.forEach(function(ex) {
             var stillExists = cleanBriefings.find(sb => sb.pbId === ex.id || sb.id === ex.id);
             if (!stillExists) {
                syncPromises.push(fetch(PB_URL + '/api/collections/briefings/records/' + ex.id, { method: 'DELETE' }));
             }
          });

          cleanBriefings.forEach(function(b) {
             var payload = {
                trelloCardId: cardId,
                cardName: cardName,
                boardName: boardName,
                title: b.title || 'Sem título',
                content: b.content || '<p></p>',
                versions: [],
                updatedBy: b.updatedBy || 'Membro Trello'
             };
             
             if (b.pbId) {
                syncPromises.push(fetch(PB_URL + '/api/collections/briefings/records/' + b.pbId, {
                   method: 'PATCH',
                   headers: {'Content-Type': 'application/json'},
                   body: JSON.stringify(payload)
                }).then(async r => {
                   if (!r.ok) {
                      var err = await r.text();
                      console.error("Pocketbase PATCH Error:", err, "Payload:", payload);
                   }
                }));
             } else {
                syncPromises.push(fetch(PB_URL + '/api/collections/briefings/records', {
                   method: 'POST',
                   headers: {'Content-Type': 'application/json'},
                   body: JSON.stringify(payload)
                }).then(async r => {
                   if (!r.ok) {
                      var err = await r.text();
                      console.error("Pocketbase POST Error:", err, "Payload:", payload);
                   } else {
                      var res = await r.json();
                      b.pbId = res.id;
                      b.id = res.id;
                   }
                }));
             }
          });

          return Promise.all(syncPromises);
       }).catch(function(err) {
           console.error("Pocketbase Sync Crash:", err);
       });
  });

  return trelloSavePromise.then(function() {
      // Sync happens independently, we don't throw Trello errors if DB fails
      pbSyncPromise;
      return true;
  });
};

window.loadBriefings = function(t) {
  return t.card('id').catch(function() { return null; }).then(function(cardContext) {
     var cardId = cardContext ? cardContext.id : t.getContext().card;
     
     if (!cardId) {
        console.warn("PB Load: Sem ID do cartão, operando livremente");
        cardId = "MODO_ANONIMO";
     }

     return fetch(PB_URL + '/api/collections/briefings/records?filter=(trelloCardId="' + cardId + '")')
       .then(r => r.json())
       .then(data => {
          var items = data.items || [];
          if (items.length > 0) {
             return items.map(function(item) {
                return {
                   id: item.id,
                   pbId: item.id,
                   title: item.title,
                   content: item.content,
                   versions: [],
                   updatedBy: item.updatedBy,
                   updatedAt: new Date(item.updated).toLocaleString('pt-BR')
                };
             });
          } else {
             // Migração
             console.log("Não existe no PB. Tentando migrar do Trello...");
             return t.get('card', 'shared').then(function(shared) {
                if (!shared) return [];
                
                var oldBriefings = [];
                if (shared.briefings_chunks !== undefined) {
                  var json = "";
                  for (var i = 0; i < shared.briefings_chunks; i++) {
                    json += shared['briefings_chunk_' + i] || '';
                  }
                  if (json) {
                    try { oldBriefings = JSON.parse(json); } catch(e) {}
                  }
                } else if (shared.briefings) {
                  oldBriefings = shared.briefings;
                }
                
                if (oldBriefings.length > 0 && cardId !== "MODO_ANONIMO") {
                   return window.saveBriefings(t, oldBriefings).then(function() {
                      return oldBriefings;
                   });
                }
                return [];
             });
          }
       }).catch(err => {
          console.error("Erro no fetch do PocketBase:", err);
          return [];
       });
  });
};
