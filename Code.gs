/***************************************************************************************************************
 * Projeto JSON - Gerenciador de Fundos de Investimento - Banestes
 * Desenvolvedor: spandrade@banestes.com.br
 *
 * Descrição: Gera automaticamente o JSON atualizado com rentabilidade dos fundos
 *            (dados puxados da tabela GEART), o script SQL para atualização no
 *            mainframe, e envia ambos por e-mail com layout personalizado.
 *            Inclui painel de gestão para controle e monitoramento.
 ***************************************************************************************************************/

// ============================================================
// CONFIGURAÇÕES GLOBAIS
// ============================================================
var CONFIG = {
  // E-mail do desenvolvedor (ativo para testes)
  DEVELOPER_EMAIL: 'spandrade@banestes.com.br',

  // Analistas — desabilitado durante testes. Descomentar após validação:
  // ANALYST_EMAILS: [
  //   'iodutra@banestes.com.br',    // Igor Dutra
  //   'jcrepossi@banestes.com.br',  // Juliana Crepossi (chefe)
  // ],

  // Nomes das abas da planilha
  SHEET_FUNDS: 'Fundos',
  SHEET_LOG: 'Log_Envios',

  // Chaves de propriedades para persistência
  PROP_LAST_UPDATE: 'LAST_UPDATE',
  PROP_LAST_JSON: 'LAST_JSON',
  PROP_LAST_SQL: 'LAST_SQL',
  PROP_LAST_RECIPIENTS: 'LAST_RECIPIENTS',
  PROP_LAST_STATUS: 'LAST_STATUS',

  // Limite seguro de caracteres por propriedade do PropertiesService (~9 000 max)
  MAX_PROPERTY_LENGTH: 8500,
};

// Mapeamento de risco para código numérico (regra FNDCLSRISC)
var RISCO_CODIGO = {
  'Muito Baixo': 0,
  'Baixo': 1,
  'Médio': 2,
  'Alto': 3,
};

// ============================================================
// MENU E INICIALIZAÇÃO
// ============================================================

/**
 * Cria o menu customizado ao abrir a planilha.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏦 Gerenciador Fundos')
    .addItem('📊 Abrir Painel de Gestão', 'abrirPainel')
    .addSeparator()
    .addItem('🔄 Gerar e Enviar Agora', 'gerarEEnviar')
    .addItem('🧪 Testar Envio de E-mail (Desenvolvedor)', 'testarEnvioEmail')
    .addSeparator()
    .addItem('⏰ Configurar Acionador Automático', 'configurarAcionador')
    .addItem('🗑️ Remover Acionador Automático', 'removerAcionador')
    .addToUi();
}

/**
 * Abre o painel lateral de gestão.
 */
function abrirPainel() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('🏦 Gerenciador de Fundos')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Ponto de entrada para implantação como aplicativo da web.
 * Obrigatório para que o Apps Script consiga servir a interface via URL.
 * @param {Object} e - Parâmetros da requisição HTTP GET.
 * @returns {HtmlOutput} Página HTML do painel de gestão.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Gerenciador de Fundos — Banestes');
}

// ============================================================
// DADOS DOS FUNDOS
// ============================================================

/**
 * Obtém os dados dos fundos da aba "Fundos".
 * Se a aba não existir, cria com os dados iniciais (simulando GEART).
 * @returns {Array<Object>} Lista de objetos representando cada fundo.
 */
function obterDadosFundos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
    if (!row[0] && !row[1]) continue; // pular linhas vazias
    var fundo = {};
    headers.forEach(function (h, idx) {
      fundo[h] = row[idx];
    });
    fundos.push(fundo);
  }

  return fundos;
}

/**
 * Cria e popula a aba "Fundos" com os dados iniciais dos fundos ativos.
 * A coluna RENT_* simula os dados de rentabilidade vindos da tabela GEART.
 * @param {Spreadsheet} ss Objeto da planilha ativa.
 * @returns {Sheet} A aba criada.
 */
function criarAbaDadosFundos(ss) {
  // Cabeçalhos
  var headers = [
    'FNDCD', 'NOME', 'FNDCTFND', 'FNDCLSRISC', 'FNDCLSCVM', 'FNDSUBCVM',
    'FNDTOAMB', 'FNDTXSIMU', 'FNDCOTDIAUTIL',
    'RENT_DIARIA', 'RENT_MENSAL', 'RENT_ANUAL',
  ];

  // Dados dos fundos ativos + rentabilidade simulada (fonte: GEART)
  var fundosIniciais = [
    [2,  'BANESTES INVEST MONEY',          'Renda Fixa',                         'Baixo',      'Renda Fixa',                         'Não se aplica',             'Renda Fixa Duração Baixa Soberano',                     0.1338, 'N', 0.0365, 0.1123, 0.1338],
    [4,  'BANESTES VIP DI',                'Renda Fixa',                         'Baixo',      'Renda Fixa',                         'Referenciado DI',           'Renda Fixa Duração Baixa Grau de Investimento',          0.1420, 'N', 0.0388, 0.1195, 0.1420],
    [6,  'BANESTES VITORIA 500',           'Renda Fixa',                         'Baixo',      'Renda Fixa',                         'Referenciado DI',           'Renda Fixa Duração Baixa Grau de Investimento',          0.1275, 'N', 0.0348, 0.1073, 0.1275],
    [8,  'BANESTES INSTITUCIONAL',         'Renda Fixa',                         'Médio',      'Renda Fixa',                         'Não se aplica',             'Renda Fixa Duração Alta Grau de Investimento',           0.1456, 'N', 0.0398, 0.1225, 0.1456],
    [15, 'BANESTES BTG PACTUAL ABSOLUTO',  'Ações',                              'Alto',       'Ações',                              'Não se aplica',             'Ações Ativos Livre',                                     0.3580, 'N', 0.0978, 0.3012, 0.3580],
    [16, 'BANESTES VALORES',               'Renda Fixa',                         'Baixo',      'Renda Fixa',                         'Referenciado DI',           'Renda Fixa Duração Baixa Grau de Investimento',          0.1414, 'N', 0.0386, 0.1189, 0.1414],
    [18, 'BANESTES LIQUIDEZ',              'Renda Fixa',                         'Baixo',      'Renda Fixa',                         'Referenciado DI',           'Renda Fixa Duração Baixa Grau de Investimento',          0.1452, 'N', 0.0397, 0.1220, 0.1452],
    [22, 'BANESTES INCENTIVADO RF',        'Renda Fixa (Fundo de Infraestrutura)', 'Alto',     'Renda Fixa (Fundo de Infraestrutura)', 'Crédito Privado',          'Renda Fixa Duração Livre Crédito Livre',                 0.1318, 'S', 0.0360, 0.1108, 0.1318],
    [23, 'BANESTES ESTRATEGIA',            'Renda Fixa',                         'Médio',      'Renda Fixa',                         'Não se aplica',             'Renda Fixa Duração Livre Grau de Investimento',          0.1406, 'S', 0.0384, 0.1181, 0.1406],
    [24, 'BANESTES DIVIDENDOS',            'Ações',                              'Alto',       'Ações',                              'Não se aplica',             'Ações Ativo Dividendos',                                 0.4441, 'S', 0.1213, 0.3734, 0.4441],
    [28, 'BANESTES INVEST FACIL',          'Renda Fixa Simples',                 'Muito Baixo','Renda Fixa Simples',                 'Renda Fixa Simples',        'Renda Fixa Simples',                                     0.1318, 'N', 0.0360, 0.1108, 0.1318],
    [31, 'BANESTES IMA-B 5',               'Renda Fixa',                         'Médio',      'Renda Fixa',                         'Longo Prazo',               'Renda Fixa Duração Livre Soberano',                      0.1138, 'N', 0.0311, 0.0957, 0.1138],
    [32, 'BANESTES CRED CORP',             'Renda Fixa',                         'Alto',       'Renda Fixa',                         'Crédito Privado Longo Prazo','Renda Fixa Duração Livre Crédito Livre',                0.1442, 'N', 0.0394, 0.1212, 0.1442],
    [33, 'BANESTES MULTIESTRATEGIA',       'Multimercado',                       'Alto',       'Multimercado',                       'Não se aplica',             'Multimercado Estratégia Livre',                          0.1421, 'S', 0.0388, 0.1195, 0.1421],
    [34, 'BANESTES SELECTION',             'Renda Fixa',                         'Médio',      'Renda Fixa',                         'Crédito Privado',           'Renda Fixa Duração Livre Grau de Investimento',          0.1433, 'N', 0.0391, 0.1205, 0.1433],
    [36, 'BANESTES TENAX',                 'Ações',                              'Alto',       'Ações',                              'Não se aplica',             'Ações Ativos Livre',                                     0.0,    'N', 0.0,    0.0,    0.0   ],
    [38, 'BANESTES SYNERGY',               'Ações',                              'Alto',       'Ações',                              'Não se aplica',             'Ações Ativos Livre',                                     0.0,    'N', 0.0,    0.0,    0.0   ],
  ];

  var sheet = ss.insertSheet(CONFIG.SHEET_FUNDS, 0);

  // Cabeçalho
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground('#1a3c5e');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(10);

  // Dados
  sheet.getRange(2, 1, fundosIniciais.length, headers.length).setValues(fundosIniciais);

  // Formatação de colunas numéricas
  sheet.getRange(2, 8, fundosIniciais.length, 1).setNumberFormat('0.0000'); // FNDTXSIMU
  sheet.getRange(2, 10, fundosIniciais.length, 3).setNumberFormat('0.0000'); // Rentabilidades

  // Formatação alternada de linhas
  for (var r = 2; r <= fundosIniciais.length + 1; r++) {
    var bg = r % 2 === 0 ? '#f0f4f8' : '#ffffff';
    sheet.getRange(r, 1, 1, headers.length).setBackground(bg);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  // Adicionar nota explicativa sobre a fonte GEART
  sheet.getRange(1, 10).setNote(
    'RENT_DIARIA, RENT_MENSAL, RENT_ANUAL: dados de rentabilidade puxados da tabela GEART (acesso leitura).'
  );

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
    versao: '1.0',
    fonte: 'Banestes — Sistema de Gestão de Fundos (GEART)',
    totalFundos: fundos.length,
    fundos: fundos.map(function (f) {
      return {
        codigo: Number(f['FNDCD']),
        nome: String(f['NOME']),
        tipo: String(f['FNDCTFND']),
        classificacaoRisco: String(f['FNDCLSRISC']),
        codigoRisco: RISCO_CODIGO[f['FNDCLSRISC']] !== undefined ? RISCO_CODIGO[f['FNDCLSRISC']] : 1,
        classificacaoCVM: String(f['FNDCLSCVM']),
        subClassificacaoCVM: String(f['FNDSUBCVM']),
        tipoANBIMA: String(f['FNDTOAMB']),
        taxaSimulacao: Number(f['FNDTXSIMU']),
        cotacaoDiaUtil: String(f['FNDCOTDIAUTIL']),
        rentabilidade: {
          diaria: Number(f['RENT_DIARIA']),
          mensal: Number(f['RENT_MENSAL']),
          anual: Number(f['RENT_ANUAL']),
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
 * @param {Array<Object>} fundos Lista de fundos.
 * @returns {string} Script SQL completo.
 */
function gerarSQL(fundos) {
  var agora = new Date();
  var dataStr = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');

  var linhas = [];
  linhas.push('/***************************************************************************************************************');
  linhas.push('Finalidade do script: Carga de dados atualizada conforme planilha (Somente fundos ativos no App)');
  linhas.push('Regra: FNDCLSRISC (0=Muito Baixo, 1=Baixo, 2=Médio, 3=Alto)');
  linhas.push('Gerado em: ' + dataStr);
  linhas.push('***************************************************************************************************************/');
  linhas.push('');

  fundos.forEach(function (f) {
    var txsimu = Number(f['FNDTXSIMU']);
    linhas.push('-- ' + f['FNDCD'] + '; ' + f['NOME']);
    linhas.push('UPDATE FNDCDT SET ');
    linhas.push(
      "    FNDCTFND = '" + f['FNDCTFND'] + "', FNDCLSRISC = '" + f['FNDCLSRISC'] +
      "', FNDCLSCVM = '" + f['FNDCLSCVM'] + "', FNDSUBCVM = '" + f['FNDSUBCVM'] + "',"
    );
    linhas.push(
      "    FNDTOAMB = '" + f['FNDTOAMB'] + "', FNDTXSIMU = " + txsimu +
      ", FNDCOTDIAUTIL = '" + f['FNDCOTDIAUTIL'] + "'"
    );
    linhas.push('WHERE FNDCD = ' + f['FNDCD'] + ';');
    linhas.push('');
  });

  linhas.push('COMMIT;');
  return linhas.join('\n');
}

// ============================================================
// ENVIO DE E-MAIL
// ============================================================

/**
 * Envia o e-mail com os arquivos JSON e SQL como anexos.
 * @param {string} jsonStr Conteúdo do JSON.
 * @param {string} sqlStr Conteúdo do SQL.
 * @param {Array<Object>} fundos Lista de fundos (para preview no e-mail).
 * @returns {Object} Resultado do envio.
 */
function enviarEmail(jsonStr, sqlStr, fundos) {
  var agora = new Date();
  var dataStr = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  var sufixoArquivo = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');

  // ---- Destinatários ----
  var destinatarios = [
    CONFIG.DEVELOPER_EMAIL, // Desenvolvedor — ativo para testes
    // Analistas — descomentar após validação:
    // 'iodutra@banestes.com.br',    // Igor Dutra
    // 'jcrepossi@banestes.com.br',  // Juliana Crepossi (chefe)
  ];

  // ---- Anexos ----
  // Usa setDataFromString com codificação UTF-8 explícita para evitar o erro
  // "Unexpected error while getting the method or property newBlob on object Utilities"
  // que ocorre quando Utilities.newBlob recebe strings com caracteres especiais.
  var jsonBlob = Utilities.newBlob('')
    .setDataFromString(jsonStr, 'UTF-8')
    .setName('fundos_banestes_' + sufixoArquivo + '.json')
    .setContentType('application/json');
  var sqlBlob = Utilities.newBlob('')
    .setDataFromString(sqlStr, 'UTF-8')
    .setName('script_mainframe_' + sufixoArquivo + '.sql')
    .setContentType('text/plain');

  // ---- Corpo HTML do e-mail ----
  var template = HtmlService.createTemplateFromFile('EmailTemplate');
  template.dataAtualizacao = dataStr;
  template.totalFundos = fundos.length;
  template.fundos = fundos;
  template.nomeArquivoJson = 'fundos_banestes_' + sufixoArquivo + '.json';
  template.nomeArquivoSql = 'script_mainframe_' + sufixoArquivo + '.sql';
  var corpoEmail = template.evaluate().getContent();

  // ---- Envio ----
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
  };
}

// ============================================================
// LOG DE ENVIOS
// ============================================================

/**
 * Registra o envio na aba de log e salva dados no PropertiesService.
 */
function registrarLog(agora, resultado, jsonStr, sqlStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(CONFIG.SHEET_LOG);

  if (!logSheet) {
    logSheet = ss.insertSheet(CONFIG.SHEET_LOG);
    var cabHeaders = ['Data/Hora', 'Destinatários', 'Qtd. Fundos', 'Arquivo JSON', 'Arquivo SQL', 'Status'];
    var cabRange = logSheet.getRange(1, 1, 1, cabHeaders.length);
    cabRange.setValues([cabHeaders]);
    cabRange.setBackground('#1a3c5e');
    cabRange.setFontColor('#ffffff');
    cabRange.setFontWeight('bold');
    logSheet.setFrozenRows(1);
    logSheet.setColumnWidth(1, 160);
    logSheet.setColumnWidth(2, 280);
    logSheet.setColumnWidth(3, 90);
    logSheet.setColumnWidth(4, 240);
    logSheet.setColumnWidth(5, 240);
    logSheet.setColumnWidth(6, 160);
  }

  var sufixo = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  logSheet.appendRow([
    Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss'),
    resultado.destinatarios.join(', '),
    resultado.totalFundos,
    'fundos_banestes_' + sufixo + '.json',
    'script_mainframe_' + sufixo + '.sql',
    'Enviado com sucesso ✅',
  ]);

  // Colorir a última linha
  var lastRow = logSheet.getLastRow();
  logSheet.getRange(lastRow, 1, 1, 6).setBackground('#e8f5e9');

  // Persistir no PropertiesService (limite ~9000 chars por propriedade)
  var props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.PROP_LAST_UPDATE, agora.toISOString());
  props.setProperty(
    CONFIG.PROP_LAST_JSON,
    jsonStr.length > CONFIG.MAX_PROPERTY_LENGTH ? jsonStr.substring(0, CONFIG.MAX_PROPERTY_LENGTH) + '\n...(truncado)' : jsonStr
  );
  props.setProperty(
    CONFIG.PROP_LAST_SQL,
    sqlStr.length > CONFIG.MAX_PROPERTY_LENGTH ? sqlStr.substring(0, CONFIG.MAX_PROPERTY_LENGTH) + '\n...(truncado)' : sqlStr
  );
  props.setProperty(CONFIG.PROP_LAST_RECIPIENTS, resultado.destinatarios.join(', '));
  props.setProperty(CONFIG.PROP_LAST_STATUS, 'Enviado com sucesso — ' + resultado.dataEnvio);
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

/**
 * Gera o JSON e o Script SQL e envia por e-mail.
 * Pode ser chamada manualmente ou pelo acionador automático.
 */
function gerarEEnviar() {
  try {
    var fundos = obterDadosFundos();
    if (fundos.length === 0) {
      throw new Error('Nenhum fundo encontrado na aba "' + CONFIG.SHEET_FUNDS + '".');
    }

    var jsonStr = gerarJSON(fundos);
    var sqlStr = gerarSQL(fundos);
    var resultado = enviarEmail(jsonStr, sqlStr, fundos);
    var agora = new Date();
    registrarLog(agora, resultado, jsonStr, sqlStr);

    try {
      SpreadsheetApp.getUi().alert(
        '✅ Concluído!',
        'JSON e Script SQL gerados e enviados com sucesso!\n\nData: ' + resultado.dataEnvio +
        '\nFundos: ' + resultado.totalFundos +
        '\nDestinatários: ' + resultado.destinatarios.join(', '),
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (uiErr) {
      // Chamado via trigger — sem UI disponível
      Logger.log('Envio automático concluído: ' + resultado.dataEnvio);
    }

    return resultado;
  } catch (e) {
    Logger.log('ERRO em gerarEEnviar: ' + e.message);
    try {
      SpreadsheetApp.getUi().alert('❌ Erro', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (uiErr) {
      // Trigger — sem UI
    }
    throw e;
  }
}

// ============================================================
// FUNÇÃO DE TESTE DE E-MAIL
// ============================================================

/**
 * Envia um e-mail de teste para o e-mail do desenvolvedor.
 * Usa o template de layout existente (EmailTemplate.html) e anexa
 * arquivos JSON e SQL gerados a partir dos dados reais da planilha
 * (ou dados de exemplo, se a aba ainda não existir).
 *
 * Chamada via menu "🧪 Testar Envio de E-mail (Desenvolvedor)" ou
 * executada diretamente no editor de scripts para validação.
 */
function testarEnvioEmail() {
  try {
    var agora = new Date();
    var dataStr = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    var sufixoArquivo = Utilities.formatDate(agora, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');

    // Obter dados reais da planilha, com fallback para dados de exemplo
    var fundos = [];
    try {
      fundos = obterDadosFundos();
    } catch (e) {
      Logger.log('Aviso: não foi possível obter dados da planilha — usando dados de exemplo.');
    }

    if (fundos.length === 0) {
      // Dados de exemplo para garantir que o e-mail tenha conteúdo mesmo sem planilha
      fundos = [
        {
          FNDCD: 2, NOME: 'BANESTES INVEST MONEY', FNDCTFND: 'Renda Fixa',
          FNDCLSRISC: 'Baixo', FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Referenciado DI',
          FNDTOAMB: 'Renda Fixa Duração Baixa Grau de Investimento',
          FNDTXSIMU: 0.1338, FNDCOTDIAUTIL: 'N',
          RENT_DIARIA: 0.0365, RENT_MENSAL: 0.1123, RENT_ANUAL: 0.1338
        },
        {
          FNDCD: 4, NOME: 'BANESTES VIP DI', FNDCTFND: 'Renda Fixa',
          FNDCLSRISC: 'Baixo', FNDCLSCVM: 'Renda Fixa', FNDSUBCVM: 'Referenciado DI',
          FNDTOAMB: 'Renda Fixa Duração Baixa Grau de Investimento',
          FNDTXSIMU: 0.1420, FNDCOTDIAUTIL: 'N',
          RENT_DIARIA: 0.0388, RENT_MENSAL: 0.1195, RENT_ANUAL: 0.1420
        },
        {
          FNDCD: 24, NOME: 'BANESTES DIVIDENDOS', FNDCTFND: 'Ações',
          FNDCLSRISC: 'Alto', FNDCLSCVM: 'Ações', FNDSUBCVM: 'Não se aplica',
          FNDTOAMB: 'Ações Ativo Dividendos',
          FNDTXSIMU: 0.4441, FNDCOTDIAUTIL: 'S',
          RENT_DIARIA: 0.1213, RENT_MENSAL: 0.3734, RENT_ANUAL: 0.4441
        },
      ];
    }

    // Gerar conteúdo dos arquivos de teste
    var jsonStr = gerarJSON(fundos);
    var sqlStr = gerarSQL(fundos);
    var nomeJson = 'TESTE_fundos_banestes_' + sufixoArquivo + '.json';
    var nomeSql = 'TESTE_script_mainframe_' + sufixoArquivo + '.sql';

    // Criar blobs com codificação UTF-8 explícita
    var jsonBlob = Utilities.newBlob('')
      .setDataFromString(jsonStr, 'UTF-8')
      .setName(nomeJson)
      .setContentType('application/json');
    var sqlBlob = Utilities.newBlob('')
      .setDataFromString(sqlStr, 'UTF-8')
      .setName(nomeSql)
      .setContentType('text/plain');

    // Montar corpo HTML usando o template de layout existente
    var template = HtmlService.createTemplateFromFile('EmailTemplate');
    template.dataAtualizacao = dataStr + ' [TESTE]';
    template.totalFundos = fundos.length;
    template.fundos = fundos;
    template.nomeArquivoJson = nomeJson;
    template.nomeArquivoSql = nomeSql;
    var corpoEmail = template.evaluate().getContent();

    // Enviar apenas para o desenvolvedor
    MailApp.sendEmail({
      to: CONFIG.DEVELOPER_EMAIL,
      subject: '[TESTE] 🏦 Banestes — Validação de Envio de E-mail — ' + dataStr,
      htmlBody: corpoEmail,
      attachments: [jsonBlob, sqlBlob],
    });

    Logger.log('E-mail de teste enviado para: ' + CONFIG.DEVELOPER_EMAIL);

    try {
      SpreadsheetApp.getUi().alert(
        '✅ Teste Concluído!',
        'E-mail de teste enviado com sucesso!\n\n' +
        'Destinatário: ' + CONFIG.DEVELOPER_EMAIL + '\n' +
        'Fundos incluídos: ' + fundos.length + '\n' +
        'Anexos: ' + nomeJson + ', ' + nomeSql,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (uiErr) {
      // Execução sem UI (ex.: chamada direta no editor)
    }

  } catch (e) {
    Logger.log('ERRO em testarEnvioEmail: ' + e.message);
    try {
      SpreadsheetApp.getUi().alert('❌ Erro no Teste', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (uiErr) {}
    throw e;
  }
}

// ============================================================
// ACIONADORES (TRIGGERS)
// ============================================================

/**
 * Configura o acionador automático semanal (toda segunda-feira às 8h).
 */
function configurarAcionador() {
  // Remove acionadores existentes desta função para evitar duplicatas
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'gerarEEnviar') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Cria novo acionador semanal
  ScriptApp.newTrigger('gerarEEnviar')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();

  try {
    SpreadsheetApp.getUi().alert(
      '⏰ Acionador configurado!',
      'O envio automático foi configurado para toda segunda-feira às 8h.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    Logger.log('Acionador configurado com sucesso.');
  }
}

/**
 * Remove todos os acionadores automáticos do gerarEEnviar.
 */
function removerAcionador() {
  var removidos = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'gerarEEnviar') {
      ScriptApp.deleteTrigger(t);
      removidos++;
    }
  });

  try {
    SpreadsheetApp.getUi().alert(
      '🗑️ Acionador removido',
      removidos > 0
        ? 'Acionador automático removido com sucesso.'
        : 'Nenhum acionador automático estava configurado.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    Logger.log('Acionadores removidos: ' + removidos);
  }
}

// ============================================================
// API PARA O PAINEL LATERAL (SIDEBAR)
// ============================================================

/**
 * Retorna o status atual da ferramenta para exibição no painel.
 * @returns {Object} Objeto com informações de status.
 */
function obterStatusAtual() {
  var props = PropertiesService.getScriptProperties();
  var lastUpdateIso = props.getProperty(CONFIG.PROP_LAST_UPDATE);
  var lastStatus = props.getProperty(CONFIG.PROP_LAST_STATUS) || 'Nunca enviado';
  var lastRecipients = props.getProperty(CONFIG.PROP_LAST_RECIPIENTS) || '—';

  var ultimaAtualizacao = 'Nunca';
  if (lastUpdateIso) {
    try {
      ultimaAtualizacao = Utilities.formatDate(
        new Date(lastUpdateIso),
        Session.getScriptTimeZone(),
        'dd/MM/yyyy HH:mm:ss'
      );
    } catch (e) {
      ultimaAtualizacao = lastUpdateIso;
    }
  }

  // Verificar acionadores ativos
  var triggers = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'gerarEEnviar';
  });

  // Obter fundos para estatísticas
  var fundos = [];
  try {
    fundos = obterDadosFundos();
  } catch (e) {
    Logger.log('Aviso ao obter fundos: ' + e.message);
  }

  return {
    ultimaAtualizacao: ultimaAtualizacao,
    ultimoStatus: lastStatus,
    destinatariosAtivos: lastRecipients,
    acionadorAtivo: triggers.length > 0,
    totalFundos: fundos.length,
    versao: '1.0.0',
  };
}

/**
 * Retorna o conteúdo do último JSON gerado.
 * @returns {string} Conteúdo JSON ou mensagem de ausência.
 */
function obterUltimoJSON() {
  return PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_LAST_JSON) || '';
}

/**
 * Retorna o conteúdo do último Script SQL gerado.
 * @returns {string} Conteúdo SQL ou mensagem de ausência.
 */
function obterUltimoSQL() {
  return PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_LAST_SQL) || '';
}

/**
 * Retorna lista resumida de fundos para exibição no painel.
 * @returns {Array<Object>} Lista de fundos com campos principais.
 */
function obterListaFundosPainel() {
  var fundos = obterDadosFundos();
  return fundos.map(function (f) {
    return {
      codigo: f['FNDCD'],
      nome: f['NOME'],
      tipo: f['FNDCTFND'],
      risco: f['FNDCLSRISC'],
      taxaSimulacao: Number(f['FNDTXSIMU']),
      rentMensal: Number(f['RENT_MENSAL']),
      rentAnual: Number(f['RENT_ANUAL']),
    };
  });
}

/**
 * Retorna métricas agregadas dos fundos para o painel de comparativos.
 * @returns {Object} Objeto com estatísticas consolidadas.
 */
function obterMetricasPainel() {
  var fundos = obterDadosFundos();
  if (fundos.length === 0) {
    return {
      totalFundos: 0,
      mediaRentAnual: 0,
      melhorFundo: null,
      distribuicaoRisco: {},
      mediaRentPorRisco: {},
      maxRentAnual: 0,
    };
  }

  var riscoLabels = ['Muito Baixo', 'Baixo', 'Médio', 'Alto'];
  var distribuicao = {};
  var somaRentPorRisco = {};
  var contPorRisco = {};
  riscoLabels.forEach(function (r) {
    distribuicao[r] = 0;
    somaRentPorRisco[r] = 0;
    contPorRisco[r] = 0;
  });

  var somaRent = 0;
  var maxRent = 0;
  var melhor = null;

  fundos.forEach(function (f) {
    var risco = String(f['FNDCLSRISC'] || 'Baixo');
    var rent = Number(f['RENT_ANUAL'] || 0);

    if (distribuicao[risco] !== undefined) {
      distribuicao[risco]++;
      somaRentPorRisco[risco] += rent;
      contPorRisco[risco]++;
    }

    somaRent += rent;
    if (rent > maxRent) {
      maxRent = rent;
      melhor = {
        nome: String(f['NOME']),
        codigo: Number(f['FNDCD']),
        risco: risco,
        rentAnual: rent,
      };
    }
  });

  var mediaRentPorRisco = {};
  riscoLabels.forEach(function (r) {
    mediaRentPorRisco[r] = contPorRisco[r] > 0
      ? somaRentPorRisco[r] / contPorRisco[r]
      : 0;
  });

  return {
    totalFundos: fundos.length,
    mediaRentAnual: somaRent / fundos.length,
    melhorFundo: melhor,
    distribuicaoRisco: distribuicao,
    mediaRentPorRisco: mediaRentPorRisco,
    maxRentAnual: maxRent,
  };
}
