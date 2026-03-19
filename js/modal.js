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
        },
        'ai': async function() {
          var self = this;
          var key = await t.get('member', 'private', 'openai_key');
          if (!key) {
             key = prompt("Para usar a revisão com IA, insira sua Chave de API da OpenAI (API Key).\nEssa chave ficará salva de forma segura apenas na sua conta do Trello, não sendo compartilhada com terceiros.");
             if (!key) return;
             await t.set('member', 'private', 'openai_key', key);
          }
          
          var textHtml = self.quill.root.innerHTML;
          if (!textHtml || textHtml.trim() === "<p><br></p>") return alert("O texto está vazio.");
          
          // Show UI Modal
          var overlay = document.getElementById('ai-magic-overlay');
          if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ai-magic-overlay';
            overlay.innerHTML = `
              <div class="ai-magic-modal">
                <div id="ai-magic-loading" class="ai-state">
                  <div class="ai-spinner">✨</div>
                  <h3>Revisando seu texto...</h3>
                  <p>A inteligência artificial está analisando a ortografia e sintaxe.</p>
                </div>
                <div id="ai-magic-preview" class="ai-state" style="display: none;">
                  <h3>Texto Sugerido pela IA</h3>
                  <div id="ai-magic-content" class="ql-editor"></div>
                  <div class="ai-magic-actions">
                    <button id="ai-btn-cancel" class="mod-secondary">Descartar</button>
                    <button id="ai-btn-accept" class="mod-primary">Aceitar Alterações</button>
                  </div>
                </div>
              </div>
            `;
            document.body.appendChild(overlay);
          }

          var elLoading = overlay.querySelector('#ai-magic-loading');
          var elPreview = overlay.querySelector('#ai-magic-preview');
          var elContent = overlay.querySelector('#ai-magic-content');
          var btnAccept = overlay.querySelector('#ai-btn-accept');
          var btnCancel = overlay.querySelector('#ai-btn-cancel');

          elLoading.style.display = 'flex';
          elPreview.style.display = 'none';
          elContent.innerHTML = '';
          overlay.style.display = 'flex';
          
          // trigger animation
          setTimeout(() => { overlay.classList.add('show'); }, 10);

          try {
            var response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + key
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: "Você é um excelente revisor de texto. Corrija rigorosamente a ortografia, concordância e sintaxe do conteúdo HTML a seguir. Mantenha todas as tags HTML originais estritamente intactas (como <b>, <i>, <p>, <ul>). Retorne APENAS o HTML corrigido e NADA mais, sem usar blocos de formatação markdown (como ```html)." },
                  { role: "user", content: textHtml }
                ],
                temperature: 0.3
              })
            });

            if (!response.ok) {
              overlay.classList.remove('show');
              setTimeout(() => { overlay.style.display = 'none'; }, 300);
              if (response.status === 401) {
                await t.remove('member', 'private', 'openai_key');
                alert("Sua chave da OpenAI é inválida ou expirou. Tente novamente.");
              } else {
                alert("Erro na OpenAI: " + response.status + " " + response.statusText);
              }
              return;
            }
            
            var data = await response.json();
            var correctedHTML = data.choices[0].message.content;
            correctedHTML = correctedHTML.replace(/^```html\s*/i, "").replace(/```\s*$/, "").trim();
            
            // Show preview
            elLoading.style.display = 'none';
            elPreview.style.display = 'flex';
            elContent.innerHTML = correctedHTML;

            // Handle actions
            btnCancel.onclick = function() {
              overlay.classList.remove('show');
              setTimeout(() => { overlay.style.display = 'none'; }, 300);
            };

            btnAccept.onclick = function() {
              self.quill.root.innerHTML = correctedHTML;
              overlay.classList.remove('show');
              setTimeout(() => { overlay.style.display = 'none'; }, 300);
            };

          } catch(err) {
            console.error(err);
            overlay.classList.remove('show');
            setTimeout(() => { overlay.style.display = 'none'; }, 300);
            alert("Erro ao conectar com a API da OpenAI. Verifique sua conexão ou tente mais tarde.");
          }
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
  
  var histContainer = document.getElementById('history-container');
  if (histContainer) { histContainer.remove(); }
  
  if (currentBriefing.versions && currentBriefing.versions.length > 0) {
    histContainer = document.createElement('div');
    histContainer.id = 'history-container';
    histContainer.style.marginTop = '24px';
    histContainer.style.paddingTop = '16px';
    histContainer.style.borderTop = '1px solid #ebecf0';
    
    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'mod-secondary';
    toggleBtn.innerText = 'Ver histórico';
    toggleBtn.style.marginBottom = '12px';
    
    var listDiv = document.createElement('div');
    listDiv.style.display = 'none';
    
    toggleBtn.onclick = function() {
      if (listDiv.style.display === 'none') {
        listDiv.style.display = 'block';
        toggleBtn.innerText = 'Ocultar histórico';
      } else {
        listDiv.style.display = 'none';
        toggleBtn.innerText = 'Ver histórico';
      }
    };
    
    currentBriefing.versions.forEach(function(ver, idx) {
      var item = document.createElement('div');
      item.style.marginBottom = '16px';
      item.style.padding = '12px';
      item.style.backgroundColor = '#f4f5f7';
      item.style.borderRadius = '3px';
      
      var histMeta = document.createElement('div');
      histMeta.style.marginBottom = '8px';
      histMeta.style.fontSize = '12px';
      histMeta.style.color = '#5e6c84';
      histMeta.innerHTML = '<strong>' + (ver.title || 'Sem título') + '</strong> - Salvo por ' + (ver.updatedBy || 'Desconhecido') + ' em ' + (ver.updatedAt || '');
      
      var histContent = document.createElement('div');
      histContent.style.fontSize = '12px';
      histContent.style.maxHeight = '80px';
      histContent.style.overflow = 'hidden';
      histContent.style.position = 'relative';
      histContent.innerHTML = ver.content;
      
      var fade = document.createElement('div');
      fade.style.position = 'absolute';
      fade.style.bottom = '0';
      fade.style.left = '0';
      fade.style.right = '0';
      fade.style.height = '30px';
      fade.style.background = 'linear-gradient(to bottom, rgba(244,245,247,0), rgba(244,245,247,1))';
      histContent.appendChild(fade);
      
      var btnRestore = document.createElement('button');
      btnRestore.className = 'mod-primary';
      btnRestore.style.marginTop = '12px';
      btnRestore.style.padding = '4px 8px';
      btnRestore.innerText = 'Restaurar';
      btnRestore.onclick = function() { restoreVersion(idx); };
      
      item.appendChild(histMeta);
      item.appendChild(histContent);
      item.appendChild(btnRestore);
      listDiv.appendChild(item);
    });
    
    histContainer.appendChild(toggleBtn);
    histContainer.appendChild(listDiv);
    
    var footer = document.querySelector('#view-mode .modal-footer');
    viewMode.insertBefore(histContainer, footer);
  }
}

function restoreVersion(versionIndex) {
  if (confirm('Tem certeza que deseja restaurar esta versão? A atual irá para o histórico.')) {
    t.member('fullName').then(function(member) {
      t.get('card', 'shared', 'briefings').then(function(briefings) {
         if (!briefings) briefings = [];
         var idx = briefings.findIndex(function(b) { return b.id === currentBriefing.id; });
         if (idx !== -1) {
           var b = briefings[idx];
           var versionToRestore = b.versions[versionIndex];
           
           var oldVersion = {
             title: b.title,
             content: b.content,
             updatedAt: b.updatedAt,
             updatedBy: b.updatedBy
           };
           
           b.title = versionToRestore.title;
           b.content = versionToRestore.content;
           b.updatedAt = new Date().toLocaleString('pt-BR');
           b.updatedBy = member ? member.fullName : 'Membro Trello';
           
           b.versions.splice(versionIndex, 1);
           b.versions.unshift(oldVersion);
           if (b.versions.length > 2) b.versions.pop();
           
           currentBriefing = b;
           return t.set('card', 'shared', 'briefings', briefings);
         }
      }).then(function() {
         renderView();
      }).catch(function(err){
         console.error(err);
         alert('Erro ao restaurar a versão.');
      });
    });
  }
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
          var oldVersion = {
            title: briefings[idx].title,
            content: briefings[idx].content,
            updatedAt: briefings[idx].updatedAt,
            updatedBy: briefings[idx].updatedBy
          };
          if (!briefings[idx].versions) briefings[idx].versions = [];
          briefings[idx].versions.unshift(oldVersion);
          if (briefings[idx].versions.length > 2) {
            briefings[idx].versions.pop();
          }
          
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
