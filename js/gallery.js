var t = window.TrelloPowerUp.iframe();

var galleryContainer = document.getElementById('gallery-container');
var emptyState = document.getElementById('empty-gallery');

function renderGallery(references) {
  galleryContainer.innerHTML = '';
  if (!references || references.length === 0) {
    emptyState.classList.remove('hide');
  } else {
    emptyState.classList.add('hide');
    references.forEach(function(ref, index) {
      var item = document.createElement('div');
      item.className = 'gallery-item';
      
      var img = document.createElement('img');
      img.src = ref.url;
      img.style.cursor = 'zoom-in';
      img.onclick = function() {
        document.getElementById('viewer-img').src = ref.url;
        document.getElementById('image-viewer').classList.remove('hide');
      };
      
      var delBtn = document.createElement('button');
      delBtn.className = 'gallery-item-delete';
      delBtn.innerText = '✕';
      delBtn.onclick = function() {
        if(confirm('Excluir esta referência da galeria?')) {
          var updated = references.filter(function(_, i) { return i !== index; });
          t.set('card', 'shared', 'references', updated).then(function() {
            renderGallery(updated);
          });
        }
      };
      
      item.appendChild(img);
      item.appendChild(delBtn);
      galleryContainer.appendChild(item);
    });
  }
}

t.render(function() {
  t.get('card', 'shared', 'references').then(function(references) {
    renderGallery(references || []);
  });
});

document.getElementById('btn-save-ref').addEventListener('click', function() {
  var b = document.getElementById('btn-save-ref');
  var urlInput = document.getElementById('ref-url');
  var url = urlInput.value.trim();
  
  if (!url) return;
  
  b.disabled = true;
  b.innerText = 'Salvando...';
  
  t.get('card', 'shared', 'references').then(function(references) {
    if (!references) references = [];
    references.push({ url: url });
    return t.set('card', 'shared', 'references', references);
  }).then(function() {
    urlInput.value = '';
    b.disabled = false;
    b.innerText = 'Adicionar';
  }).catch(function(err){
    console.error(err);
    b.disabled = false;
    b.innerText = 'Adicionar';
  });
});

document.getElementById('close-viewer').addEventListener('click', function() {
  document.getElementById('image-viewer').classList.add('hide');
  document.getElementById('viewer-img').src = '';
});
