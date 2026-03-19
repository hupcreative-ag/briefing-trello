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
      listEl.innerHTML = '<p class="empty-state">Nenhuma informação interna adicionada ainda.</p>';
    } else {
      briefings.forEach(function(b) {
        var item = document.createElement('div');
        item.className = 'briefing-item';
        
        var icon = document.createElement('span');
        icon.className = 'briefing-icon';
        // Proper SVG icon that inherits text color for contrast
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
        
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

document.getElementById('btn-add-reference').addEventListener('click', function() {
  t.modal({
    url: './gallery.html',
    height: 600,
    title: 'Referências'
  });
});
