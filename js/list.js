var t = window.TrelloPowerUp.iframe();

t.render(function() {
  t.get('card', 'shared').then(function(shared) {
    var briefings = shared.briefings || [];
    
    // Migration logic for old single briefing to multi-briefing payload
    if (briefings.length === 0 && shared.briefing) {
       briefings.push({
         id: Math.random().toString(36).substr(2, 9),
         title: 'Briefing Inicial',
         content: shared.briefing.content,
         updatedAt: shared.briefing.updatedAt,
         updatedBy: shared.briefing.updatedBy
       });
       t.set('card', 'shared', 'briefings', briefings);
    }
    
    var listEl = document.getElementById('briefing-list');
    listEl.innerHTML = '';
    
    if (briefings.length === 0) {
      listEl.innerHTML = '<p class="empty-state">Nenhum briefing criado ainda.</p>';
    } else {
      briefings.forEach(function(b) {
        var item = document.createElement('div');
        item.className = 'briefing-item';
        
        var icon = document.createElement('span');
        icon.className = 'briefing-icon';
        icon.innerHTML = '📄';
        
        var title = document.createElement('span');
        title.className = 'briefing-title';
        title.innerText = b.title || 'Sem título';
        
        item.appendChild(icon);
        item.appendChild(title);
        
        item.addEventListener('click', function() {
          t.modal({
            url: './modal.html',
            args: { briefingId: b.id },
            height: 600,
            title: b.title || 'Briefing'
          });
        });
        
        listEl.appendChild(item);
      });
    }
    
    // Adjust height
    setTimeout(function() {
      t.sizeTo(document.body);
    }, 100);
  });
});

document.getElementById('btn-add-briefing').addEventListener('click', function() {
  t.modal({
    url: './modal.html',
    args: { action: 'create' },
    height: 600,
    title: 'Novo Briefing'
  });
});
