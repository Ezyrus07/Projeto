# Diff do HTML legado reaproveitado na migração nativa

Este diff compara o bloco principal de `notificacoes.html` com o template nativo usado pelo módulo `app-v2/pages/notifications.js`.

## O que foi preservado

- Estrutura visual base de hero, resumo, lista e estado vazio.
- IDs reaproveitados: `badge-count`, `summary-total`, `summary-unread`, `summary-24h`, `lista-notificacoes`, `empty-state`, `notif-settings-modal`.
- Classes-chave reaproveitadas para continuidade visual: `notif-container`, `notif-hero-container`, `hero-content`, `hero-actions`, `notif-summary`, `summary-card`, `notif-settings-modal`, `settings-card`.

## O que mudou na migração

- `onclick` inline foi removido e substituído por eventos no JS nativo do módulo.
- `bottom-nav` legado não é mais renderizado dentro da página; a navegação móvel passa a ser a shell real do `app-v2`.
- Foi adicionado toolbar nativo com filtros e busca, que a página legada estilava mas não renderizava no markup principal.
- A modal de ajustes virou componente controlado por estado local, com persistência simples em `localStorage`.

## Unified diff

```diff
--- legacy:notificacoes.html <main>
+++ native:app-v2/pages/notifications.template.html
@@ -1,34 +1,92 @@
 <div class="notif-container">
-<div class="notif-hero-container">
-<div class="hero-content">
-<h1>Notificações <span class="badge-count" id="badge-count" style="display:none;">0</span></h1>
-<p>Acompanhe atualizações sobre seus pedidos e pagamentos.</p>
+  <section class="notif-hero-container">
+    <div class="hero-content">
+      <h1>Notificações <span class="badge-count" id="badge-count" style="display:none;">0</span></h1>
+      <p>Acompanhe atualizações sobre pedidos, pagamentos e interações em um fluxo único.</p>
+    </div>
+    <div class="hero-actions">
+      <button class="btn-hero-action" type="button" data-action="mark-all-read"><i class="bx bx-check-double"></i> Marcar tudo como lido</button>
+      <button class="btn-hero-action" type="button" data-action="open-settings"><i class="bx bx-cog"></i> Ajustes</button>
+    </div>
+  </section>
+
+  <section class="notif-summary" aria-label="Resumo das notificações">
+    <article class="summary-card">
+      <span>Total</span>
+      <strong id="summary-total">0</strong>
+    </article>
+    <article class="summary-card">
+      <span>Não lidas</span>
+      <strong id="summary-unread">0</strong>
+    </article>
+    <article class="summary-card">
+      <span>24 horas</span>
+      <strong id="summary-24h">0</strong>
+    </article>
+  </section>
+
+  <section class="notif-toolbar" aria-label="Filtros e busca">
+    <div class="filters-scroll" role="tablist" aria-label="Filtrar notificações">
+      <button class="filter-chip active" type="button" data-filter="todas" aria-pressed="true">Todas</button>
+      <button class="filter-chip" type="button" data-filter="pedidos" aria-pressed="false">Pedidos</button>
+      <button class="filter-chip" type="button" data-filter="financeiro" aria-pressed="false" id="filtro-financeiro">Financeiro</button>
+      <button class="filter-chip" type="button" data-filter="social" aria-pressed="false">Interações</button>
+    </div>
+    <label class="notif-search" for="notif-search">
+      <i class="bx bx-search"></i>
+      <input id="notif-search" type="search" placeholder="Buscar por título, descrição ou pessoa" autocomplete="off">
+    </label>
+  </section>
+
+  <section id="lista-notificacoes" aria-live="polite">
+    <div class="notif-loading" role="status" aria-live="polite">
+      <i class="bx bx-loader-alt bx-spin"></i>
+      <p>Buscando atualizações...</p>
+    </div>
+    <div class="notif-skeleton-list" aria-hidden="true">
+      <div class="notif-skeleton-card"></div>
+      <div class="notif-skeleton-card"></div>
+      <div class="notif-skeleton-card"></div>
+    </div>
+  </section>
+
+  <section class="empty-state" id="empty-state" hidden>
+    <i class="bx bx-bell-off"></i>
+    <h3>Tudo limpo por aqui!</h3>
+    <p>Você não tem novas notificações no momento.</p>
+  </section>
 </div>
-<div class="hero-actions">
-<button class="btn-hero-action" onclick="marcarTodasLidas()"><i class="bx bx-check-double"></i> Limpar Avisos</button>
-<button class="btn-hero-action" onclick="abrirAjustesNotif()" type="button"><i class="bx bx-cog"></i> Ajustes</button>
+
+<div class="notif-settings-modal" id="notif-settings-modal" aria-hidden="true">
+  <div class="settings-card" role="dialog" aria-modal="true" aria-labelledby="notif-settings-title">
+    <div class="settings-header">
+      <div>
+        <h3 id="notif-settings-title">Ajustes rápidos</h3>
+        <p>Escolha como você prefere receber alertas.</p>
+      </div>
+      <button class="settings-close" type="button" data-action="close-settings" aria-label="Fechar ajustes">×</button>
+    </div>
+    <div class="settings-grid">
+      <label class="setting-item">
+        <span>Som de notificação</span>
+        <input type="checkbox" data-setting="sound" checked>
+      </label>
+      <label class="setting-item">
+        <span>Vibração no celular</span>
+        <input type="checkbox" data-setting="vibration" checked>
+      </label>
+      <label class="setting-item">
+        <span>Resumo diário</span>
+        <input type="checkbox" data-setting="dailyDigest">
+      </label>
+      <label class="setting-item">
+        <span>Silenciar mensagens</span>
+        <input type="checkbox" data-setting="muteMessages">
+      </label>
+    </div>
+    <div class="settings-row">
+      <button class="settings-btn" type="button" data-action="manage-channels">Gerenciar canais</button>
+      <button class="settings-btn ghost" type="button" data-action="snooze">Silenciar 1 hora</button>
+    </div>
+  </div>
 </div>
-</div>
-<div class="notif-summary">
-<div class="summary-card">
-<span>Total</span>
-<strong id="summary-total">0</strong>
-</div>
-<div class="summary-card">
-<span>Não lidas</span>
-<strong id="summary-unread">0</strong>
-</div>
-<div class="summary-card">
-<span>24 horas</span>
-<strong id="summary-24h">0</strong>
-</div>
-</div>
-<div id="lista-notificacoes">
-<div style="text-align:center; padding:40px; color:#999;"><i class="bx bx-loader-alt bx-spin" style="font-size:2rem;"></i><p>Buscando atualizações...</p></div>
-</div>
-<div class="empty-state" id="empty-state">
-<i class="bx bx-bell-off"></i>
-<h3>Tudo limpo por aqui!</h3>
-<p>Você não tem novas notificações no momento.</p>
-</div>
-</div>
```
