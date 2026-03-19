var t = window.TrelloPowerUp.iframe();
var briefingId = t.arg('briefingId');
var action = t.arg('action');

var BlockEmbed = Quill.import('blots/block/embed');
class DividerBlot extends BlockEmbed { }
DividerBlot.blotName = 'divider';
DividerBlot.tagName = 'hr';
Quill.register(DividerBlot);

var quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: 'Digite o conteúdo do briefing...',
  modules: {
    toolbar: {
      container: '#toolbar-container',
      handlers: {
        'divider': function() {
          var range = this.quill.getSelection(true);
          this.quill.insertText(range.index, '\n', Quill.sources.USER);
          this.quill.insertEmbed(range.index + 1, 'divider', true, Quill.sources.USER);
          this.quill.setSelection(range.index + 2, Quill.sources.SILENT);
        }
      }
    }
  }
});

var viewMode = document.getElementById('view-mode');
var editMode = document.getElementById('edit-mode');

var currentBriefing = null;

function renderView() {
  viewMode.classList.remove('hide');
  editMode.classList.add('hide');
  
  document.getElementById('view-title').innerText = currentBriefing.title || 'Sem título';
  document.getElementById('view-content').innerHTML = currentBriefing.content || '<p>Vazio</p>';
  document.getElementById('view-author').innerText = currentBriefing.updatedBy || 'Desconhecido';
  document.getElementById('view-date').innerText = currentBriefing.updatedAt || '';
}

function renderEdit() {
  viewMode.classList.add('hide');
  editMode.classList.remove('hide');
  
  if (currentBriefing) {
    document.getElementById('edit-title').value = currentBriefing.title || '';
    quill.root.innerHTML = currentBriefing.content || '';
    document.getElementById('btn-delete').style.display = 'block';
  } else {
    document.getElementById('edit-title').value = '';
    quill.root.innerHTML = '';
    document.getElementById('btn-delete').style.display = 'none'; // hide delete if new
  }
}

t.render(function() {
  if (briefingId) {
    t.get('card', 'shared', 'briefings').then(function(briefings) {
      if (!briefings) briefings = [];
      currentBriefing = briefings.find(function(b) { return b.id === briefingId; });
      
      if (currentBriefing) {
        renderView();
      } else {
        // Fallback if deleted or error
        action = 'create';
        renderEdit();
      }
    });
  } else if (action === 'create') {
    renderEdit();
  }
});

document.getElementById('btn-edit').addEventListener('click', function() {
  renderEdit();
});

document.getElementById('btn-cancel').addEventListener('click', function() {
  if (action === 'create') {
    t.closeModal();
  } else {
    renderView();
  }
});

document.getElementById('btn-delete').addEventListener('click', function() {
  if (confirm('Tem certeza que deseja excluir este briefing permanentemente?')) {
    t.get('card', 'shared', 'briefings').then(function(briefings) {
      if (!briefings) briefings = [];
      var newBriefings = briefings.filter(function(b) { return b.id !== currentBriefing.id; });
      return t.set('card', 'shared', 'briefings', newBriefings);
    }).then(function() {
      t.closeModal();
    });
  }
});

document.getElementById('btn-save').addEventListener('click', function() {
  var saveBtn = document.getElementById('btn-save');
  saveBtn.disabled = true;
  saveBtn.innerText = 'Salvando...';
  
  var newTitle = document.getElementById('edit-title').value.trim() || 'Briefing Sem Título';
  var newContent = quill.root.innerHTML;
  
  t.member('fullName').then(function(member) {
    t.get('card', 'shared', 'briefings').then(function(briefings) {
      if (!briefings) briefings = [];
      
      var now = new Date().toLocaleString('pt-BR');
      var authorName = member ? member.fullName : 'Membro Trello';
      
      if (currentBriefing) {
        // Update
        var idx = briefings.findIndex(function(b) { return b.id === currentBriefing.id; });
        if (idx !== -1) {
          briefings[idx].title = newTitle;
          briefings[idx].content = newContent;
          briefings[idx].updatedAt = now;
          briefings[idx].updatedBy = authorName;
          currentBriefing = briefings[idx];
        }
      } else {
        // Create
        var newBriefing = {
          id: Math.random().toString(36).substr(2, 9),
          title: newTitle,
          content: newContent,
          updatedAt: now,
          updatedBy: authorName
        };
        briefings.push(newBriefing);
        currentBriefing = newBriefing;
        briefingId = newBriefing.id; 
        action = null; 
      }
      
      return t.set('card', 'shared', 'briefings', briefings);
    }).then(function() {
      saveBtn.disabled = false;
      saveBtn.innerText = 'Salvar';
      renderView();
    }).catch(function(err) {
      console.error(err);
      saveBtn.disabled = false;
      saveBtn.innerText = 'Salvar';
      alert('Erro ao salvar o briefing.\n\nO Trello possui um limite de tamanho (4 KB) para este tipo de dado.\nSe você colou uma IMAGEM dentro do texto, remova-a, pois o Trello bloqueia o salvamento de imagens coladas. Use a função "Anexos" do próprio cartão do Trello para imagens.');
    });
  });
});
