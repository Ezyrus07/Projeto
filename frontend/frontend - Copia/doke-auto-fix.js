// ============================================================
// DOKE - Script de Correção Automática de Erros
// ============================================================
// Este script corrige problemas comuns de cache, sessão e localStorage
// Adicione no <head> de cada página ANTES do script.js

(function() {
    'use strict';

    const VERSION = '20260215v10';
    console.log(`[DOKE FIX] Iniciando correções automáticas v${VERSION}`);

    // ============================================================
    // 1. LIMPAR CACHE CORROMPIDO
    // ============================================================
    function limparCacheCorrempido() {
        try {
            // Lista de chaves que podem estar corrompidas
            const chavesProblematicas = [
                'doke_usuario_perfil',
                'usuarioLogado',
                'doke_uid',
                'DOKE_SUPABASE_URL',
                'SUPABASE_URL',
                'DOKE_SUPABASE_ANON_KEY',
                'SUPABASE_ANON_KEY'
            ];

            let corrompido = false;

            // Verifica cada chave
            chavesProblematicas.forEach(chave => {
                const valor = localStorage.getItem(chave);
                if (valor === null || valor === 'null' || valor === 'undefined') {
                    localStorage.removeItem(chave);
                    corrompido = true;
                }

                // Verifica JSON inválido
                if (chave === 'doke_usuario_perfil' && valor) {
                    try {
                        const parsed = JSON.parse(valor);
                        
                        // Verifica se tem dados básicos
                        if (!parsed.nome && !parsed.user && !parsed.email) {
                            console.warn('[DOKE FIX] Perfil sem dados válidos, removendo');
                            localStorage.removeItem(chave);
                            corrompido = true;
                        }

                        // Verifica HTML injection (XSS prevention)
                        const camposTexto = ['nome', 'user', 'bio'];
                        camposTexto.forEach(campo => {
                            if (parsed[campo] && /<[^>]+>/.test(parsed[campo])) {
                                console.warn(`[DOKE FIX] HTML detectado em ${campo}, sanitizando`);
                                parsed[campo] = parsed[campo].replace(/<[^>]+>/g, '');
                                localStorage.setItem(chave, JSON.stringify(parsed));
                            }
                        });

                    } catch (e) {
                        console.error('[DOKE FIX] JSON corrompido em ' + chave, e);
                        localStorage.removeItem(chave);
                        corrompido = true;
                    }
                }
            });

            // Limpa tokens de auth de projetos antigos
            const ref = 'wgbnoqjnvhasapqarltu'; // Referência do seu projeto
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') && !key.includes(ref)) {
                    console.warn('[DOKE FIX] Token antigo detectado, removendo:', key);
                    localStorage.removeItem(key);
                    corrompido = true;
                }
            });

            if (corrompido) {
                console.log('[DOKE FIX] Cache corrompido foi limpo');
            }

            return corrompido;

        } catch (e) {
            console.error('[DOKE FIX] Erro ao limpar cache:', e);
            return false;
        }
    }

    // ============================================================
    // 2. SINCRONIZAR ESTADO DE LOGIN
    // ============================================================
    async function sincronizarEstadoLogin() {
        try {
            // Aguarda Supabase inicializar
            await aguardarSupabase();

            const sb = window.sb || window.supabaseClient;
            if (!sb) {
                console.warn('[DOKE FIX] Supabase não disponível');
                return;
            }

            // Pega sessão atual
            const { data, error } = await sb.auth.getSession();
            
            if (error) {
                console.error('[DOKE FIX] Erro ao obter sessão:', error);
                // Não limpar login automaticamente em erro transitório de sessão/rede.
                return;
            }

            const user = data?.session?.user;

            // Se tem usuário mas não tem perfil salvo
            if (user && !localStorage.getItem('doke_usuario_perfil')) {
                console.log('[DOKE FIX] Usuário logado mas sem perfil, criando...');
                
                const perfil = {
                    uid: user.id,
                    email: user.email,
                    nome: user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário',
                    user: user.user_metadata?.user || '@' + (user.email?.split('@')[0] || 'usuario'),
                    foto: user.user_metadata?.foto || ''
                };

                localStorage.setItem('doke_usuario_perfil', JSON.stringify(perfil));
                localStorage.setItem('usuarioLogado', 'true');
                localStorage.setItem('doke_uid', user.id);
                
                console.log('[DOKE FIX] Perfil criado automaticamente');
            }

            // Se não tem usuário mas está marcado como logado
            if (!user && localStorage.getItem('usuarioLogado') === 'true') {
                console.log('[DOKE FIX] Sessão ausente no momento; mantendo cache local para evitar logout falso.');
            }

        } catch (e) {
            console.error('[DOKE FIX] Erro ao sincronizar login:', e);
        }
    }

    // ============================================================
    // 3. AGUARDAR SUPABASE INICIALIZAR
    // ============================================================
    function aguardarSupabase(timeout = 3000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkInterval = setInterval(() => {
                const sb = window.sb || window.supabaseClient;
                
                if (sb && typeof sb.from === 'function') {
                    clearInterval(checkInterval);
                    resolve(sb);
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error('Timeout aguardando Supabase'));
                }
            }, 100);
        });
    }

    // ============================================================
    // 4. CORRIGIR VERSÕES DE CACHE MISTURADAS
    // ============================================================
    function corrigirVersoesCache() {
        // Força atualização adicionando timestamp
        const timestamp = Date.now();
        
        // Marca que já corrigimos nesta sessão
        const jaCorrigido = sessionStorage.getItem('doke_cache_corrigido');
        if (jaCorrigido) return;

        // Recarrega CSS e JS com cache-bust
        const links = document.querySelectorAll('link[rel="stylesheet"][href*="doke"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.includes('t=')) {
                link.setAttribute('href', href + (href.includes('?') ? '&' : '?') + 't=' + timestamp);
            }
        });

        sessionStorage.setItem('doke_cache_corrigido', 'true');
        console.log('[DOKE FIX] Versões de cache atualizadas');
    }

    // ============================================================
    // 5. ADICIONAR HANDLER GLOBAL DE ERROS
    // ============================================================
    function instalarHandlerErros() {
        // Captura erros não tratados
        window.addEventListener('error', (event) => {
            const erro = event.error || event;
            const mensagem = erro.message || erro;

            // Ignora erros conhecidos e inofensivos
            const ignorar = [
                'ResizeObserver loop',
                'Non-Error promise rejection',
                'Script error',
                'AbortError'
            ];

            if (ignorar.some(txt => mensagem.includes(txt))) {
                event.preventDefault();
                return;
            }

            // Log de erros importantes
            console.error('[DOKE ERROR]', {
                mensagem,
                arquivo: event.filename,
                linha: event.lineno,
                coluna: event.colno,
                stack: erro.stack
            });
        });

        // Captura promises rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            const erro = event.reason;
            const mensagem = String(erro?.message || erro || '').toLowerCase();

            // Ignora aborts do Supabase (são normais)
            if (mensagem.includes('aborterror') || mensagem.includes('abort')) {
                event.preventDefault();
                return;
            }

            console.error('[DOKE PROMISE ERROR]', erro);
        });
    }

    // ============================================================
    // 6. VERIFICAR SAÚDE DO SUPABASE
    // ============================================================
    async function verificarSaudeSupabase() {
        try {
            await aguardarSupabase();

            const url = window.SUPABASE_URL || window.DOKE_SUPABASE_URL;
            const key = window.SUPABASE_ANON_KEY || window.DOKE_SUPABASE_ANON_KEY;

            if (!url || !key) {
                console.error('[DOKE FIX] Supabase não configurado!');
                return false;
            }

            // Testa endpoint de health
            const response = await fetch(`${url}/auth/v1/health`, {
                headers: { 'apikey': key },
                signal: AbortSignal.timeout(3000)
            });

            const ok = response.ok;
            
            if (!ok) {
                console.error('[DOKE FIX] Supabase indisponível, status:', response.status);
            } else {
                console.log('[DOKE FIX] Supabase OK');
            }

            return ok;

        } catch (e) {
            console.error('[DOKE FIX] Erro ao verificar Supabase:', e.message);
            return false;
        }
    }

    // ============================================================
    // 7. EXECUTAR CORREÇÕES
    // ============================================================
    async function executarCorrecoes() {
        console.log('[DOKE FIX] Executando correções...');

        // 1. Limpar cache corrompido (síncrono)
        const limpou = limparCacheCorrempido();

        // 2. Instalar handlers de erro (síncrono)
        instalarHandlerErros();

        // 3. Corrigir versões de cache (síncrono)
        corrigirVersoesCache();

        // 4. Aguardar DOM carregar para operações assíncronas
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async () => {
                await verificarSaudeSupabase();
                await sincronizarEstadoLogin();
                console.log('[DOKE FIX] Correções concluídas');
            });
        } else {
            await verificarSaudeSupabase();
            await sincronizarEstadoLogin();
            console.log('[DOKE FIX] Correções concluídas');
        }
    }

    // ============================================================
    // 8. EXPOR FUNÇÃO DE RESET MANUAL
    // ============================================================
    window.dokeResetCompleto = async function() {
        if (!confirm('Isso irá limpar TODOS os dados e fazer logout. Continuar?')) {
            return;
        }

        try {
            // Faz logout do Supabase
            const sb = window.sb || window.supabaseClient;
            if (sb) {
                await sb.auth.signOut();
            }

            // Limpa localStorage
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('doke_') || key.startsWith('sb-') || key.includes('supabase')) {
                    localStorage.removeItem(key);
                }
            });

            // Limpa sessionStorage
            sessionStorage.clear();

            alert('✅ Reset completo realizado! Recarregando...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (e) {
            alert('❌ Erro ao fazer reset: ' + e.message);
        }
    };

    // ============================================================
    // INICIAR
    // ============================================================
    executarCorrecoes();

})();
