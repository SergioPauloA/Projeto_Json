/***********************************************************************************************************
 * Projeto JSON — Gerenciador Automático de Fundos de Investimento — Banestes
 * Desenvolvedor: spandrade@banestes.com.br
 *
 * Descrição: Lê automaticamente os dados das abas "Inicial", "PodeSimular", "TaxaNova" e "COAFI",
 *            gera o JSON atualizado dos fundos e o script SQL para o mainframe, e envia ambos
 *            por e-mail — sem nenhuma interação manual necessária.
 *            A aba "Log_Envios" e a página web (doGet) funcionam como painel de monitoramento.
 *
 * Arquivos: Code.gs (este arquivo) + Sidebar.html (painel de log/status)
 ***********************************************************************************************************/

// ============================================================
// CONFIGURAÇÕES GLOBAIS
// ============================================================
var CONFIG = {
  DEVELOPER_EMAIL: 'spandrade@banestes.com.br',

  // Analistas — descomentar após validação:
  // ANALYST_EMAILS: ['iodutra@banestes.com.br', 'jcrepossi@banestes.com.br'],

  // Abas da planilha
  SHEET_INICIAL:   'Inicial',
  SHEET_PODE_SIM:  'PodeSimular',
  SHEET_TAXA_NOVA: 'TaxaNova',
  SHEET_COAFI:     'COAFI',
  SHEET_LOG:       'Log_Envios',
  SHEET_FUNDS:     'Fundos',        // aba de fallback com dados estruturados

  // Chaves do PropertiesService
  PROP_LAST_UPDATE:     'LAST_UPDATE',
  PROP_LAST_HASH:       'LAST_HASH',
  PROP_LAST_JSON:       'LAST_JSON',
  PROP_LAST_SQL:        'LAST_SQL',
  PROP_LAST_RECIPIENTS: 'LAST_RECIPIENTS',
  PROP_LAST_STATUS:     'LAST_STATUS',
  PROP_LAST_RUN:        'LAST_RUN',

  MAX_PROPERTY_LENGTH: 8500,
  DEBOUNCE_MINUTES: 30,   // evita processamentos duplicados pelo acionador onChange
};

// Mapeamento de risco para código numérico (SQL: FNDCLSRISC)
var RISCO_CODIGO = {
  'Muito Baixo': 0,
  'Baixo':       1,
  'Médio':       2,
  'Alto':        3,
};

// Fundos que NUNCA simulam, independentemente da data de início.
// Corresponde às células com "Não" fixo na col D da aba PodeSimular do sistema original.
var FUNDO_SEMPRE_NAO = {
  'invest_investpublic':                            true,
  'invest_investidor':                              true,
  'invest_previdenciario':                          true,
  'banestes_tesouro_fi_renda_fixa_referenciado_di': true,
  'invest_solidez':                                 true,
  'invest_referencial':                             true,
  'invest_funses':                                  true,
  'invest_soberano':                                true,
  'invest_tenax':                                   true,
  'invest_Synergy':                                 true,
};

// Mapeamento: ID do fundo → nome exato na col B da aba COAFI (para buscar DATA_INICIO)
var FUND_ID_TO_COAFI_INICIO = {
  'invest_investpublic':                            'Banestes Invest Public Automático FI',
  'invest_investmoney':                             'Banestes Invest Money FI RF',
  'invest_investidor':                              'Banestes Investidor Automático FI',
  'invest-vitoria-500':                             'Banestes Vitória 500 FIC RF DI',
  'invest_vipdi':                                   'Banestes Vip Di FIC RF DI',
  'invest_institucional':                           'Banestes Institucional FI RF',
  'invest_previdenciario':                          'Banestes IMA-B Títulos Públicos FI RF',
  'banestes_tesouro_fi_renda_fixa_referenciado_di': 'Banestes Tesouro FI RF DI',
  'invest_solidez':                                 'Banestes Solidez Automático FI',
  'invest_btg_pactual_absoluto':                    'Banestes BTG Pactual Inst. Absoluto',
  'invest-valores':                                 'Banestes Valores FIC RF DI',
  'invest_liquidez_referenciado':                   'Banestes Liquidez FI RF REF DI',
  'invest_referencial':                             'Banestes IRF-M 1Títulos Públicos RF',
  'invest_debentures':                              'Banestes Infraestrutura FIC RF Cred Priv',
  'invest-estrategia':                              'Banestes Estratégia FI RF',
  'invest_dividendos':                              'Banestes Dividendos FIC de FI',
  'invest_funses':                                  'Banestes Funses FI',
  'invest_facil':                                   'Banestes Invest Fácil FI RF Simples',
  'invest_cred_corp':                               'Banestes Credito Corporativo I FIC RF Cred Priv LP',
  'invest_ima-b5':                                  'Banestes IMA-B5 Títulos Públicos FI RF LP',
  'invest_multiestrategia':                         'Banestes Multiestrategia FIC Multimercado',
  'invest_selection':                               'Banestes Selection FI RF Cred Priv',
  'invest_fundo_reserva_climatica':                 'Banestes Reserva Climática FIF RF DI Resp. Ltda.',
  'invest_soberano':                                'Banestes Soberano FIF RF Simples Resp. Ltda.',
  'invest_tenax':                                   'Banestes Tenax Ações FIF Em Cotas De Fundo de Investimento Em Ações Resp. Ltda.',
  'invest_Synergy':                                 'BANESTES SYNERGY LONG ONLY FIF EM COTAS DE FUNDOS DE INVESTIMENTO EM AÇÕES RESP. Ltda.',
};

// Mapeamento: ID do fundo → nome curto na col B da aba COAFI (para buscar TAXA_NOVA na col AR)
var FUND_ID_TO_COAFI_TAXA = {
  'invest_btg_pactual_absoluto':                    'Absoluto',
  'invest_cred_corp':                               'Credito Corporativo I',
  'invest_dividendos':                              'Dividendos',
  'invest-estrategia':                              'Estratégia',
  'invest_debentures':                              'Infraestrutura',
  'invest_funses':                                  'Funses',
  'invest_ima-b5':                                  'IMA-B5 Títulos Públicos',
  'invest_previdenciario':                          'IMA-B Títulos Públicos',
  'invest_institucional':                           'Institucional',
  'invest_facil':                                   'Fácil',
  'invest_investmoney':                             'Money',
  'invest_investpublic':                            'Public',
  'invest_investidor':                              'Investidor',
  'invest_liquidez_referenciado':                   'Liquidez',
  'invest_multiestrategia':                         'Multiestrategia',
  'invest_referencial':                             'IRF-M 1 Títulos Públicos',
  'invest_fundo_reserva_climatica':                 'Reserva',
  'invest_selection':                               'Selection',
  'invest_soberano':                                'Soberano',
  'invest_solidez':                                 'Solidez',
  'invest_Synergy':                                 'Synergy',
  'invest_tenax':                                   'Tenax',
  'banestes_tesouro_fi_renda_fixa_referenciado_di': 'Tesouro',
  'invest_vipdi':                                   'Vip Di',
  'invest-valores':                                 'Valores',
  'invest-vitoria-500':                             'Vitória 500',
};

// ============================================================
// DADOS ESTÁTICOS DOS FUNDOS
// Chaveado pelo ID da Aba "Inicial" coluna B.
// FNDCD = 0 indica que o código ainda precisa ser confirmado via GEART/COAFI.
// ============================================================
var FUND_DATA = {
  'invest_btg_pactual_absoluto': {
    FNDCD: 15, NOME: 'Banestes BTG Pactual Absoluto Institucional FIC de FIF de Ações RL',
    FNDCTFND: 'Ações', FNDCLSRISC: 'Alto',
    FNDCLSCVM: 'Ações', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Ações Ativos Livre', FNDCOTDIAUTIL: 'N',
  },
  'invest_cred_corp': {
    FNDCD: 32, NOME: 'Banestes Crédito Corporativo I FIC de FI RF Crédito Privado LP RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Alto',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Crédito Privado Longo Prazo',
    FNDTOAMB: 'Renda Fixa Duração Livre Crédito Livre', FNDCOTDIAUTIL: 'N',
  },
  'invest_dividendos': {
    FNDCD: 24, NOME: 'Banestes Dividendos FIC de FIF de Ações RL',
    FNDCTFND: 'Ações', FNDCLSRISC: 'Alto',
    FNDCLSCVM: 'Ações', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Ações Ativo Dividendos', FNDCOTDIAUTIL: 'S',
  },
  'invest-estrategia': {
    FNDCD: 23, NOME: 'Banestes Estratégia FIC de FIF Renda Fixa RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Médio',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Renda Fixa Duração Livre Grau de Investimento', FNDCOTDIAUTIL: 'S',
  },
  'invest_debentures': {
    FNDCD: 22, NOME: 'Banestes FIC de FIF Incentivados de Investimento em Infraestrutura RF CP RL',
    FNDCTFND: 'Renda Fixa (Fundo de Infraestrutura)', FNDCLSRISC: 'Alto',
    FNDCLSCVM: 'Renda Fixa (Fundo de Infraestrutura)', FNDSUBCVM: 'Crédito Privado',
    FNDTOAMB: 'Renda Fixa Duração Livre Crédito Livre', FNDCOTDIAUTIL: 'S',
  },
  'invest_funses': {
    FNDCD: 0, NOME: 'Banestes FUNSES Multimercado RL',
    FNDCTFND: 'Multimercado', FNDCLSRISC: 'Alto',
    FNDCLSCVM: 'Multimercado', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Multimercado Estratégia Livre', FNDCOTDIAUTIL: 'N',
  },
  'invest_ima-b5': {
    FNDCD: 31, NOME: 'Banestes IMA-B 5 Títulos Públicos FI Renda Fixa LP RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Médio',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Longo Prazo',
    FNDTOAMB: 'Renda Fixa Duração Livre Soberano', FNDCOTDIAUTIL: 'N',
  },
  'invest_previdenciario': {
    FNDCD: 0, NOME: 'Banestes IMA-B Títulos Públicos FIF Renda Fixa RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Médio',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Renda Fixa Duração Alta Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest_institucional': {
    FNDCD: 8, NOME: 'Banestes Institucional FIF Renda Fixa RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Médio',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Renda Fixa Duração Alta Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest_facil': {
    FNDCD: 28, NOME: 'Banestes Invest Fácil Fundo de Investimento Renda Fixa Simples RL',
    FNDCTFND: 'Renda Fixa Simples', FNDCLSRISC: 'Muito Baixo',
    FNDCLSCVM: 'Renda Fixa Simples', FNDSUBCVM: 'Renda Fixa Simples',
    FNDTOAMB: 'Renda Fixa Simples', FNDCOTDIAUTIL: 'N',
  },
  'invest_investmoney': {
    FNDCD: 2, NOME: 'Banestes Invest Money FIF Renda Fixa RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Baixo',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Renda Fixa Duração Baixa Soberano', FNDCOTDIAUTIL: 'N',
  },
  'invest_investpublic': {
    FNDCD: 0, NOME: 'Banestes Invest Public Automático FIF CP RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Alto',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Crédito Privado',
    FNDTOAMB: 'Renda Fixa Duração Livre Crédito Livre', FNDCOTDIAUTIL: 'N',
  },
  'invest_investidor': {
    FNDCD: 0, NOME: 'Banestes Investidor Automático FIF Renda Fixa CP RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Baixo',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Crédito Privado',
    FNDTOAMB: 'Renda Fixa Duração Baixa Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest_liquidez_referenciado': {
    FNDCD: 18, NOME: 'Banestes Liquidez FIF Renda Fixa Referenciado DI RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Baixo',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Referenciado DI',
    FNDTOAMB: 'Renda Fixa Duração Baixa Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest_multiestrategia': {
    FNDCD: 33, NOME: 'Banestes Multiestratégia FIC de FIF Multimercado RL',
    FNDCTFND: 'Multimercado', FNDCLSRISC: 'Alto',
    FNDCLSCVM: 'Multimercado', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Multimercado Estratégia Livre', FNDCOTDIAUTIL: 'S',
  },
  'invest_referencial': {
    FNDCD: 0, NOME: 'Banestes IRF-M 1 Títulos Públicos FIF Renda Fixa RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Médio',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Renda Fixa Duração Alta Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest_fundo_reserva_climatica': {
    FNDCD: 0, NOME: 'Banestes Reserva Climática FIF RF Referenciado DI RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Baixo',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Referenciado DI',
    FNDTOAMB: 'Renda Fixa Duração Baixa Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest_selection': {
    FNDCD: 34, NOME: 'Banestes Selection FI Renda Fixa CP RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Médio',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Crédito Privado',
    FNDTOAMB: 'Renda Fixa Duração Livre Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest_soberano': {
    FNDCD: 0, NOME: 'Banestes Soberano Fundo de Investimento Financeiro Renda Fixa Simples RL',
    FNDCTFND: 'Renda Fixa Simples', FNDCLSRISC: 'Muito Baixo',
    FNDCLSCVM: 'Renda Fixa Simples', FNDSUBCVM: 'Renda Fixa Simples',
    FNDTOAMB: 'Renda Fixa Simples', FNDCOTDIAUTIL: 'N',
  },
  'invest_solidez': {
    FNDCD: 0, NOME: 'Banestes Solidez Automático FIF Renda Fixa CP RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Médio',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Crédito Privado',
    FNDTOAMB: 'Renda Fixa Duração Livre Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest_Synergy': {
    FNDCD: 38, NOME: 'Banestes Synergy Long Only FIF em Cotas de FIA RL',
    FNDCTFND: 'Ações', FNDCLSRISC: 'Alto',
    FNDCLSCVM: 'Ações', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Ações Ativos Livre', FNDCOTDIAUTIL: 'N',
  },
  'invest_tenax': {
    FNDCD: 36, NOME: 'Banestes Tenax Ações FIF em Cotas de FIA RL',
    FNDCTFND: 'Ações', FNDCLSRISC: 'Alto',
    FNDCLSCVM: 'Ações', FNDSUBCVM: 'Não se aplica',
    FNDTOAMB: 'Ações Ativos Livre', FNDCOTDIAUTIL: 'N',
  },
  'banestes_tesouro_fi_renda_fixa_referenciado_di': {
    FNDCD: 0, NOME: 'Banestes Tesouro FIF Renda Fixa Referenciado DI RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Baixo',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Referenciado DI',
    FNDTOAMB: 'Renda Fixa Duração Baixa Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest_vipdi': {
    FNDCD: 4, NOME: 'Banestes VIP DI FIC de FIF Renda Fixa Referenciado DI RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Baixo',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Referenciado DI',
    FNDTOAMB: 'Renda Fixa Duração Baixa Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest-valores': {
    FNDCD: 16, NOME: 'Banestes Valores FIC em Cotas de FIF Renda Fixa Referenciado DI RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Baixo',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Referenciado DI',
    FNDTOAMB: 'Renda Fixa Duração Baixa Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
  'invest-vitoria-500': {
    FNDCD: 6, NOME: 'Banestes Vitória 500 FIC de FIF Renda Fixa Referenciado DI RL',
    FNDCTFND: 'Renda Fixa', FNDCLSRISC: 'Baixo',
    FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Referenciado DI',
    FNDTOAMB: 'Renda Fixa Duração Baixa Grau de Investimento', FNDCOTDIAUTIL: 'N',
  },
};

// ============================================================
// MENU E INICIALIZAÇÃO
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏦 Gerenciador Fundos')
    .addItem('🗂️ Configurar Abas da Planilha', 'configurarPlanilha')
    .addItem('♻️ Reconfigurar Abas (Excluir e Recriar)', 'reconfigurarPlanilha')
    .addSeparator()
    .addItem('📋 Abrir Painel de Log', 'abrirPainel')
    .addSeparator()
    .addItem('🔄 Gerar e Enviar Agora', 'gerarEEnviar')
    .addItem('🧪 Testar Envio de E-mail', 'testarEnvioEmail')
    .addSeparator()
    .addItem('⏰ Configurar Acionadores Automáticos', 'configurarAcionador')
    .addItem('🗑️ Remover Acionadores Automáticos', 'removerAcionador')
    .addToUi();
}

function abrirPainel() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('🏦 Painel de Log — Fundos Banestes')
    .setWidth(480);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Serve a página de log/status como Web App.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Painel de Log — Fundos Banestes')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// ACIONADOR AUTOMÁTICO (onChange)
// ============================================================

/**
 * Disparado automaticamente quando dados da planilha são alterados.
 * Instalado como acionador programático via configurarAcionador().
 * Possui debounce para evitar processamentos duplicados.
 */
function aoAlterarPlanilha(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var lastRun = props.getProperty(CONFIG.PROP_LAST_RUN);
    if (lastRun) {
      var minutesSince = (Date.now() - new Date(lastRun).getTime()) / 60000;
      if (minutesSince < CONFIG.DEBOUNCE_MINUTES) {
        var msg = 'Debounce: última execução há ' + minutesSince.toFixed(1) + 'min. Ignorando alteração.';
        Logger.log(msg);
        // Registra no log para visibilidade no painel — sem envio de e-mail
        registrarInfoLog('⏸ ' + msg);
        return;
      }
    }
    gerarEEnviar();
  } catch (err) {
    Logger.log('Erro em aoAlterarPlanilha: ' + err.message);
    registrarErroLog(err);
  }
}

// ============================================================
// UTILITÁRIOS DE CONVERSÃO DE TAXA
// ============================================================

/**
 * Converte "35,80%" ou "35.80%" para 0.3580. Retorna 0 se inválido.
 */
function parseTaxaPercent(val) {
  if (!val || val === 'NULL' || val === '') return 0;
  var str = String(val).replace('%', '').replace(',', '.').trim();
  var num = parseFloat(str);
  return isNaN(num) ? 0 : num / 100;
}

/**
 * Converte um valor percentual (número ou string) para decimal. Retorna 0 se inválido ou vazio.
 * Exemplos de entrada aceitos:
 *   - número:  35.80  →  0.3580
 *   - string: "35,80%"  →  0.3580
 *   - string: "35.80"   →  0.3580
 */
function parseTaxaDecimal(val) {
  if (!val || val === '') return 0;
  var str = String(val).replace('%', '').replace(',', '.').trim();
  var num = parseFloat(str);
  return isNaN(num) ? 0 : num / 100;
}

/**
 * Calcula o hash MD5 de uma string para detectar mudanças nos dados.
 */
function computeHash(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, str, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// ============================================================
// CÁLCULO DE VALORES DERIVADOS (substitui fórmulas das células)
// ============================================================

/**
 * Recalcula a coluna PODE_SIMULAR (col D) da aba PodeSimular inteiramente
 * no backend, sem usar fórmulas na célula.
 *
 * Regra (equivalente ao IF que estava na célula):
 *   • Fundo em FUNDO_SEMPRE_NAO → preserva 'Não' fixo (nunca recalcula)
 *   • DATA_INICIO vazia → preserva valor existente em col D
 *   • DATA_INICIO preenchida e fundo com ≥ 1 ano de operação → "Sim"
 *   • DATA_INICIO preenchida e fundo com < 1 ano de operação → "Não"
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function atualizarColunaPodeSimular(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEET_PODE_SIM);
  if (!sheet || sheet.getLastRow() < 2) return;

  var data = sheet.getDataRange().getValues();
  var hoje = new Date();

  for (var i = 1; i < data.length; i++) {
    var fundId = String(data[i][0] || '').trim(); // col A: ID_FUNDO
    // Fundos que nunca podem simular: manter 'Não' fixo, independente da data
    if (FUNDO_SEMPRE_NAO[fundId]) {
      sheet.getRange(i + 1, 4).setValue('Não');
      continue;
    }

    var dataInicio = data[i][2]; // col C: DATA_INICIO
    // When no date is set, preserve whatever value is already in col D
    // (allows initial 'Sim' entries to be kept until COAFI data arrives).
    if (!dataInicio) continue;

    var dt = (dataInicio instanceof Date) ? dataInicio : new Date(dataInicio);
    // Guard against invalid dates (e.g. unexpected text in column C)
    if (isNaN(dt.getTime())) continue;

    // Use 365 days to match the behaviour of the original DATADIF formula
    var anos = (hoje - dt) / (365 * 24 * 60 * 60 * 1000);
    sheet.getRange(i + 1, 4).setValue(anos >= 1 ? 'Sim' : 'Não');
  }
}

/**
 * Recalcula as colunas PODE_SIMULAR_NOVO (col F) e TAXA_NOVA (col G) da aba
 * Inicial inteiramente no backend, sem usar fórmulas nas células.
 *
 * Equivalência com as fórmulas que estavam nas células:
 *   Col F: =IFERROR(VLOOKUP(B,PodeSimular!A:D,4,FALSE), D)
 *   Col G: =SE(F="Sim";CONCATENAR(PROCV(B;TaxaNova!A:C;3;FALSO);"%");"")
 *          Produz "XX,XX%" quando podeSimNovo="Sim" e taxa > 0; vazio caso contrário.
 *          A aba TaxaNova armazena os valores como número percentual (ex: 35.80 para 35,80%).
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function atualizarColunasInicial(ss) {
  var inicialSheet = ss.getSheetByName(CONFIG.SHEET_INICIAL);
  if (!inicialSheet || inicialSheet.getLastRow() < 2) return;

  // Mapa ID → PODE_SIMULAR (col D) da aba PodeSimular
  var podeSimMap = {};
  var psSheet = ss.getSheetByName(CONFIG.SHEET_PODE_SIM);
  if (psSheet && psSheet.getLastRow() >= 2) {
    var psData = psSheet.getDataRange().getValues();
    for (var p = 1; p < psData.length; p++) {
      var psId = String(psData[p][0] || '').trim();
      if (psId) podeSimMap[psId] = String(psData[p][3] || '').trim();
    }
  }

  // Mapa ID → TAXA_NOVA (col C, percentual numérico como 35.80) da aba TaxaNova
  var taxaNovaMap = {};
  var tnSheet = ss.getSheetByName(CONFIG.SHEET_TAXA_NOVA);
  if (tnSheet && tnSheet.getLastRow() >= 2) {
    var tnData = tnSheet.getDataRange().getValues();
    for (var t = 1; t < tnData.length; t++) {
      var tnId = String(tnData[t][0] || '').trim();
      if (tnId) taxaNovaMap[tnId] = tnData[t][2];
    }
  }

  var inicialData = inicialSheet.getDataRange().getValues();
  var fgValues = [];
  for (var i = 1; i < inicialData.length; i++) {
    var fundId       = String(inicialData[i][1] || '').trim(); // col B: ID_FUNDO
    var podeSimAtual = String(inicialData[i][3] || '').trim(); // col D: fallback

    // Col F: PODE_SIMULAR_NOVO — lookup em PodeSimular; fallback: col D desta aba
    var podeSimNovo = podeSimMap.hasOwnProperty(fundId) ? podeSimMap[fundId] : podeSimAtual;

    // Col G: TAXA_NOVA — equivalente à fórmula original:
    //   =SE(F2="Sim";CONCATENAR(PROCV(C2;TaxaNova!A:C;3;FALSO);"%");"")
    // Formata como "XX,XX%" quando podeSimNovo="Sim" e o valor for válido; caso contrário, vazio.
    // A aba TaxaNova armazena o valor como número percentual (ex: 35.80 para 35,80%).
    var taxaNovaRaw = taxaNovaMap.hasOwnProperty(fundId) ? taxaNovaMap[fundId] : '';
    var taxaNovaFormatada = '';
    if (podeSimNovo === 'Sim') {
      var taxaNum = Number(taxaNovaRaw);
      if (!isNaN(taxaNum) && taxaNum > 0) {
        taxaNovaFormatada = taxaNum.toFixed(2).replace('.', ',') + '%';
      }
    }

    fgValues.push([podeSimNovo, taxaNovaFormatada]);
  }

  if (fgValues.length > 0) {
    inicialSheet.getRange(2, 6, fgValues.length, 2).setValues(fgValues);
  }
}

/**
 * Lê a aba COAFI (importada via IMPORTRANGE do GEART/RENTABILIDADE) e atualiza:
 *   • Aba PodeSimular col C (DATA_INICIO) — equivalente à fórmula original
 *       =PROCV(B; COAFI!B:E; 4; FALSO)
 *   • Aba TaxaNova col C (TAXA_NOVA) — equivalente à fórmula original
 *       =TEXTO(PROCV(B; COAFI!B:AR; 43; FALSO); "0.00")
 *
 * Estrutura esperada da aba COAFI (dados do GEART/RENTABILIDADE!A:AR):
 *   Col B (índice 1)  = nome do fundo (chave de lookup)
 *   Col E (índice 4)  = DATA_INICIO
 *   Col AR (índice 43) = TAXA_NOVA (valor percentual numérico, ex: 14.20)
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function atualizarDadosDeCoafi(ss) {
  var coafiSheet = ss.getSheetByName(CONFIG.SHEET_COAFI);
  if (!coafiSheet || coafiSheet.getLastRow() < 2) {
    Logger.log('Aba COAFI vazia ou não encontrada — DATA_INICIO e TAXA_NOVA não atualizados.');
    return;
  }

  var coafiData = coafiSheet.getDataRange().getValues();

  // Constrói mapas: nome (col B) → DATA_INICIO (col E) e → TAXA_NOVA (col AR)
  // A linha 0 é o cabeçalho da planilha importada — ignorar.
  var mapaInicio = {};
  var mapaTaxa   = {};
  for (var i = 1; i < coafiData.length; i++) {
    var row  = coafiData[i];
    var nome = String(row[1] || '').trim();  // col B (índice 1)
    if (!nome) continue;
    mapaInicio[nome] = row[4];   // col E (índice 4) = DATA_INICIO
    mapaTaxa[nome]   = row[43];  // col AR (índice 43) = TAXA_NOVA
  }

  // ── Atualiza PodeSimular col C (DATA_INICIO) ──────────────────────────────
  var psSheet = ss.getSheetByName(CONFIG.SHEET_PODE_SIM);
  if (psSheet && psSheet.getLastRow() >= 2) {
    var psData = psSheet.getDataRange().getValues();
    for (var p = 1; p < psData.length; p++) {
      var fundId   = String(psData[p][0] || '').trim();
      var coafiNome = FUND_ID_TO_COAFI_INICIO[fundId];
      if (!coafiNome || !mapaInicio.hasOwnProperty(coafiNome)) continue;
      var dataVal = mapaInicio[coafiNome];
      if (dataVal != null && dataVal !== '') {
        psSheet.getRange(p + 1, 3).setValue(dataVal);
      }
    }
  }

  // ── Atualiza TaxaNova col C (TAXA_NOVA) ───────────────────────────────────
  var tnSheet = ss.getSheetByName(CONFIG.SHEET_TAXA_NOVA);
  if (tnSheet && tnSheet.getLastRow() >= 2) {
    var tnData = tnSheet.getDataRange().getValues();
    for (var t = 1; t < tnData.length; t++) {
      var fId      = String(tnData[t][0] || '').trim();
      var coafiNomeTaxa = FUND_ID_TO_COAFI_TAXA[fId];
      if (!coafiNomeTaxa || !mapaTaxa.hasOwnProperty(coafiNomeTaxa)) continue;
      var taxaVal = mapaTaxa[coafiNomeTaxa];
      if (taxaVal != null && taxaVal !== '') {
        tnSheet.getRange(t + 1, 3).setValue(taxaVal);
      }
    }
  }

  Logger.log('atualizarDadosDeCoafi concluído.');
}

/**
 * Recalcula todos os valores derivados das abas auxiliares no backend.
 * Deve ser chamada antes de ler dados (em gerarEEnviar) e ao configurar a planilha.
 * Ordem:
 *   1. atualizarDadosDeCoafi  — popula DATA_INICIO (PodeSimular col C) e TAXA_NOVA (TaxaNova col C) a partir do COAFI
 *   2. atualizarColunaPodeSimular — recalcula PODE_SIMULAR (PodeSimular col D) com base na DATA_INICIO
 *   3. atualizarColunasInicial — propaga PODE_SIMULAR_NOVO e TAXA_NOVA para Inicial cols F e G
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function sincronizarValoresDerivados(ss) {
  atualizarDadosDeCoafi(ss);
  atualizarColunaPodeSimular(ss);
  atualizarColunasInicial(ss);
}

// ============================================================
// LEITURA DE DADOS DAS ABAS
// ============================================================

/**
 * Obtém a lista de fundos lendo as abas da planilha.
 *
 * Fonte primária: aba "Inicial" (colunas B=id, C=nome, F=podeSimularNovo, G=taxaNova).
 * Os valores de F e G são resultados calculados pelo backend via sincronizarValoresDerivados.
 *
 * Dados estáticos (tipo, risco, CVM, ANBIMA, FNDCD) vêm de FUND_DATA.
 * Dados de rentabilidade (diária/mensal/anual) vêm da aba "Fundos" se existir.
 *
 * @returns {Array<Object>} Lista de objetos representando cada fundo.
 */
function obterDadosFundos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inicialSheet = ss.getSheetByName(CONFIG.SHEET_INICIAL);

  if (!inicialSheet) {
    Logger.log('Aba "Inicial" não encontrada. Usando fallback "Fundos".');
    return obterDadosFallback(ss);
  }

  var data = inicialSheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('Aba "Inicial" vazia. Usando fallback "Fundos".');
    return obterDadosFallback(ss);
  }

  // Leitura da aba Fundos para enriquecimento com rentabilidade (se existir)
  var rentMap = obterMapaRentabilidade(ss);

  var fundos = [];
  var unknownIds = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var fundId       = String(row[1] || '').trim();  // Coluna B: id
    var nomePlanilha = String(row[2] || '').trim();  // Coluna C: nome exibição
    // Coluna D (row[3]): podeSimular Atual — não usada diretamente aqui
    // Coluna E (row[4]): Taxa Atual
    var taxaAtualStr  = String(row[4] || '').trim();  // Coluna E: taxa atual
    var podeSimNovo  = String(row[5] || '').trim();  // Coluna F: podeSimular Novo (fórmula resolvida)
    var taxaNovaStr  = String(row[6] || '').trim();  // Coluna G: Taxa Nova (fórmula resolvida)

    if (!fundId) continue;

    var d = FUND_DATA[fundId];
    if (!d) {
      var warnMsg = 'ID de fundo desconhecido: "' + fundId + '" (linha ' + (i + 1) + ' da aba Inicial). Adicione-o em FUND_DATA no Code.gs.';
      Logger.log(warnMsg);
      unknownIds.push(fundId);
      continue;
    }

    // Determinar taxa de simulação
    var taxaSimulacao = parseTaxaDecimal(taxaNovaStr);
    if (taxaSimulacao === 0) {
      taxaSimulacao = parseTaxaPercent(taxaAtualStr);
    }

    // Rentabilidade da aba Fundos (se disponível)
    var rent = rentMap[d.FNDCD] || { RENT_DIARIA: 0, RENT_MENSAL: 0, RENT_ANUAL: 0 };

    fundos.push({
      FNDCD:        d.FNDCD,
      NOME:         nomePlanilha || d.NOME,
      FNDCTFND:     d.FNDCTFND,
      FNDCLSRISC:   d.FNDCLSRISC,
      FNDCLSCVM:    d.FNDCLSCVM,
      FNDSUBCVM:    d.FNDSUBCVM,
      FNDTOAMB:     d.FNDTOAMB,
      FNDTXSIMU:    taxaSimulacao,
      FNDCOTDIAUTIL: d.FNDCOTDIAUTIL,
      PODE_SIMULAR: podeSimNovo,
      RENT_DIARIA:  rent.RENT_DIARIA,
      RENT_MENSAL:  rent.RENT_MENSAL,
      RENT_ANUAL:   rent.RENT_ANUAL,
    });
  }

  if (fundos.length === 0) {
    Logger.log('Nenhum fundo mapeado da aba "Inicial". Usando fallback "Fundos".');
    return obterDadosFallback(ss);
  }

  if (unknownIds.length > 0) {
    registrarInfoLog('⚠️ IDs desconhecidos na aba "Inicial" (adicionar em FUND_DATA): ' + unknownIds.join(', '));
  }

  Logger.log('Fundos lidos da aba "Inicial": ' + fundos.length);
  return fundos;
}

/**
 * Lê dados de rentabilidade da aba "Fundos" e retorna mapa por FNDCD.
 */
function obterMapaRentabilidade(ss) {
  var rentMap = {};
  var sheet = ss.getSheetByName(CONFIG.SHEET_FUNDS);
  if (!sheet || sheet.getLastRow() < 2) return rentMap;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxFndcd = headers.indexOf('FNDCD');
  var idxDia   = headers.indexOf('RENT_DIARIA');
  var idxMes   = headers.indexOf('RENT_MENSAL');
  var idxAno   = headers.indexOf('RENT_ANUAL');

  if (idxFndcd < 0) return rentMap;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var cd = Number(row[idxFndcd]);
    if (!cd) continue;
    rentMap[cd] = {
      RENT_DIARIA: idxDia  >= 0 ? Number(row[idxDia])  : 0,
      RENT_MENSAL: idxMes  >= 0 ? Number(row[idxMes])  : 0,
      RENT_ANUAL:  idxAno  >= 0 ? Number(row[idxAno])  : 0,
    };
  }
  return rentMap;
}

/**
 * Fallback: lê dados diretamente da aba "Fundos" (formato legado).
 */
function obterDadosFallback(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEET_FUNDS);
  if (!sheet) {
    sheet = criarAbaDadosFundos(ss);
  }
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var fundos = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1]) continue;
    var f = {};
    headers.forEach(function (h, idx) { f[h] = row[idx]; });
    f.PODE_SIMULAR = (Number(f.FNDTXSIMU) > 0) ? 'Sim' : 'Não';
    fundos.push(f);
  }
  return fundos;
}

/**
 * Cria e popula a aba "Fundos" com os dados padrão (utilizado no fallback).
 */
function criarAbaDadosFundos(ss) {
  var headers = [
    'FNDCD', 'NOME', 'FNDCTFND', 'FNDCLSRISC', 'FNDCLSCVM', 'FNDSUBCVM',
    'FNDTOAMB', 'FNDTXSIMU', 'FNDCOTDIAUTIL',
    'RENT_DIARIA', 'RENT_MENSAL', 'RENT_ANUAL',
  ];
  var rows = [
    [2,  'Banestes Invest Money FIF Renda Fixa RL',                                           'Renda Fixa',                         'Baixo',      'Renda Fixa',                         'Não se aplica',             'Renda Fixa Duração Baixa Soberano',                    0.1338,'N',0.0365,0.1123,0.1338],
    [4,  'Banestes VIP DI FIC de FIF Renda Fixa Referenciado DI RL',                          'Renda Fixa',                         'Baixo',      'Renda Fixa',                         'Referenciado DI',           'Renda Fixa Duração Baixa Grau de Investimento',        0.1420,'N',0.0388,0.1195,0.1420],
    [6,  'Banestes Vitória 500 FIC de FIF Renda Fixa Referenciado DI RL',                     'Renda Fixa',                         'Baixo',      'Renda Fixa',                         'Referenciado DI',           'Renda Fixa Duração Baixa Grau de Investimento',        0.1275,'N',0.0348,0.1073,0.1275],
    [8,  'Banestes Institucional FIF Renda Fixa RL',                                          'Renda Fixa',                         'Médio',      'Renda Fixa',                         'Não se aplica',             'Renda Fixa Duração Alta Grau de Investimento',         0.1456,'N',0.0398,0.1225,0.1456],
    [15, 'Banestes BTG Pactual Absoluto Institucional FIC de FIF de Ações RL',               'Ações',                              'Alto',       'Ações',                              'Não se aplica',             'Ações Ativos Livre',                                   0.3580,'N',0.0978,0.3012,0.3580],
    [16, 'Banestes Valores FIC em Cotas de FIF Renda Fixa Referenciado DI RL',                'Renda Fixa',                         'Baixo',      'Renda Fixa',                         'Referenciado DI',           'Renda Fixa Duração Baixa Grau de Investimento',        0.1414,'N',0.0386,0.1189,0.1414],
    [18, 'Banestes Liquidez FIF Renda Fixa Referenciado DI RL',                               'Renda Fixa',                         'Baixo',      'Renda Fixa',                         'Referenciado DI',           'Renda Fixa Duração Baixa Grau de Investimento',        0.1452,'N',0.0397,0.1220,0.1452],
    [22, 'Banestes FIC de FIF Incentivados de Investimento em Infraestrutura RF CP RL',       'Renda Fixa (Fundo de Infraestrutura)','Alto',      'Renda Fixa (Fundo de Infraestrutura)','Crédito Privado',          'Renda Fixa Duração Livre Crédito Livre',               0.1318,'S',0.0360,0.1108,0.1318],
    [23, 'Banestes Estratégia FIC de FIF Renda Fixa RL',                                     'Renda Fixa',                         'Médio',      'Renda Fixa',                         'Não se aplica',             'Renda Fixa Duração Livre Grau de Investimento',        0.1406,'S',0.0384,0.1181,0.1406],
    [24, 'Banestes Dividendos FIC de FIF de Ações RL',                                       'Ações',                              'Alto',       'Ações',                              'Não se aplica',             'Ações Ativo Dividendos',                               0.4441,'S',0.1213,0.3734,0.4441],
    [28, 'Banestes Invest Fácil Fundo de Investimento Renda Fixa Simples RL',                'Renda Fixa Simples',                 'Muito Baixo','Renda Fixa Simples',                 'Renda Fixa Simples',        'Renda Fixa Simples',                                   0.1318,'N',0.0360,0.1108,0.1318],
    [31, 'Banestes IMA-B 5 Títulos Públicos FI Renda Fixa LP RL',                            'Renda Fixa',                         'Médio',      'Renda Fixa',                         'Longo Prazo',               'Renda Fixa Duração Livre Soberano',                    0.1138,'N',0.0311,0.0957,0.1138],
    [32, 'Banestes Crédito Corporativo I FIC de FI RF Crédito Privado LP RL',                'Renda Fixa',                         'Alto',       'Renda Fixa',                         'Crédito Privado Longo Prazo','Renda Fixa Duração Livre Crédito Livre',              0.1442,'N',0.0394,0.1212,0.1442],
    [33, 'Banestes Multiestratégia FIC de FIF Multimercado RL',                              'Multimercado',                       'Alto',       'Multimercado',                       'Não se aplica',             'Multimercado Estratégia Livre',                        0.1421,'S',0.0388,0.1195,0.1421],
    [34, 'Banestes Selection FI Renda Fixa CP RL',                                            'Renda Fixa',                         'Médio',      'Renda Fixa',                         'Crédito Privado',           'Renda Fixa Duração Livre Grau de Investimento',        0.1433,'N',0.0391,0.1205,0.1433],
    [36, 'Banestes Tenax Ações FIF em Cotas de FIA RL',                                      'Ações',                              'Alto',       'Ações',                              'Não se aplica',             'Ações Ativos Livre',                                   0,    'N',0,    0,    0    ],
    [38, 'Banestes Synergy Long Only FIF em Cotas de FIA RL',                                'Ações',                              'Alto',       'Ações',                              'Não se aplica',             'Ações Ativos Livre',                                   0,    'N',0,    0,    0    ],
  ];

  var sheet = ss.insertSheet(CONFIG.SHEET_FUNDS, 0);
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setBackground('#1a3c5e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 8, rows.length, 1).setNumberFormat('0.0000');
  sheet.getRange(2, 10, rows.length, 3).setNumberFormat('0.0000');
  for (var r = 2; r <= rows.length + 1; r++) {
    sheet.getRange(r, 1, 1, headers.length).setBackground(r % 2 === 0 ? '#f0f4f8' : '#ffffff');
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

// ============================================================
// CONFIGURAÇÃO INICIAL DA PLANILHA
// ============================================================

/**
 * Cria e popula todas as abas necessárias na planilha:
 *   COAFI (placeholder), PodeSimular, TaxaNova, Inicial, Log_Envios e Fundos.
 *
 * Execute esta função uma única vez — via menu 🏦 Gerenciador Fundos →
 * "🗂️ Configurar Abas da Planilha" — antes de usar gerarEEnviar() ou
 * testarEnvioEmail(). Abas já existentes não são modificadas.
 */
function configurarPlanilha() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var criadas    = [];
  var existentes = [];

  var abas = [
    { nome: CONFIG.SHEET_COAFI,     fn: _criarAbaCoafi      },
    { nome: CONFIG.SHEET_PODE_SIM,  fn: _criarAbaPodeSimular },
    { nome: CONFIG.SHEET_TAXA_NOVA, fn: _criarAbaTaxaNova    },
    { nome: CONFIG.SHEET_INICIAL,   fn: _criarAbaInicial     },
    { nome: CONFIG.SHEET_LOG,       fn: garantirAbaLog       },
    { nome: CONFIG.SHEET_FUNDS,     fn: criarAbaDadosFundos  },
  ];

  abas.forEach(function (aba) {
    if (!ss.getSheetByName(aba.nome)) {
      aba.fn(ss);
      criadas.push(aba.nome);
    } else {
      existentes.push(aba.nome);
    }
  });

  // Recalcula valores derivados no backend (PodeSimular col D, Inicial cols F e G)
  sincronizarValoresDerivados(ss);

  var msg = '';
  if (criadas.length > 0) {
    msg += '✅ Abas criadas: ' + criadas.join(', ') + '.\n\n';
  }
  if (existentes.length > 0) {
    msg += 'ℹ️ Já existentes (não modificadas): ' + existentes.join(', ') + '.\n\n';
  }
  msg += 'Próximos passos:\n'
    + '1. Autorize o IMPORTRANGE na aba ' + CONFIG.SHEET_COAFI + ' (necessário apenas na primeira vez).\n'
    + '2. Os triggers automáticos irão gerar e enviar os dados sem nenhuma interação manual.';

  Logger.log('configurarPlanilha concluído. Criadas: [' + criadas.join(', ') + ']');
  try {
    SpreadsheetApp.getUi().alert('🏦 Planilha Configurada!', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Exclui todas as abas gerenciadas pelo sistema e as recria do zero com os
 * dados corretos. Útil para corrigir inconsistências ou após atualização dos
 * dados estáticos em FUND_DATA / nas funções _criar*.
 *
 * ⚠️ ATENÇÃO: todos os dados presentes nas abas gerenciadas serão perdidos.
 * Dados importados via =IMPORTRANGE(...) na aba COAFI precisarão ser
 * reconfigurados após a execução desta função.
 *
 * Execute via menu 🏦 Gerenciador Fundos → "♻️ Reconfigurar Abas (Excluir e Recriar)".
 */
function reconfigurarPlanilha() {
  var ui = SpreadsheetApp.getUi();

  // Confirmação obrigatória antes de excluir qualquer dado
  var resposta = ui.alert(
    '♻️ Reconfigurar Planilha',
    'Esta ação irá EXCLUIR e RECRIAR as seguintes abas:\n\n' +
      '• ' + CONFIG.SHEET_COAFI     + '\n' +
      '• ' + CONFIG.SHEET_PODE_SIM  + '\n' +
      '• ' + CONFIG.SHEET_TAXA_NOVA + '\n' +
      '• ' + CONFIG.SHEET_INICIAL   + '\n' +
      '• ' + CONFIG.SHEET_LOG       + '\n' +
      '• ' + CONFIG.SHEET_FUNDS     + '\n\n' +
    '⚠️ Todos os dados atuais nessas abas serão PERDIDOS.\n' +
    'O =IMPORTRANGE(...) da aba COAFI precisará ser reconfigurado.\n\n' +
    'Deseja continuar?',
    ui.ButtonSet.YES_NO
  );

  if (resposta !== ui.Button.YES) {
    ui.alert('Operação cancelada.', 'Nenhuma aba foi modificada.', ui.ButtonSet.OK);
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Lista de abas gerenciadas a excluir e recriar (ordem de exclusão)
  var abasGerenciadas = [
    CONFIG.SHEET_COAFI,
    CONFIG.SHEET_PODE_SIM,
    CONFIG.SHEET_TAXA_NOVA,
    CONFIG.SHEET_INICIAL,
    CONFIG.SHEET_LOG,
    CONFIG.SHEET_FUNDS,
  ];

  // Para evitar a restrição "a planilha precisa ter ao menos uma aba",
  // criamos uma aba temporária antes de excluir as demais.
  var tempSheet = ss.insertSheet('_tmp_reconfigurar_');

  // Excluir todas as abas gerenciadas que existirem
  var excluidas = [];
  abasGerenciadas.forEach(function (nome) {
    var sheet = ss.getSheetByName(nome);
    if (sheet) {
      ss.deleteSheet(sheet);
      excluidas.push(nome);
    }
  });

  // Recriar todas as abas na ordem correta
  _criarAbaCoafi(ss);
  _criarAbaPodeSimular(ss);
  _criarAbaTaxaNova(ss);
  _criarAbaInicial(ss);
  garantirAbaLog(ss);
  criarAbaDadosFundos(ss);

  // Recalcula valores derivados (PodeSimular col D, Inicial cols F e G)
  sincronizarValoresDerivados(ss);

  // Remove a aba temporária usando a referência já armazenada
  ss.deleteSheet(tempSheet);

  Logger.log('reconfigurarPlanilha concluído. Excluídas e recriadas: [' + excluidas.join(', ') + ']');

  ui.alert(
    '✅ Planilha Reconfigurada!',
    'As seguintes abas foram excluídas e recriadas com sucesso:\n\n' +
      '• ' + excluidas.join('\n• ') + '\n\n' +
    'Próximos passos:\n' +
    '1. Autorize o IMPORTRANGE na aba ' + CONFIG.SHEET_COAFI + ' (necessário apenas na primeira vez).\n' +
    '2. Os triggers automáticos irão gerar e enviar os dados sem nenhuma interação manual.',
    ui.ButtonSet.OK
  );
}

/**
 * Cria a aba COAFI e configura a fórmula IMPORTRANGE que importa os dados do
 * GEART (planilha RENTABILIDADE!A:AR) — idêntico ao sistema original.
 *
 * ⚠️ Na primeira execução, o Google Sheets pedirá autorização do IMPORTRANGE.
 *    Basta acessar a planilha uma única vez e conceder permissão.
 *    Após isso, os triggers automáticos funcionarão sem interação manual.
 */
function _criarAbaCoafi(ss) {
  var sheet = ss.insertSheet(CONFIG.SHEET_COAFI);
  // Equivalente à fórmula original:
  //   =importrange("1vXp4xGTacqXy7jTzhsBwAhNCgvT-9jmrvfetcvGBjhQ","RENTABILIDADE!A:AR")
  sheet.getRange('A1').setFormula(
    '=IMPORTRANGE("1vXp4xGTacqXy7jTzhsBwAhNCgvT-9jmrvfetcvGBjhQ","RENTABILIDADE!A:AR")'
  );
  return sheet;
}

/**
 * Cria a aba PodeSimular com todos os 26 fundos de FUND_DATA.
 * Coluna D (PODE_SIMULAR): calculada pelo backend a partir de DATA_INICIO —
 * "Sim" se o fundo tiver ≥ 1 ano de operação, "Sim" como padrão enquanto
 * DATA_INICIO não estiver preenchida.
 */
function _criarAbaPodeSimular(ss) {
  var headers = ['ID_FUNDO', 'NOME_FUNDO', 'DATA_INICIO', 'PODE_SIMULAR'];
  // Order matches the original "PodeSimular" spreadsheet tab (A2:A27).
  // Column 4 (PODE_SIMULAR) contains the correct initial value:
  //   'Não' — hardcoded funds that must never simulate regardless of age.
  //   'Sim' — funds whose eligibility is determined by their start date;
  //            atualizarColunaPodeSimular() will recalculate when DATA_INICIO is filled.
  var staticRows = [
    ['invest_investpublic',                            'Banestes Invest Public Automático FIF CP RL',                                       '', 'Não'],
    ['invest_investmoney',                             'Banestes Invest Money FIF Renda Fixa RL',                                           '', 'Sim'],
    ['invest_investidor',                              'Banestes Investidor Automático FIF Renda Fixa CP RL',                               '', 'Não'],
    ['invest-vitoria-500',                             'Banestes Vitória 500 FIC de FIF Renda Fixa Referenciado DI RL',                     '', 'Sim'],
    ['invest_vipdi',                                   'Banestes VIP DI FIC de FIF Renda Fixa Referenciado DI RL',                          '', 'Sim'],
    ['invest_institucional',                           'Banestes Institucional FIF Renda Fixa RL',                                          '', 'Sim'],
    ['invest_previdenciario',                          'Banestes IMA-B Títulos Públicos FIF Renda Fixa RL',                                 '', 'Não'],
    ['banestes_tesouro_fi_renda_fixa_referenciado_di', 'Banestes Tesouro FIF Renda Fixa Referenciado DI RL',                                '', 'Não'],
    ['invest_solidez',                                 'Banestes Solidez Automático FIF Renda Fixa CP RL',                                  '', 'Não'],
    ['invest_btg_pactual_absoluto',                    'Banestes BTG Pactual Absoluto Institucional FIC de FIF de Ações RL',               '', 'Sim'],
    ['invest-valores',                                 'Banestes Valores FIC em Cotas de FIF Renda Fixa Referenciado DI RL',                '', 'Sim'],
    ['invest_liquidez_referenciado',                   'Banestes Liquidez FIF Renda Fixa Referenciado DI RL',                               '', 'Sim'],
    ['invest_referencial',                             'Banestes IRF-M 1 Títulos Públicos FIF Renda Fixa RL',                               '', 'Não'],
    ['invest_debentures',                              'Banestes FIC de FIF Incentivados de Investimento em Infraestrutura RF CP RL',        '', 'Sim'],
    ['invest-estrategia',                              'Banestes Estratégia FIC de FIF Renda Fixa RL',                                      '', 'Sim'],
    ['invest_dividendos',                              'Banestes Dividendos FIC de FIF de Ações RL',                                        '', 'Sim'],
    ['invest_funses',                                  'Banestes FUNSES Multimercado RL',                                                   '', 'Não'],
    ['invest_facil',                                   'Banestes Invest Fácil Fundo de Investimento Renda Fixa Simples RL',                 '', 'Sim'],
    ['invest_cred_corp',                               'Banestes Crédito Corporativo I FIC de FI RF Crédito Privado LP RL',                 '', 'Sim'],
    ['invest_ima-b5',                                  'Banestes IMA-B 5 Títulos Públicos FI Renda Fixa LP RL',                             '', 'Sim'],
    ['invest_multiestrategia',                         'Banestes Multiestratégia FIC de FIF Multimercado RL',                               '', 'Sim'],
    ['invest_selection',                               'Banestes Selection FI Renda Fixa CP RL',                                            '', 'Sim'],
    ['invest_fundo_reserva_climatica',                 'Banestes Reserva Climática FIF RF Referenciado DI RL',                              '', 'Sim'],
    ['invest_soberano',                                'Banestes Soberano Fundo de Investimento Financeiro Renda Fixa Simples RL',           '', 'Não'],
    ['invest_tenax',                                   'Banestes Tenax Ações FIF em Cotas de FIA RL',                                       '', 'Não'],
    ['invest_Synergy',                                 'Banestes Synergy Long Only FIF em Cotas de FIA RL',                                 '', 'Não'],
  ];

  var sheet  = ss.insertSheet(CONFIG.SHEET_PODE_SIM);
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers])
    .setBackground('#1a3c5e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);

  // Write all 4 columns (ID, NOME, DATA_INICIO, PODE_SIMULAR) at once
  sheet.getRange(2, 1, staticRows.length, 4).setValues(staticRows);
  sheet.getRange(2, 3, staticRows.length, 1).setNumberFormat('dd/MM/yyyy');

  // atualizarColunaPodeSimular is NOT called here because DATA_INICIO is empty;
  // it will only recalculate PODE_SIMULAR once real dates are filled in.

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

/**
 * Cria a aba TaxaNova com todos os 26 fundos de FUND_DATA e suas taxas de
 * simulação padrão em formato percentual (ex: 35.80 representa 35,80%).
 * Atualize a coluna C via PROCV no COAFI (coluna AR) quando os dados reais
 * do GEART estiverem disponíveis.
 */
function _criarAbaTaxaNova(ss) {
  var headers = ['ID_FUNDO', 'NOME_FUNDO', 'TAXA_NOVA'];
  // Order matches the original "TaxaNova" spreadsheet tab (alphabetical by fund full name).
  // Column C stores the rate as a percentage NUMBER (e.g. 35.80 for 35,80%),
  // matching the original =TEXTO(PROCV(B;COAFI!B:AR;43;FALSO);"0.00") formula output.
  var rows = [
    ['invest_btg_pactual_absoluto',                    'Banestes BTG Pactual Absoluto Institucional FIC de FIF de Ações RL',               35.80 ],
    ['invest_cred_corp',                               'Banestes Crédito Corporativo I FIC de FI RF Crédito Privado LP RL',                 14.42 ],
    ['invest_dividendos',                              'Banestes Dividendos FIC de FIF de Ações RL',                                        44.41 ],
    ['invest-estrategia',                              'Banestes Estratégia FIC de FIF Renda Fixa RL',                                      14.06 ],
    ['invest_debentures',                              'Banestes FIC de FIF Incentivados de Investimento em Infraestrutura RF CP RL',        13.18 ],
    ['invest_funses',                                  'Banestes FUNSES Multimercado RL',                                                   0     ],
    ['invest_ima-b5',                                  'Banestes IMA-B 5 Títulos Públicos FI Renda Fixa LP RL',                             11.38 ],
    ['invest_previdenciario',                          'Banestes IMA-B Títulos Públicos FIF Renda Fixa RL',                                 0     ],
    ['invest_institucional',                           'Banestes Institucional FIF Renda Fixa RL',                                          14.56 ],
    ['invest_facil',                                   'Banestes Invest Fácil Fundo de Investimento Renda Fixa Simples RL',                 13.18 ],
    ['invest_investmoney',                             'Banestes Invest Money FIF Renda Fixa RL',                                           13.38 ],
    ['invest_investpublic',                            'Banestes Invest Public Automático FIF CP RL',                                       0     ],
    ['invest_investidor',                              'Banestes Investidor Automático FIF Renda Fixa CP RL',                               0     ],
    ['invest_liquidez_referenciado',                   'Banestes Liquidez FIF Renda Fixa Referenciado DI RL',                               14.52 ],
    ['invest_multiestrategia',                         'Banestes Multiestratégia FIC de FIF Multimercado RL',                               14.21 ],
    ['invest_referencial',                             'Banestes IRF-M 1 Títulos Públicos FIF Renda Fixa RL',                               0     ],
    ['invest_fundo_reserva_climatica',                 'Banestes Reserva Climática FIF RF Referenciado DI RL',                              14.34 ],
    ['invest_selection',                               'Banestes Selection FI Renda Fixa CP RL',                                            14.33 ],
    ['invest_soberano',                                'Banestes Soberano Fundo de Investimento Financeiro Renda Fixa Simples RL',           0     ],
    ['invest_solidez',                                 'Banestes Solidez Automático FIF Renda Fixa CP RL',                                  0     ],
    ['invest_Synergy',                                 'Banestes Synergy Long Only FIF em Cotas de FIA RL',                                 0     ],
    ['invest_tenax',                                   'Banestes Tenax Ações FIF em Cotas de FIA RL',                                       0     ],
    ['banestes_tesouro_fi_renda_fixa_referenciado_di', 'Banestes Tesouro FIF Renda Fixa Referenciado DI RL',                                0     ],
    ['invest_vipdi',                                   'Banestes VIP DI FIC de FIF Renda Fixa Referenciado DI RL',                          14.20 ],
    ['invest-valores',                                 'Banestes Valores FIC em Cotas de FIF Renda Fixa Referenciado DI RL',                14.14 ],
    ['invest-vitoria-500',                             'Banestes Vitória 500 FIC de FIF Renda Fixa Referenciado DI RL',                     12.75 ],
  ];

  var sheet  = ss.insertSheet(CONFIG.SHEET_TAXA_NOVA);
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers])
    .setBackground('#1a3c5e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 3, rows.length, 1).setNumberFormat('0.00');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

/**
 * Cria e popula a aba "Inicial" com dados dos 26 fundos de FUND_DATA.
 *
 * Estrutura de colunas (lida por obterDadosFundos()):
 *   A (#) | B (ID_FUNDO) | C (NOME_FUNDO) | D (PODE_SIMULAR_ATUAL) |
 *   E (TAXA_ATUAL_%) | F (PODE_SIMULAR_NOVO) | G (TAXA_NOVA)
 *
 * Colunas F e G são preenchidas pelo backend via atualizarColunasInicial(),
 * buscando os valores calculados das abas PodeSimular e TaxaNova.
 */
function _criarAbaInicial(ss) {
  var headers = ['#', 'ID_FUNDO', 'NOME_FUNDO', 'PODE_SIMULAR_ATUAL', 'TAXA_ATUAL_%', 'PODE_SIMULAR_NOVO', 'TAXA_NOVA'];

  // Colunas A–E: dados estáticos (A=seq, B=ID, C=nome, D=podeSimular atual, E=taxa atual)
  // Order and values match the original "Inicial" spreadsheet tab (B2:E27).
  // Taxa vazia ('') means the fund reports NULL in the source — maps to 0 in parseTaxaPercent.
  var staticData = [
    [1,  'invest_btg_pactual_absoluto',                    'Banestes BTG Pactual Absoluto Institucional FIC de FIF de Ações RL',               'Sim', '35,80%'],
    [2,  'invest_cred_corp',                               'Banestes Crédito Corporativo I FIC de FI RF Crédito Privado LP RL',                 'Sim', '14,42%'],
    [3,  'invest_dividendos',                              'Banestes Dividendos FIC de FIF de Ações RL',                                        'Sim', '44,41%'],
    [4,  'invest-estrategia',                              'Banestes Estratégia FIC de FIF Renda Fixa RL',                                      'Sim', '14,06%'],
    [5,  'invest_debentures',                              'Banestes FIC de FIF Incentivados de Investimento em Infraestrutura RF CP RL',        'Sim', '13,18%'],
    [6,  'invest_funses',                                  'Banestes FUNSES Multimercado RL',                                                   'Não', ''      ],
    [7,  'invest_ima-b5',                                  'Banestes IMA-B 5 Títulos Públicos FI Renda Fixa LP RL',                             'Sim', '11,38%'],
    [8,  'invest_previdenciario',                          'Banestes IMA-B Títulos Públicos FIF Renda Fixa RL',                                 'Não', ''      ],
    [9,  'invest_institucional',                           'Banestes Institucional FIF Renda Fixa RL',                                          'Sim', '14,56%'],
    [10, 'invest_facil',                                   'Banestes Invest Fácil Fundo de Investimento Renda Fixa Simples RL',                 'Sim', '13,18%'],
    [11, 'invest_investmoney',                             'Banestes Invest Money FIF Renda Fixa RL',                                           'Sim', '13,38%'],
    [12, 'invest_investpublic',                            'Banestes Invest Public Automático FIF CP RL',                                       'Não', ''      ],
    [13, 'invest_investidor',                              'Banestes Investidor Automático FIF Renda Fixa CP RL',                               'Não', ''      ],
    [14, 'invest_liquidez_referenciado',                   'Banestes Liquidez FIF Renda Fixa Referenciado DI RL',                               'Sim', '14,52%'],
    [15, 'invest_multiestrategia',                         'Banestes Multiestratégia FIC de FIF Multimercado RL',                               'Sim', '14,21%'],
    [16, 'invest_referencial',                             'Banestes IRF-M 1 Títulos Públicos FIF Renda Fixa RL',                               'Não', ''      ],
    [17, 'invest_fundo_reserva_climatica',                 'Banestes Reserva Climática FIF RF Referenciado DI RL',                              'Sim', '14,34%'],
    [18, 'invest_selection',                               'Banestes Selection FI Renda Fixa CP RL',                                            'Sim', '14,33%'],
    [19, 'invest_soberano',                                'Banestes Soberano Fundo de Investimento Financeiro Renda Fixa Simples RL',           'Não', ''      ],
    [20, 'invest_solidez',                                 'Banestes Solidez Automático FIF Renda Fixa CP RL',                                  'Não', ''      ],
    [21, 'invest_Synergy',                                 'Banestes Synergy Long Only FIF em Cotas de FIA RL',                                 'Não', ''      ],
    [22, 'invest_tenax',                                   'Banestes Tenax Ações FIF em Cotas de FIA RL',                                       'Não', ''      ],
    [23, 'banestes_tesouro_fi_renda_fixa_referenciado_di', 'Banestes Tesouro FIF Renda Fixa Referenciado DI RL',                                'Não', ''      ],
    [24, 'invest_vipdi',                                   'Banestes VIP DI FIC de FIF Renda Fixa Referenciado DI RL',                          'Sim', '14,20%'],
    [25, 'invest-valores',                                 'Banestes Valores FIC em Cotas de FIF Renda Fixa Referenciado DI RL',                'Sim', '14,14%'],
    [26, 'invest-vitoria-500',                             'Banestes Vitória 500 FIC de FIF Renda Fixa Referenciado DI RL',                     'Sim', '12,75%'],
  ];

  var sheet  = ss.insertSheet(CONFIG.SHEET_INICIAL);
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers])
    .setBackground('#1a3c5e').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);

  // Escreve colunas A–E
  sheet.getRange(2, 1, staticData.length, 5).setValues(staticData);

  // Colunas F e G: calculadas pelo backend (sem fórmulas nas células)
  atualizarColunasInicial(ss);

  // Estilo alternado nas linhas de dados
  for (var row = 2; row <= staticData.length + 1; row++) {
    sheet.getRange(row, 1, 1, headers.length)
      .setBackground(row % 2 === 0 ? '#f0f4f8' : '#ffffff');
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

// ============================================================
// GERAÇÃO DO JSON
// ============================================================

/**
 * Gera o conteúdo JSON com os dados dos fundos.
 * @param {Array<Object>} fundos Lista de fundos.
 * @returns {string} JSON formatado.
 */
function gerarJSON(fundos) {
  var agora = new Date();
  var payload = {
    dataAtualizacao: Utilities.formatDate(agora, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"),
    versao: '2.0',
    fonte: 'Banestes — Sistema de Gestão de Fundos (GEART via Google Sheets)',
    totalFundos: fundos.length,
    fundos: fundos.map(function (f) {
      return {
        codigo:            Number(f['FNDCD']),
        nome:              String(f['NOME']),
        tipo:              String(f['FNDCTFND']),
        podeSimular:       String(f['PODE_SIMULAR'] || 'Não'),
        classificacaoRisco: String(f['FNDCLSRISC']),
        codigoRisco:       RISCO_CODIGO[f['FNDCLSRISC']] !== undefined ? RISCO_CODIGO[f['FNDCLSRISC']] : 1,
        classificacaoCVM:  String(f['FNDCLSCVM']),
        subClassificacaoCVM: String(f['FNDSUBCVM']),
        tipoANBIMA:        String(f['FNDTOAMB']),
        taxaSimulacao:     Number(f['FNDTXSIMU']),
        cotacaoDiaUtil:    String(f['FNDCOTDIAUTIL']),
        rentabilidade: {
          diaria: Number(f['RENT_DIARIA']),
          mensal: Number(f['RENT_MENSAL']),
          anual:  Number(f['RENT_ANUAL']),
        },
      };
    }),
  };
  return JSON.stringify(payload, null, 2);
}

// ============================================================
// GERAÇÃO DO SCRIPT SQL
// ============================================================

/**
 * Gera o script SQL de UPDATE para atualização no mainframe.
 * Fundos com podeSimular="Não" ou FNDCD=0 são incluídos como comentário.
 * @param {Array<Object>} fundos Lista de fundos.
 * @returns {string} Script SQL completo.
 */
function gerarSQL(fundos) {
  var agora = new Date();
  var dataStr = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

  var linhas = [];
  linhas.push('/***********************************************************************************************************');
  linhas.push('Finalidade do script: Carga de dados atualizada conforme planilha (Somente fundos ativos no App)');
  linhas.push('Regra: FNDCLSRISC (0=Muito Baixo, 1=Baixo, 2=Médio, 3=Alto)');
  linhas.push('Gerado em: ' + dataStr);
  linhas.push('***********************************************************************************************************/');
  linhas.push('');

  fundos.forEach(function (f) {
    var cd = Number(f['FNDCD']);
    var txsimu = Number(f['FNDTXSIMU']);
    var podeSimular = String(f['PODE_SIMULAR'] || 'Não');

    if (cd === 0) {
      linhas.push('-- ATENÇÃO: FNDCD não definido para "' + f['NOME'] + '". Confirmar código no GEART/COAFI.');
      linhas.push('');
      return;
    }

    linhas.push('-- ' + cd + '; ' + f['NOME'] + (podeSimular === 'Não' ? ' [Simulação desativada]' : ''));
    linhas.push('UPDATE FNDCDT SET');
    linhas.push(
      "    FNDCTFND = '" + f['FNDCTFND'] + "', FNDCLSRISC = '" + f['FNDCLSRISC'] +
      "', FNDCLSCVM = '" + f['FNDCLSCVM'] + "', FNDSUBCVM = '" + f['FNDSUBCVM'] + "',"
    );
    linhas.push(
      "    FNDTOAMB = '" + f['FNDTOAMB'] + "', FNDTXSIMU = " + txsimu +
      ", FNDCOTDIAUTIL = '" + f['FNDCOTDIAUTIL'] + "'"
    );
    linhas.push('WHERE FNDCD = ' + cd + ';');
    linhas.push('');
  });

  linhas.push('COMMIT;');
  return linhas.join('\n');
}

// ============================================================
// TEMPLATE DO E-MAIL (inline — substitui EmailTemplate.html)
// ============================================================

/**
 * Gera o HTML completo do e-mail com os dados dos fundos.
 * @param {string}        dataStr   Data/hora formatada.
 * @param {number}        total     Total de fundos.
 * @param {Array<Object>} fundos    Lista de fundos.
 * @param {string}        nomeJson  Nome do arquivo JSON.
 * @param {string}        nomeSql   Nome do arquivo SQL.
 * @returns {string} HTML do e-mail.
 */
function buildEmailHTML(dataStr, total, fundos, nomeJson, nomeSql) {
  var RISK_COLOR = {
    'Muito Baixo': '#1e8e3e',
    'Baixo':       '#e37400',
    'Médio':       '#ea8600',
    'Alto':        '#d93025',
  };

  var linhasTabela = '';
  fundos.forEach(function (f, idx) {
    var bg         = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
    var risco      = String(f['FNDCLSRISC'] || '');
    var riscoColor = RISK_COLOR[risco] || '#5f6368';
    var rentAnual  = Number(f['RENT_ANUAL'] || 0);
    var rentStr    = rentAnual > 0 ? (rentAnual * 100).toFixed(2) + '%' : '—';
    var pSim       = String(f['PODE_SIMULAR'] || 'Não');
    var taxa       = Number(f['FNDTXSIMU'] || 0);
    var taxaStr    = (pSim === 'Sim' && taxa > 0) ? (taxa * 100).toFixed(2) + '%' : '—';

    linhasTabela +=
      '<tr style="background:' + bg + ';">' +
      '<td style="padding:8px 12px;font-size:11px;font-weight:700;color:#5f6368;border-top:1px solid #f1f3f4;">' + (Number(f['FNDCD']) || '—') + '</td>' +
      '<td style="padding:8px 12px;font-size:11px;color:#202124;border-top:1px solid #f1f3f4;">' + String(f['NOME']) + '</td>' +
      '<td style="padding:8px 12px;text-align:center;border-top:1px solid #f1f3f4;">' +
        '<span style="background:' + riscoColor + '20;color:' + riscoColor + ';font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;">' + risco + '</span>' +
      '</td>' +
      '<td style="padding:8px 12px;text-align:center;font-size:11px;font-weight:700;color:' + (pSim === 'Sim' ? '#1e8e3e' : '#9aa0a6') + ';border-top:1px solid #f1f3f4;">' + pSim + '</td>' +
      '<td style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#1a5276;border-top:1px solid #f1f3f4;">' + taxaStr + '</td>' +
      '<td style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#1e8e3e;border-top:1px solid #f1f3f4;">' + rentStr + '</td>' +
      '</tr>';
  });

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Banestes — Atualização de Fundos</title></head>' +
  '<body style="margin:0;padding:0;background:#f4f6f9;font-family:\'Segoe UI\',Roboto,Arial,sans-serif;">' +
  '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f9;"><tr><td align="center" style="padding:32px 16px;">' +
  '<table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">' +

  // HEADER
  '<tr><td style="background:linear-gradient(135deg,#1a3c5e 0%,#2d6a9f 100%);padding:30px 36px 24px;">' +
  '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
  '<td><div style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Banestes Assessoria de Investimentos</div>' +
  '<div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">🏦 Atualização de Fundos</div>' +
  '<div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:6px;">Dados atualizados em ' + dataStr + '</div></td>' +
  '<td style="text-align:right;vertical-align:middle;"><div style="background:rgba(255,255,255,0.15);border-radius:50%;width:56px;height:56px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;line-height:56px;text-align:center;">📊</div></td>' +
  '</tr></table></td></tr>' +

  // INTRO
  '<tr><td style="padding:28px 36px 20px;">' +
  '<p style="font-size:14px;color:#3c4043;line-height:1.6;margin:0;">Prezado(a),</p>' +
  '<p style="font-size:14px;color:#3c4043;line-height:1.6;margin:12px 0 0;">Seguem em anexo os arquivos atualizados da carteira de fundos Banestes, gerados automaticamente pelo Sistema de Gestão de Fundos — T.I. Os dados de rentabilidade foram extraídos da tabela <strong>GEART</strong>.</p>' +
  '</td></tr>' +

  // SUMMARY CARDS
  '<tr><td style="padding:0 36px 24px;">' +
  '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
  '<td width="48%" style="background:#f0f4f8;border-radius:8px;padding:16px 18px;vertical-align:top;">' +
  '<div style="font-size:10px;font-weight:700;color:#5f6368;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Total de Fundos</div>' +
  '<div style="font-size:32px;font-weight:700;color:#1a3c5e;">' + total + '</div>' +
  '<div style="font-size:11px;color:#80868b;margin-top:2px;">fundos ativos no App</div></td>' +
  '<td width="4%"></td>' +
  '<td width="48%" style="background:#f0f4f8;border-radius:8px;padding:16px 18px;vertical-align:top;">' +
  '<div style="font-size:10px;font-weight:700;color:#5f6368;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Arquivos Enviados</div>' +
  '<div style="font-size:13px;color:#202124;margin-bottom:4px;">📋 ' + nomeJson + '</div>' +
  '<div style="font-size:13px;color:#202124;">🗄️ ' + nomeSql + '</div></td>' +
  '</tr></table></td></tr>' +

  // DIVIDER
  '<tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #e8eaed;margin:0;" /></td></tr>' +

  // TABELA DE FUNDOS
  '<tr><td style="padding:20px 36px 8px;">' +
  '<div style="font-size:13px;font-weight:700;color:#1a3c5e;margin-bottom:12px;">💼 Resumo dos Fundos</div>' +
  '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e8eaed;">' +
  '<tr style="background:#1a3c5e;">' +
  '<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.6px;">Cód.</th>' +
  '<th style="padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.6px;">Fundo</th>' +
  '<th style="padding:9px 12px;text-align:center;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.6px;">Risco</th>' +
  '<th style="padding:9px 12px;text-align:center;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.6px;">Simular</th>' +
  '<th style="padding:9px 12px;text-align:right;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.6px;">Taxa Sim.</th>' +
  '<th style="padding:9px 12px;text-align:right;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.6px;">Rent. Anual</th>' +
  '</tr>' +
  linhasTabela +
  '</table></td></tr>' +

  // INSTRUÇÕES SOBRE ANEXOS
  '<tr><td style="padding:20px 36px 24px;">' +
  '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8e1;border-radius:8px;border-left:4px solid #fbbc04;"><tr><td style="padding:14px 16px;">' +
  '<div style="font-size:12px;font-weight:700;color:#7b5800;margin-bottom:4px;">ℹ️ Sobre os Arquivos Anexos</div>' +
  '<div style="font-size:12px;color:#5f4200;line-height:1.5;">' +
  '<strong>' + nomeJson + '</strong> — JSON completo com todos os dados dos fundos e rentabilidades (fonte: GEART). Utilizar para atualização do App.<br /><br />' +
  '<strong>' + nomeSql + '</strong> — Script SQL de UPDATE pronto para execução no <strong>mainframe</strong>. Validar antes de rodar em produção.</div>' +
  '</td></tr></table></td></tr>' +

  // DIVIDER
  '<tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #e8eaed;margin:0;" /></td></tr>' +

  // FOOTER
  '<tr><td style="padding:20px 36px 28px;">' +
  '<p style="font-size:12px;color:#80868b;line-height:1.6;margin:0;">Este e-mail foi gerado automaticamente pelo <strong>Sistema de Gestão de Fundos</strong> — Departamento de T.I. — Banestes.<br />Em caso de dúvidas, entre em contato com <a href="mailto:spandrade@banestes.com.br" style="color:#2d6a9f;text-decoration:none;">spandrade@banestes.com.br</a>.</p>' +
  '</td></tr>' +
  '<tr><td style="background:#f8f9fa;padding:12px 36px;border-top:1px solid #e8eaed;">' +
  '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
  '<td style="font-size:10px;color:#9aa0a6;">🏦 Banestes S.A. — Banco do Estado do Espírito Santo<br />Departamento de T.I. — Sistema de Gestão de Fundos</td>' +
  '<td style="text-align:right;font-size:10px;color:#9aa0a6;">v2.0.0<br />Gerado em ' + dataStr + '</td>' +
  '</tr></table></td></tr>' +

  '</table></td></tr></table></body></html>';
}

// ============================================================
// ENVIO DE E-MAIL
// ============================================================

/**
 * Envia o e-mail com os arquivos JSON e SQL como anexos.
 * @param {string}        jsonStr Conteúdo do JSON.
 * @param {string}        sqlStr  Conteúdo do SQL.
 * @param {Array<Object>} fundos  Lista de fundos (para preview no e-mail).
 * @returns {Object} Resultado do envio.
 */
function enviarEmail(jsonStr, sqlStr, fundos) {
  var agora = new Date();
  var dataStr = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  var sufixo  = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');

  var destinatarios = [CONFIG.DEVELOPER_EMAIL];
  // Descomentar após validação:
  // destinatarios = destinatarios.concat(CONFIG.ANALYST_EMAILS || []);

  var nomeJson = 'fundos_banestes_' + sufixo + '.json';
  var nomeSql  = 'script_mainframe_' + sufixo + '.sql';

  var jsonBlob = Utilities.newBlob('').setDataFromString(jsonStr, 'UTF-8')
    .setName(nomeJson).setContentType('application/json');
  var sqlBlob  = Utilities.newBlob('').setDataFromString(sqlStr, 'UTF-8')
    .setName(nomeSql).setContentType('text/plain');

  var corpoEmail = buildEmailHTML(dataStr, fundos.length, fundos, nomeJson, nomeSql);

  destinatarios.forEach(function (dest) {
    MailApp.sendEmail({
      to: dest,
      subject: '🏦 Banestes — Atualização de Fundos — ' + dataStr,
      htmlBody: corpoEmail,
      attachments: [jsonBlob, sqlBlob],
    });
  });

  return {
    success: true,
    dataEnvio: dataStr,
    destinatarios: destinatarios,
    totalFundos: fundos.length,
    nomeJson: nomeJson,
    nomeSql: nomeSql,
  };
}

// ============================================================
// LOG DE ENVIOS
// ============================================================

/**
 * Garante que a aba Log_Envios existe e retorna a referência.
 */
function garantirAbaLog(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEET_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_LOG);
    var headers = ['Data/Hora', 'Destinatários', 'Qtd. Fundos', 'Arquivo JSON', 'Arquivo SQL', 'Status'];
    var hRange  = sheet.getRange(1, 1, 1, headers.length);
    hRange.setValues([headers]).setBackground('#1a3c5e').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    [160, 280, 90, 240, 240, 200].forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
  }
  return sheet;
}

/**
 * Registra um envio bem-sucedido na aba de log e no PropertiesService.
 */
function registrarLog(agora, resultado, jsonStr, sqlStr) {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = garantirAbaLog(ss);
  var sufixo   = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');

  logSheet.appendRow([
    Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
    resultado.destinatarios.join(', '),
    resultado.totalFundos,
    resultado.nomeJson || ('fundos_banestes_' + sufixo + '.json'),
    resultado.nomeSql  || ('script_mainframe_' + sufixo + '.sql'),
    'Enviado com sucesso ✅',
  ]);
  logSheet.getRange(logSheet.getLastRow(), 1, 1, 6).setBackground('#e8f5e9');

  var props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.PROP_LAST_UPDATE,     agora.toISOString());
  props.setProperty(CONFIG.PROP_LAST_RECIPIENTS, resultado.destinatarios.join(', '));
  props.setProperty(CONFIG.PROP_LAST_STATUS,     'Enviado com sucesso — ' + resultado.dataEnvio);
  props.setProperty(CONFIG.PROP_LAST_JSON,
    jsonStr.length > CONFIG.MAX_PROPERTY_LENGTH
      ? jsonStr.substring(0, CONFIG.MAX_PROPERTY_LENGTH) + '\n...(truncado)'
      : jsonStr);
  props.setProperty(CONFIG.PROP_LAST_SQL,
    sqlStr.length > CONFIG.MAX_PROPERTY_LENGTH
      ? sqlStr.substring(0, CONFIG.MAX_PROPERTY_LENGTH) + '\n...(truncado)'
      : sqlStr);
}

/**
 * Registra um erro na aba de log e no PropertiesService.
 */
function registrarErroLog(err) {
  try {
    var ss       = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = garantirAbaLog(ss);
    var agora    = new Date();
    var msgErro  = 'Erro: ' + (err.message || String(err));

    logSheet.appendRow([
      Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
      '—', 0, '—', '—', msgErro,
    ]);
    logSheet.getRange(logSheet.getLastRow(), 1, 1, 6).setBackground('#fce8e6');

    PropertiesService.getScriptProperties()
      .setProperty(CONFIG.PROP_LAST_STATUS, msgErro);
  } catch (e) {
    Logger.log('Erro ao registrar erro no log: ' + e.message);
  }
}

/**
 * Registra uma mensagem informativa na aba de log (sem envio de e-mail).
 * Usado para eventos como debounce e ausência de alterações nos dados.
 * @param {string} mensagem Mensagem informativa.
 */
function registrarInfoLog(mensagem) {
  try {
    var ss       = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = garantirAbaLog(ss);
    var agora    = new Date();

    logSheet.appendRow([
      Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
      '—', 0, '—', '—', mensagem,
    ]);
    logSheet.getRange(logSheet.getLastRow(), 1, 1, 6).setBackground('#e8f0fe');
  } catch (e) {
    Logger.log('Aviso ao registrar info no log: ' + e.message);
  }
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

/**
 * Gera o JSON e o Script SQL e envia por e-mail.
 * Chamada pelo acionador automático (onChange / time-based) ou manualmente.
 * Possui verificação de hash para evitar envios duplicados.
 */
function gerarEEnviar() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // Recalcula valores derivados no backend antes de ler os dados,
    // garantindo que as células F e G da aba Inicial e col D da aba
    // PodeSimular reflitam os dados mais recentes sem fórmulas nas células.
    sincronizarValoresDerivados(ss);

    var fundos = obterDadosFundos();
    if (fundos.length === 0) {
      throw new Error('Nenhum fundo encontrado. Verifique as abas "Inicial" ou "Fundos" na planilha.');
    }

    var jsonStr  = gerarJSON(fundos);
    var jsonHash = computeHash(jsonStr);

    var props    = PropertiesService.getScriptProperties();
    var lastHash = props.getProperty(CONFIG.PROP_LAST_HASH);

    if (lastHash === jsonHash) {
      var msg = 'Dados idênticos ao último envio — nenhuma ação necessária.';
      Logger.log(msg);
      // Registra no log para visibilidade no painel — sem envio de e-mail
      registrarInfoLog('ℹ️ ' + msg);
      try { SpreadsheetApp.getUi().alert('ℹ️ Sem alterações', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
      return { success: false, reason: 'no_change' };
    }

    var sqlStr   = gerarSQL(fundos);
    var resultado = enviarEmail(jsonStr, sqlStr, fundos);
    var agora    = new Date();
    registrarLog(agora, resultado, jsonStr, sqlStr);

    props.setProperty(CONFIG.PROP_LAST_HASH, jsonHash);
    props.setProperty(CONFIG.PROP_LAST_RUN,  agora.toISOString());

    Logger.log('Envio concluído: ' + resultado.dataEnvio + ' — ' + resultado.totalFundos + ' fundos.');
    try {
      SpreadsheetApp.getUi().alert(
        '✅ Concluído!',
        'JSON e Script SQL gerados e enviados com sucesso!\n\nData: ' + resultado.dataEnvio +
        '\nFundos: ' + resultado.totalFundos +
        '\nDestinatários: ' + resultado.destinatarios.join(', '),
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (e) { /* trigger sem UI */ }

    return resultado;
  } catch (e) {
    Logger.log('ERRO em gerarEEnviar: ' + e.message);
    registrarErroLog(e);
    try { SpreadsheetApp.getUi().alert('❌ Erro', e.message, SpreadsheetApp.getUi().ButtonSet.OK); } catch (ui) {}
    throw e;
  }
}

// ============================================================
// FUNÇÃO DE TESTE DE E-MAIL (executar via editor do Apps Script)
// ============================================================

/**
 * Envia um e-mail de TESTE para o e-mail do desenvolvedor.
 * Use esta função diretamente no editor do Apps Script para validar o envio
 * sem depender de triggers ou alterações na planilha.
 *
 * Utiliza exclusivamente dados reais da planilha — mesma lógica de gerarEEnviar().
 * Os arquivos são prefixados com "TESTE_" para identificação fácil.
 */
function testarEnvioEmail() {
  try {
    var ss      = SpreadsheetApp.getActiveSpreadsheet();
    var agora   = new Date();
    var dataStr = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    var sufixo  = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');

    // Recalcula valores derivados no backend antes de ler os dados,
    // garantindo que cols F e G de Inicial e col D de PodeSimular estejam atualizadas.
    sincronizarValoresDerivados(ss);

    var fundos = obterDadosFundos();
    if (fundos.length === 0) {
      throw new Error('Nenhum fundo encontrado. Verifique as abas "Inicial" ou "Fundos" na planilha.');
    }

    var jsonStr  = gerarJSON(fundos);
    var sqlStr   = gerarSQL(fundos);
    var nomeJson = 'TESTE_fundos_banestes_' + sufixo + '.json';
    var nomeSql  = 'TESTE_script_mainframe_' + sufixo + '.sql';

    var jsonBlob = Utilities.newBlob('').setDataFromString(jsonStr, 'UTF-8')
      .setName(nomeJson).setContentType('application/json');
    var sqlBlob  = Utilities.newBlob('').setDataFromString(sqlStr, 'UTF-8')
      .setName(nomeSql).setContentType('text/plain');

    var corpoEmail = buildEmailHTML(dataStr, fundos.length, fundos, nomeJson, nomeSql);

    MailApp.sendEmail({
      to: CONFIG.DEVELOPER_EMAIL,
      subject: '[TESTE] 🏦 Banestes — Validação de Envio — ' + dataStr,
      htmlBody: corpoEmail,
      attachments: [jsonBlob, sqlBlob],
    });

    Logger.log('E-mail de teste enviado para: ' + CONFIG.DEVELOPER_EMAIL);
    try {
      SpreadsheetApp.getUi().alert(
        '✅ Teste Concluído!',
        'E-mail de teste enviado!\n\nDestinatário: ' + CONFIG.DEVELOPER_EMAIL +
        '\nFundos: ' + fundos.length + '\nAnexos: ' + nomeJson + ', ' + nomeSql,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (e) { /* sem UI */ }

  } catch (e) {
    Logger.log('ERRO em testarEnvioEmail: ' + e.message);
    try { SpreadsheetApp.getUi().alert('❌ Erro no Teste', e.message, SpreadsheetApp.getUi().ButtonSet.OK); } catch (ui) {}
    throw e;
  }
}

// ============================================================
// ACIONADORES (TRIGGERS)
// ============================================================

/**
 * Configura os acionadores automáticos:
 *  1. Semanal (toda segunda-feira às 8h) → gerarEEnviar
 *  2. onChange → aoAlterarPlanilha (reage a alterações nos dados da planilha, incluindo IMPORTRANGE)
 */
function configurarAcionador() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'gerarEEnviar' || fn === 'aoAlterarPlanilha') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Acionador semanal
  ScriptApp.newTrigger('gerarEEnviar')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();

  // Acionador onChange (reage a atualizações inclusive via IMPORTRANGE)
  ScriptApp.newTrigger('aoAlterarPlanilha')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onChange()
    .create();

  Logger.log('Acionadores configurados com sucesso.');
  try {
    SpreadsheetApp.getUi().alert(
      '⏰ Acionadores configurados!',
      'Envio automático ativo:\n• Semanal: toda segunda-feira às 8h\n• Imediato: toda vez que a planilha for atualizada (incluindo IMPORTRANGE)',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}
}

/**
 * Remove todos os acionadores automáticos.
 */
function removerAcionador() {
  var removidos = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'gerarEEnviar' || fn === 'aoAlterarPlanilha') {
      ScriptApp.deleteTrigger(t);
      removidos++;
    }
  });
  Logger.log('Acionadores removidos: ' + removidos);
  try {
    SpreadsheetApp.getUi().alert(
      '🗑️ Acionadores removidos',
      removidos > 0
        ? removidos + ' acionador(es) automático(s) removido(s) com sucesso.'
        : 'Nenhum acionador automático estava configurado.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}
}

// ============================================================
// API PARA O PAINEL DE LOG (Sidebar.html)
// ============================================================

/**
 * Retorna o status atual do sistema para exibição no painel.
 * @returns {Object} Informações de status.
 */
function obterStatusAtual() {
  var props          = PropertiesService.getScriptProperties();
  var lastUpdateIso  = props.getProperty(CONFIG.PROP_LAST_UPDATE);
  var lastStatus     = props.getProperty(CONFIG.PROP_LAST_STATUS)     || 'Nunca enviado';
  var lastRecipients = props.getProperty(CONFIG.PROP_LAST_RECIPIENTS) || '—';

  var ultimaAtualizacao = 'Nunca';
  if (lastUpdateIso) {
    try {
      ultimaAtualizacao = Utilities.formatDate(
        new Date(lastUpdateIso), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'
      );
    } catch (e) { ultimaAtualizacao = lastUpdateIso; }
  }

  var triggers = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'gerarEEnviar' || t.getHandlerFunction() === 'aoAlterarPlanilha';
  });

  var totalFundos = 0;
  try { totalFundos = obterDadosFundos().length; } catch (e) {}

  return {
    ultimaAtualizacao:  ultimaAtualizacao,
    ultimoStatus:       lastStatus,
    destinatariosAtivos: lastRecipients,
    acionadoresAtivos:  triggers.length,
    totalFundos:        totalFundos,
    versao:             '2.0.0',
  };
}

/**
 * Retorna os últimos N registros da aba Log_Envios (mais recente primeiro).
 * @param {number} n Quantidade de registros (padrão 20).
 * @returns {Array<Object>} Lista de logs.
 */
function obterLogsRecentes(n) {
  n = n || 20;
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_LOG);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var lastRow  = sheet.getLastRow();
  var startRow = Math.max(2, lastRow - n + 1);
  var numRows  = lastRow - startRow + 1;
  var data     = sheet.getRange(startRow, 1, numRows, 6).getValues();
  var logs     = [];

  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    var dtVal = row[0];
    var dtStr = '';
    if (dtVal instanceof Date) {
      dtStr = Utilities.formatDate(dtVal, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
    } else {
      dtStr = String(dtVal || '');
    }
    logs.push({
      dataHora:     dtStr,
      destinatarios: String(row[1] || ''),
      qtdFundos:    Number(row[2] || 0),
      arquivoJson:  String(row[3] || ''),
      arquivoSql:   String(row[4] || ''),
      status:       String(row[5] || ''),
    });
  }
  return logs;
}

/**
 * Retorna o conteúdo do último JSON gerado (para exibição no painel).
 * @returns {string}
 */
function obterUltimoJSON() {
  return PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_LAST_JSON) || '';
}

/**
 * Retorna o conteúdo do último Script SQL gerado (para exibição no painel).
 * @returns {string}
 */
function obterUltimoSQL() {
  return PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_LAST_SQL) || '';
}
