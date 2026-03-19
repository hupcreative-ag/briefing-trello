var t = window.TrelloPowerUp.iframe();

// Inicia o Quill.js
var quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: 'Adicione o briefing deste cartão...',
  modules: {
    toolbar: {
      container: '#toolbar-container',
      handlers: {
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
