-- DOKE: migration for anuncios extra fields (Supabase)
-- Safe to run multiple times.

alter table public.anuncios
  add column if not exists nome_doc text,
  add column if not exists cpf_cnpj text,
  add column if not exists documento text,
  add column if not exists documentoUrl text,
  add column if not exists diplomaUrl text,
  add column if not exists tags jsonb,
  add column if not exists pagamentosAceitos jsonb,
  add column if not exists agenda jsonb,
  add column if not exists perguntasFormularioJson jsonb,
  add column if not exists temFormulario boolean,
  add column if not exists experiencia text,
  add column if not exists garantia text,
  add column if not exists politicaCancelamento text,
  add column if not exists atendeEmergencia boolean,
  add column if not exists modo_atend text,
  add column if not exists tipoPreco text,
  add column if not exists preco text,
  add column if not exists categoria text,
  add column if not exists categorias text,
  add column if not exists cep text,
  add column if not exists cidade text,
  add column if not exists uf text,
  add column if not exists bairro text,
  add column if not exists whatsapp text,
  add column if not exists fotos jsonb,
  add column if not exists img text,
  add column if not exists dataCriacao timestamptz,
  add column if not exists dataAtualizacao timestamptz,
  add column if not exists nomeAutor text,
  add column if not exists fotoAutor text,
  add column if not exists userHandle text,
  add column if not exists views integer,
  add column if not exists cliques integer,
  add column if not exists mediaAvaliacao numeric,
  add column if not exists numAvaliacoes integer,
  add column if not exists ativo boolean;

-- Avaliações: vínculo com anúncio (para filtrar por serviço)
alter table public.avaliacoes
  add column if not exists anuncioId text;
