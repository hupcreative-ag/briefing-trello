var BLACK_ICON = 'https://cdn.hyperdev.com/us-east-1%3A3d31b21c-01a0-4da2-8827-4bc6e88b7618%2Ficon-black.svg';

window.TrelloPowerUp.initialize({
  'card-buttons': function(t, options) {
    return [
      {
        icon: BLACK_ICON,
        text: '📝 Criar Briefing',
        callback: function(t) {
          return t.modal({
            title: 'Novo Briefing',
            url: './modal.html',
            args: { action: 'create' },
            height: 600
          });
        }
      },
      {
        icon: BLACK_ICON,
        text: '🖼️ Referências',
        callback: function(t) {
          return t.modal({
            title: 'Referências de Imagem',
            url: './gallery.html',
            height: 400
          });
        }
      }
    ];
  },
  
  // Capability 2: Card Back Section
  'card-back-section': function(t, options) {
    return {
      title: 'Informações internas',
      icon: BLACK_ICON,
      content: {
        type: 'iframe',
        url: t.signUrl('./list.html'),
        height: 150
      }
    };
  },

  // Capability 3: Card Badges
  'card-badges': function(t, options) {
    return t.get('card', 'shared', 'briefings').then(function(briefings) {
      if (briefings && briefings.length > 0) {
        return [{
          icon: BLACK_ICON,
          text: briefings.length + (briefings.length === 1 ? ' Briefing' : ' Briefings'),
          color: 'blue'
        }];
      }
      return [];
    });
  }
});
