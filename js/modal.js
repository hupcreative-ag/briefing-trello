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

      var btnReadMore = document.createElement('a');
      btnReadMore.innerText = 'Ler tudo';
      btnReadMore.style.display = 'inline-block';
      btnReadMore.style.fontSize = '12px';
      btnReadMore.style.cursor = 'pointer';
      btnReadMore.style.color = '#0079bf';
      btnReadMore.style.marginTop = '4px';
      btnReadMore.style.marginRight = '12px';
      btnReadMore.onclick = function() {
        if (histContent.style.maxHeight === '80px') {
          histContent.style.maxHeight = '300px';
          histContent.style.overflowY = 'auto';
          fade.style.display = 'none';
          btnReadMore.innerText = 'Ocultar texto';
        } else {
          histContent.style.maxHeight = '80px';
          histContent.style.overflowY = 'hidden';
          histContent.scrollTop = 0;
          fade.style.display = 'block';
          btnReadMore.innerText = 'Ler tudo';
        }
      };
      
      var actionGroup = document.createElement('div');
      actionGroup.style.display = 'flex';
      actionGroup.style.gap = '8px';
      actionGroup.style.marginTop = '12px';

      var btnRestore = document.createElement('button');
      btnRestore.className = 'mod-primary';
      btnRestore.style.padding = '4px 8px';
      btnRestore.innerText = '✨ Restaurar esta versão';
      btnRestore.onclick = function() { restoreVersion(idx); };
      
      var btnDeleteHist = document.createElement('button');
      btnDeleteHist.className = 'mod-danger';
      btnDeleteHist.style.padding = '4px 8px';
      btnDeleteHist.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="vertical-align: middle;"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg>';
      btnDeleteHist.title = 'Apagar versão';
      btnDeleteHist.onclick = function() { deleteVersion(idx); };

      actionGroup.appendChild(btnRestore);
      actionGroup.appendChild(btnDeleteHist);
      
      item.appendChild(histMeta);
      item.appendChild(histContent);
      item.appendChild(btnReadMore);
      item.appendChild(actionGroup);
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
      window.loadBriefings(t).then(function(briefings) {
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
           
           b.versions[versionIndex] = oldVersion;
           
           currentBriefing = b;
           return window.saveBriefings(t, briefings);
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

function deleteVersion(versionIndex) {
  if (confirm('Tem certeza que deseja apagar permanentemente esta versão do histórico?')) {
    window.loadBriefings(t).then(function(briefings) {
       if (!briefings) briefings = [];
       var idx = briefings.findIndex(function(b) { return b.id === currentBriefing.id; });
       if (idx !== -1) {
         var b = briefings[idx];
         b.versions.splice(versionIndex, 1);
         currentBriefing = b;
         return window.saveBriefings(t, briefings);
       }
    }).then(function() {
       renderView();
    }).catch(function(err){
       console.error(err);
       alert('Erro ao apagar a versão.');
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
    window.loadBriefings(t).then(function(briefings) {
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
    window.loadBriefings(t).then(function(briefings) {
      if (!briefings) briefings = [];
      var newBriefings = briefings.filter(function(b) { return b.id !== currentBriefing.id; });
      return window.saveBriefings(t, newBriefings);
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
  var newContent = quill.root.innerHTML.replace(/<img[^>]*>/gi, '');
  
  t.member('fullName').then(function(member) {
    window.loadBriefings(t).then(function(briefings) {
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
          if (briefings[idx].versions.length === 0) {
            briefings[idx].versions.push(oldVersion);
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
      
      return window.saveBriefings(t, briefings);
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
            <span style="font-size:24px; margin-right:8px; animation: wobble 2s ease-in-out infinite;">🧐</span>
            Revisão Atenta: Detalhes Encontrados
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
        
        <button id="ai-btn-toggle-corrections" class="mod-secondary" style="display: none; margin-bottom: 16px; font-size: 12px; align-items: center; gap: 4px;">
          Mostrar correções
          <svg id="ai-toggle-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div id="ai-corrections-list" style="display: none; flex-direction: column; margin-bottom: 16px; max-height: 250px; overflow-y: auto; background: #fff; border: 1px solid #dfe1e6; border-radius: 4px; padding: 0;"></div>

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
          <div class="ai-success-icon" style="font-size:32px; animation: popup-bounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);">🎉</div>
          <div>
            <h4 style="margin:0 0 8px 0; font-size:18px; color:#006644;">Texto 100% Validado!</h4>
            <p style="margin:0; color:#006644;">Excelente copy! Nenhuma correção ortográfica ou gramatical encontrada.</p>
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
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Você é um revisor ortográfico especializado em textos de agência de comunicação, escritos em português do Brasil.\n\nCorrija apenas:\n1. Espaço inserido no meio de uma palavra, quebrando-a incorretamente\n2. Palavras em português com letras trocadas, faltando ou sobrando\n3. Palavras duplicadas acidentalmente\n4. Acentuação incorreta em palavras comuns em português\n5. Pontuação apenas em trechos de texto corrido e denso, nunca em frases curtas, fragmentos ou estruturas de copy\n6. Concordância apenas quando o erro for entre sujeito e verbo ou entre substantivo e adjetivo de forma inequívoca, e nunca quando a construção for típica de linguagem coloquial ou informal\n7. Palavras que não existem no português brasileiro — se uma palavra não for reconhecível como existente no idioma, nem como nome próprio, marca, termo técnico ou palavra em outro idioma, sinalize como erro mesmo que tenha aparência plausível de palavra portuguesa\n8. Verbos inventados formados por sufixos adicionados incorretamente a substantivos, como transformar um substantivo em verbo inexistente\n\nNunca corrija:\n- Palavras ou expressões em inglês ou qualquer outro idioma\n- Nomes de marcas, produtos, ingredientes ou termos técnicos\n- Maiúsculas ou minúsculas em substantivos comuns\n- Estrutura de frases e sintaxe\n- Frases curtas, fragmentos ou escolhas estilísticas de copy\n- Palavras informais como pra, tá, né, tô, num\n- Espaços extras entre palavras distintas ou antes de pontuação\n- Concordância em construções coloquiais intencionais\n\nNunca adicione, remova ou substitua palavras além do mínimo necessário para corrigir o erro identificado.\nNunca modifique atributos HTML, classes, URLs ou estrutura das tags.\nTrabalhe apenas no conteúdo textual dentro das tags.\nEnvolva o texto REMOVIDO com <del> e o ADICIONADO com <ins>.\n\nRetorne EXATAMENTE um JSON com três chaves:\n- has_errors: true se encontrou erros, false se não\n- diff_html: o HTML completo com as marcações de diff aplicadas\n- corrections: array de objetos com { original, corrigido, motivo } listando cada correção. Se não houver erros, retorne array vazio." },
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
    
    // Passo 2: Validador
    if (result.corrections && result.corrections.length > 0) {
      var response2 = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
        body: JSON.stringify({
          model: "gpt-4.1-nano",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Você é um validador de revisão ortográfica para textos de agência de comunicação em português do Brasil.\n\nVocê vai receber o texto original e uma lista de correções sugeridas por um revisor. Analise cada correção e decida se é legítima.\n\nRejeite correções que envolvam:\n- Palavras ou expressões em inglês ou outro idioma usadas intencionalmente\n- Nomes de marcas, produtos ou termos técnicos\n- Mudanças de maiúscula para minúscula ou vice-versa em substantivos comuns\n- Escolhas estilísticas de copy como frases curtas ou fragmentos\n- Sintaxe ou estrutura de frase\n- Espaços extras entre palavras distintas ou antes de pontuação\n- Concordância em construções coloquiais ou informais intencionais\n\nAprove apenas correções de:\n- Espaço inserido no meio de uma palavra, quebrando-a incorretamente\n- Erros evidentes de digitação ou grafia incorreta em português\n- Acentuação errada em palavras comuns\n- Concordância inequivocamente errada entre sujeito e verbo ou entre substantivo e adjetivo em contexto formal\n- Palavras que não existem no português brasileiro e não são nomes próprios, marcas ou termos técnicos reconhecíveis\n\nRetorne EXATAMENTE um JSON com:\n- approved_corrections: array com apenas os objetos aprovados no formato { original, corrigido, motivo }\n- has_errors: true se approved_corrections tiver ao menos um item, false se não" },
            { role: "user", content: JSON.stringify({ original_text: textHtml, corrections: result.corrections }) }
          ],
          temperature: 0.1
        })
      });

      if (response2.ok) {
        var data2 = await response2.json();
        var result2 = JSON.parse(data2.choices[0].message.content);
        
        // Strip rejected corrections from diff_html
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = result.diff_html;
        var dels = Array.from(tempDiv.querySelectorAll('del'));
        dels.forEach(function(d) {
           var ins = d.nextElementSibling;
           if (ins && ins.tagName.toLowerCase() === 'ins') {
               var isApproved = (result2.approved_corrections || []).find(function(c) {
                   return c.original.trim() === d.textContent.trim() && 
                          c.corrigido.trim() === ins.textContent.trim();
               });
               if (!isApproved) {
                   var text = document.createTextNode(d.innerHTML);
                   d.parentNode.insertBefore(text, d);
                   d.parentNode.removeChild(d);
                   ins.parentNode.removeChild(ins);
               }
           }
        });
        
        result.corrections = result2.approved_corrections || [];
        result.has_errors = result.corrections.length > 0;
        result.diff_html = tempDiv.innerHTML;
      }
    }
    
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
      
      var btnToggle = overlay.querySelector('#ai-btn-toggle-corrections');
      var listCorrections = overlay.querySelector('#ai-corrections-list');
      
      if (result.corrections && result.corrections.length > 0) {
        btnToggle.style.display = 'flex';
        listCorrections.innerHTML = '';
        result.corrections.forEach(function(c, i) {
           var item = document.createElement('div');
           item.style.padding = '12px';
           if (i < result.corrections.length - 1) item.style.borderBottom = '1px solid #ebecf0';
           item.style.fontSize = '13px';
           item.innerHTML = '<div style="margin-bottom: 6px; line-height: 1.4;">' +
             '<del style="color: #eb5a46; background-color: #ffebe6; padding: 2px 4px; border-radius: 3px;">' + c.original + '</del>' +
             ' <span style="color: #5e6c84; font-weight: bold; margin: 0 4px;">&rarr;</span> ' +
             '<ins style="color: #006644; background-color: #e3fcef; font-weight: 600; padding: 2px 4px; border-radius: 3px; text-decoration: none;">' + c.corrigido + '</ins>' +
             '</div>' +
             '<div style="font-size: 11.5px; color: #5e6c84; margin-top: 4px;">' + c.motivo + '</div>';
           listCorrections.appendChild(item);
        });
        
        btnToggle.onclick = function() {
           if (listCorrections.style.display === 'none') {
             listCorrections.style.display = 'flex';
             btnToggle.innerHTML = 'Ocultar correções <svg id="ai-toggle-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(180deg); transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>';
           } else {
             listCorrections.style.display = 'none';
             btnToggle.innerHTML = 'Mostrar correções <svg id="ai-toggle-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>';
           }
        };
      } else {
        btnToggle.style.display = 'none';
      }
      
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

var btnAi = document.getElementById('btn-ai-review');
if (btnAi) {
  btnAi.addEventListener('click', function() {
    if (!currentBriefing || !currentBriefing.content) return;
    doAIReview(currentBriefing.content, function(correctedHTML) {
      t.member('fullName').then(function(member) {
        window.loadBriefings(t).then(function(briefings) {
          if (!briefings) briefings = [];
          var now = new Date().toLocaleString('pt-BR');
          var authorName = member ? member.fullName : 'IA (Revisão)';

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
            briefings[idx].content = correctedHTML;
            briefings[idx].updatedAt = now;
            briefings[idx].updatedBy = authorName;
            currentBriefing = briefings[idx];
            
            return window.saveBriefings(t, briefings);
          }
        }).then(function() {
          renderView();
        });
      });
    });
  });
}
