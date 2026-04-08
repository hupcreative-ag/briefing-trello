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

async function doAIReview(textHtml, onApply) {
  var key = await t.get('member', 'private', 'openai_key');
  if (!key) {
     key = prompt("Para usar a revisão com IA, insira sua Chave de API da OpenAI (API Key).\nEla ficará salva de forma segura apenas na sua conta do Trello.");
     if (!key) return;
     await t.set('member', 'private', 'openai_key', key);
  }
  if (!textHtml || textHtml.trim() === "<p><br></p>" || textHtml.trim() === "") return alert("O texto está vazio.");

  var overlay = document.getElementById('ai-magic-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ai-magic-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="ai-magic-modal" style="width: 90%; max-width: 800px;">
      <div id="ai-magic-loading" class="ai-state">
        <div class="ai-spinner">✨</div>
        <h3>Analisando seu texto...</h3>
        <p>A inteligência artificial está verificando a ortografia, sintaxe e concordância.</p>
      </div>
      <div id="ai-magic-preview" class="ai-state" style="display: none;">
        <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="color: #ff991f; display:flex; align-items:center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Atenção: Erros Encontrados
          </span>
        </h3>
        <p style="margin: 0; padding-bottom: 8px; color: #5e6c84;">Revisão concluída. Verifique e aplique as correções abaixo.</p>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px solid #dfe1e6; width: fit-content;">
          <div style="display: flex; gap: 2px;">
            <div id="ai-sev-1" style="width: 24px; height: 12px; border-radius: 12px 0 0 12px; background: #ebecf0;"></div>
            <div id="ai-sev-2" style="width: 24px; height: 12px; background: #ebecf0;"></div>
            <div id="ai-sev-3" style="width: 24px; height: 12px; border-radius: 0 12px 12px 0; background: #ebecf0;"></div>
          </div>
          <span id="ai-error-count-text" style="font-size: 13px; color: #172b4d; font-weight: 600;"></span>
        </div>
        <div class="diff-container" style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
          <div class="diff-panel ai-left-panel" style="padding:16px; border:1px solid #dfe1e6; border-radius:4px; max-height:40vh; overflow-y:auto; background:#f4f5f7;">
            <h4 style="margin:0 0 8px 0; font-size:12px; color:#5e6c84; text-transform:uppercase;">Original</h4>
            <div id="ai-diff-left" style="font-size:14px; line-height:20px;"></div>
          </div>
          <div class="diff-panel ai-right-panel" style="padding:16px; border:1px solid #dfe1e6; border-radius:4px; max-height:40vh; overflow-y:auto; background:#f4f5f7;">
            <h4 style="margin:0 0 8px 0; font-size:12px; color:#5e6c84; text-transform:uppercase;">Corrigido</h4>
            <div id="ai-diff-right" style="font-size:14px; line-height:20px;"></div>
          </div>
        </div>
        <div class="ai-magic-actions" style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="ai-btn-cancel" class="mod-secondary">Descartar</button>
          <button id="ai-btn-accept" class="mod-primary">Aplicar Alterações</button>
        </div>
      </div>
      <div id="ai-magic-success" class="ai-state" style="display: none; padding: 24px;">
        <div class="ai-success-box" style="display:flex; align-items:center; gap:16px; background:#e3fcef; padding:24px; border-radius:8px; border:1px solid #abf5d1; margin-bottom:24px;">
          <div class="ai-success-icon" style="font-size:32px;">✅</div>
          <div>
            <h4 style="margin:0 0 8px 0; font-size:18px; color:#006644;">Tudo certo!</h4>
            <p style="margin:0; color:#006644;">O texto não contém erros de ortografia, concordância ou sintaxe.</p>
          </div>
        </div>
        <div style="text-align: center;">
          <button id="ai-btn-close-success" class="mod-secondary">Fechar</button>
        </div>
      </div>
    </div>
  `;

  var elLoading = overlay.querySelector('#ai-magic-loading');
  var elPreview = overlay.querySelector('#ai-magic-preview');
  var elSuccess = overlay.querySelector('#ai-magic-success');

  elLoading.style.display = 'flex';
  elPreview.style.display = 'none';
  elSuccess.style.display = 'none';
  overlay.style.display = 'flex';
  setTimeout(() => { overlay.classList.add('show'); }, 10);

  var hideOverlay = function() {
    overlay.classList.remove('show');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  };

  overlay.querySelector('#ai-btn-cancel').onclick = hideOverlay;
  overlay.querySelector('#ai-btn-close-success').onclick = hideOverlay;

  try {
    var response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Você é um revisor de textos para briefings de redes sociais de uma agência de comunicação brasileira.\n\nO texto pode conter linguagem informal, gírias, fragmentos de frase e escolhas estilísticas de copy. Trate tudo isso como intencional.\n\nCorrija apenas:\n1. Palavras com letras trocadas, faltando ou sobrando\n2. Palavras duplicadas acidentalmente\n3. Palavras claramente faltando por erro de digitação onde a ausência quebra o sentido óbvio da frase\n4. Acentuação incorreta em palavras comuns\n5. Erros graves de concordância que tornam a frase incompreensível\n6. Pontuação apenas em trechos de texto corrido e denso, nunca em frases curtas, fragmentos ou estruturas de copy\n\nNunca corrija:\n- Estrutura de frases curtas ou fragmentos\n- Palavras informais\n- Frases sem verbo ou com verbo implícito\n- Qualquer coisa que pareça uma escolha de estilo\n\nNunca adicione, remova ou substitua palavras além do mínimo necessário para corrigir o erro identificado.\nNunca modifique atributos HTML, classes, URLs ou estrutura das tags.\nTrabalhe apenas no conteúdo textual dentro das tags.\nEnvolva o texto REMOVIDO com <del> e o ADICIONADO com <ins>.\n\nRetorne EXATAMENTE um JSON com três chaves:\n- has_errors: true se encontrou erros, false se não\n- diff_html: o HTML completo com as marcações de diff aplicadas\n- corrections: array de objetos com { original, corrigido, motivo } listando cada correção. Se não houver erros, retorne array vazio.\n\nSe não houver erros, retorne diff_html idêntico ao input, sem nenhuma tag <del> ou <ins>." },
          { role: "user", content: textHtml }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      hideOverlay();
      if (response.status === 401) {
        await t.remove('member', 'private', 'openai_key');
        alert("Sua chave da OpenAI é inválida ou expirou. Tente novamente.");
      } else {
        alert("Erro na OpenAI: " + response.statusText);
      }
      return;
    }
    
    var data = await response.json();
    var result = JSON.parse(data.choices[0].message.content);
    
    var numErrors = 0;
    if (result.corrections && Array.isArray(result.corrections)) {
      numErrors = result.corrections.length;
    } else {
      numErrors = (result.diff_html.match(/<del>/gi) || []).length;
    }

    if (!result.has_errors || numErrors === 0) {
      elLoading.style.display = 'none';
      elSuccess.style.display = 'flex';
    } else {
      var badgeText = overlay.querySelector('#ai-error-count-text');
      var sev1 = overlay.querySelector('#ai-sev-1');
      var sev2 = overlay.querySelector('#ai-sev-2');
      var sev3 = overlay.querySelector('#ai-sev-3');
      var defaultGray = '#ebecf0';
      
      badgeText.innerText = numErrors + (numErrors === 1 ? ' erro encontrado' : ' erros encontrados');
      
      if (numErrors <= 2) {
         sev1.style.background = '#61bd4f'; // Verde
         sev2.style.background = defaultGray;
         sev3.style.background = defaultGray;
      } else if (numErrors <= 5) {
         sev1.style.background = '#f2d600'; // Amarelo/Laranja
         sev2.style.background = '#f2d600';
         sev3.style.background = defaultGray;
      } else {
         sev1.style.background = '#eb5a46'; // Vermelho
         sev2.style.background = '#eb5a46';
         sev3.style.background = '#eb5a46';
      }

      overlay.querySelector('#ai-diff-left').innerHTML = result.diff_html;
      overlay.querySelector('#ai-diff-right').innerHTML = result.diff_html;
      
      elLoading.style.display = 'none';
      elPreview.style.display = 'flex';

      overlay.querySelector('#ai-btn-accept').onclick = function() {
        var temp = document.createElement('div');
        temp.innerHTML = result.diff_html;
        temp.querySelectorAll('del').forEach(d => d.remove());
        temp.querySelectorAll('ins').forEach(i => {
          var parent = i.parentNode;
          while(i.firstChild) parent.insertBefore(i.firstChild, i);
          parent.removeChild(i);
        });
        
        onApply(temp.innerHTML);
        hideOverlay();
      };
    }
  } catch(err) {
    console.error(err);
    hideOverlay();
    alert("Erro ao conectar com a API da OpenAI. Detalhes no console.");
  }
}

var btnAiEditor = document.getElementById('btn-ai-review');
if (btnAiEditor) {
  btnAiEditor.addEventListener('click', function() {
    doAIReview(quill.root.innerHTML, function(correctedHTML) {
      quill.root.innerHTML = correctedHTML;
    });
  });
}
