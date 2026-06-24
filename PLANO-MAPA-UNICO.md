# Plano — Mapa único + botão "+" e menu de contexto no clique

## O que muda (resumo)

Hoje a coluna central tem 3 cenas de mapa fixas (`scenes[]`, `maxScenes = 3`). A proposta é:

1. **Começar com 1 mapa** e um botão **"+"** logo abaixo dele.
2. Ao clicar no "+", o usuário escolhe adicionar **outro mapa** (mais/menos zoom, mesmo centroide do anterior por padrão, ou nova lat/long) **ou uma imagem** (para mostrar algo que aconteceu no local).
3. Blocos de mapa e imagem podem se intercalar livremente (mapa → imagem → mapa…), **máx. 3–4 blocos**.
4. **Clicar numa área livre do mapa** abre um menu de contexto: inserir texto, desenho, imagem ou ícone — preso à lat/long clicada.
5. Os painéis da esquerda e da direita continuam funcionando como hoje (a mudança é aditiva).

## Decisões de arquitetura

- **De "cenas" para "blocos".** A coluna central passa a ser uma lista ordenada de blocos, cada um com `type: 'map' | 'image'`. O array `scenes[]` atual já é a base — ganha o campo `type` e deixa de ter teto fixo de 3 (passa a um limite configurável, ex.: `maxBlocks = 4`).
- **Sem virtualização.** Com 3–4 blocos não há risco de estourar o limite de contextos WebGL do navegador; os mapas continuam "vivos".
- **Herança de centroide já existe** no código (cena 2+ herda o centro da anterior) — só precisa ser preservada na nova lógica de "adicionar mapa".
- **Anotações já amarram a lat/long** (`editorialLabels`: texto, símbolo, imagem/PNG). O menu de contexto reusa essas funções, não cria do zero.
- **Compatibilidade.** Subir `version` no estado salvo e migrar peças antigas (`version: 1`, sem `type`) tratando toda cena como `type: 'map'`.

## Modelo de dados (novo)

```js
// cada item da coluna central
{
  id, type: 'map' | 'image', height,

  // se type === 'map' (campos atuais)
  view: { lng, lat, zoom, bearing, pitch },
  marker, markerSource, markerStyle, markerLabel,
  showMapLabels, showDrawings, showShapes,
  editorialLabels: [ { id, lng, lat, text, symbol, imageData, textPosition, offsetX, offsetY } ],
  locator: { ... },

  // se type === 'image' (novo)
  imageData,        // dataURL
  imageFit,         // 'cover' | 'contain'
  caption           // legenda opcional
}
```

## Fases

### Fase 1 — Blocos dinâmicos de mapa (sem imagem ainda)
- Generalizar o que está fixo em 3: `maxScenes`, o zoom progressivo `[null, 12, 14.5]` (virar função/derivação por índice), e os selects de 1–3 cenas da interface.
- Trocar a inicialização para **1 bloco** e adicionar o botão **"+"** abaixo do último bloco → cria mapa novo herdando centroide do anterior.
- Botão de remover bloco e reordenar (subir/descer) — útil com a intercalação.
- Garantir que `serializeState` / `applyState` percorram a lista dinâmica (já percorrem o array; ajustar contagens).
- *Arquivos:* `app.js` (`createScene`/loop de init, `serializeState`, `applyState`, `sceneDetailZoom`), `index.html` (botão "+", remover selects fixos), `styles.css`.

### Fase 2 — Bloco de imagem intercalável
- No menu do "+", oferecer **Imagem** além de **Mapa**.
- Render do bloco imagem na preview e no **export canvas** (`renderPieceCanvas` desenha o mapa hoje; adicionar ramo para `type === 'image'`).
- Upload/seleção de imagem reusando o fluxo de PNG já existente.
- *Arquivos:* `app.js` (render/preview e `renderPieceCanvas`/`prepareForRender`), `index.html`, `styles.css`.

### Fase 3 — Menu de contexto no clique do mapa
- Ao clicar em área livre, abrir menu no ponto clicado: **Texto · Desenho · Imagem · Ícone**.
- Cada opção chama a função correspondente já existente, passando a `lngLat`: `addEditorialLabelToActiveScene` (texto/ícone/imagem), iniciar desenho de linha, etc.
- Reorganiza o `map.on('click')` atual (que hoje depende de modo pré-selecionado no painel) para abrir o menu quando nenhum modo estiver ativo — **sem remover** os fluxos dos painéis.
- *Arquivos:* `app.js` (handler de clique, novo componente de menu), `index.html`, `styles.css`.

### Fase 4 — Compatibilidade, salvar/carregar e verificação
- Migração de peças antigas no `applyState`.
- Testar: criar 4 blocos mistos, mover, remover, salvar, recarregar, exportar JPG.
- Conferir herança de centroide e zoom +/− por bloco.

## Pontos de atenção
- **Export:** a imagem final continua com 650px de largura e altura somando os blocos visíveis — já é dinâmico, só precisa contar blocos de imagem também.
- **Migração:** peças salvas antes da mudança não podem quebrar — daí a versão + fallback `type: 'map'`.
- **Ordem dos blocos:** com intercalação, garantir que reordenar atualize tanto a preview quanto o export.

## Decisões fechadas
- **Limite de blocos: 4.**
- **Bloco de imagem:** imagem com legenda **e** com suporte a anotações por cima (texto/ícone/desenho). Como a imagem não tem projeção geográfica, as anotações ancoram numa **posição relativa (em %)** da imagem — não em lat/long —, mantendo o lugar ao redimensionar.
- **Botão "+":** abre um menu com as opções **Mapa** e **Imagem**.
