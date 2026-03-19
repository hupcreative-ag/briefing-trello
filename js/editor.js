var t = window.TrelloPowerUp.iframe();

// Inicia o Quill.js
var quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: 'Adicione o briefing deste cartão...',
  modules: {
    toolbar: '#toolbar-container'
  }
});

// Resizing automatico de popup para se adequar ao texto
function resize() {
  t.sizeTo(document.body);
}

// Ao abrir, tentar pegar o dado ja salvo e preencher
t.render(function() {
  t.get('card', 'shared', 'briefing').then(function(briefing) {
    if (briefing && briefing.content) {
      quill.root.innerHTML = briefing.content;
    }
    // Resize timeout
    setTimeout(resize, 100);
  });
});

quill.on('text-change', function() {
  resize();
});

// Ações de Salvar / Cancelar
document.getElementById('btn-cancel').addEventListener('click', function() {
  t.closePopup();
});

document.getElementById('btn-save').addEventListener('click', function() {
  var saveBtn = document.getElementById('btn-save');
  saveBtn.disabled = true;
  saveBtn.innerText = 'Salvando...';

  var content = quill.root.innerHTML;
  
  // Obter quem foi o membro que alterou o briefing
  t.member('fullName').then(function(member) {
    var data = {
      content: content,
      updatedAt: new Date().toLocaleString('pt-BR'),
      updatedBy: member ? member.fullName : 'Membro Desconhecido'
    };
    
    // Salvar nas propriedades compartilhadas do cartão usando "briefing" como chave
    return t.set('card', 'shared', 'briefing', data);
  }).then(function() {
    t.closePopup();
  }).catch(function(err){
    console.error('Erro ao salvar o briefing:', err);
    saveBtn.disabled = false;
    saveBtn.innerText = 'Salvar Briefing';
  });
});
