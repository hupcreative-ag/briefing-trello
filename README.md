# Briefing Interno - Trello Power-Up

Um Power-Up completo para o Trello que adiciona uma seção no verso dos cartões com um editor Rich Text (Quill.js) para criar briefings internos.

## Como testar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor local:
   ```bash
   npm start
   ```
   *Isto iniciará um `http-server` na porta 8080 e ativará o CORS corretamente.*

3. Adicione um Power-Up Customizado no Trello:
   - Acesse [Trello Power-Ups Admin](https://trello.com/power-ups/admin)
   - Crie um novo Power-Up (Custom Power-Up).
   - Defina o "Iframe connector URL" como `http://localhost:8080/index.html`.
   - Adicione o Power-Up na sua Workspace.
   - Entre em um quadro da workspace para testar.

## Como preparar para produção (Vercel)

1. Crie uma conta no [Vercel](https://vercel.com).
2. Instale a CLI do Vercel caso deseje realizar o deploy por linha de comando (`npm i -g vercel`), ou faça o deploy pelo repositório GitHub conectando ao Vercel.
3. Usando CLI, no diretório principal:
   ```bash
   vercel
   ```
4. Após o deploy, a Vercel gerará uma URL como `https://meu-briefing-powerup.vercel.app`.
5. Volte para o [Painel do Trello e atualize o URL do Iframe do Conector](https://trello.com/power-ups/admin) para apontar para a nova URL da Vercel (ex: `https://meu-briefing-powerup.vercel.app/index.html`). Nessas condições hospedadas de produção, todas as informações devem carregar corretamente sobre SSL (https).

## Funcionalidades

- **Visualização em card-back-section**: Os conteúdos do briefing ficam visíveis.
- **Botões do cartão (card-buttons)**: Onde você edita o texto do briefing com a interface do editor rico.
- **Selos no cartão (card-badges)**: Mostra se aquele cartão contém ou não um briefing.
