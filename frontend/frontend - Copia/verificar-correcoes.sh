#!/bin/bash

echo "============================================"
echo "🔍 VERIFICAÇÃO DE CORREÇÕES - DOKE"
echo "============================================"
echo ""

# Verifica se doke-auto-fix.js existe
if [ -f "doke-auto-fix.js" ]; then
    echo "✅ doke-auto-fix.js encontrado"
else
    echo "❌ doke-auto-fix.js NÃO encontrado"
fi

# Verifica se EXECUTAR_NO_SUPABASE.sql existe
if [ -f "EXECUTAR_NO_SUPABASE.sql" ]; then
    echo "✅ EXECUTAR_NO_SUPABASE.sql encontrado"
else
    echo "❌ EXECUTAR_NO_SUPABASE.sql NÃO encontrado"
fi

# Verifica se diagnostico-avancado.html existe
if [ -f "diagnostico-avancado.html" ]; then
    echo "✅ diagnostico-avancado.html encontrado"
else
    echo "❌ diagnostico-avancado.html NÃO encontrado"
fi

echo ""
echo "📄 Páginas HTML corrigidas:"
count=$(grep -l "doke-auto-fix.js" *.html 2>/dev/null | wc -l)
echo "   Total: $count arquivos"

if [ $count -gt 0 ]; then
    echo ""
    echo "   Exemplos:"
    grep -l "doke-auto-fix.js" *.html 2>/dev/null | head -5 | while read file; do
        echo "   ✅ $file"
    done
fi

echo ""
echo "============================================"
echo "📋 PRÓXIMOS PASSOS:"
echo "============================================"
echo "1. Execute EXECUTAR_NO_SUPABASE.sql no Supabase"
echo "2. Limpe o cache do navegador (Ctrl+Shift+Delete)"
echo "3. Abra diagnostico-avancado.html para testar"
echo ""
echo "📖 Leia README_CORRECOES.md para instruções completas"
echo "============================================"
