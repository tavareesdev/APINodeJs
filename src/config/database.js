/**
 * Configuração do Banco de Dados SQL Server
 * 
 * Módulo responsável por estabelecer e gerenciar a conexão com o SQL Server,
 * além de criar e verificar a existência das tabelas necessárias para o
 * sistema de gerenciamento de pedidos.
 * 
 * Funcionalidades:
 * - Estabelecer conexão com SQL Server usando autenticação SQL (usuário sa)
 * - Criar banco de dados PedidosDB caso não exista
 * - Criar e verificar estrutura das tabelas Orders e Items
 * - Fornecer pool de conexões para operações no banco
 * 
 * Dependências:
 * - mssql: driver oficial para conexão com SQL Server
 */

const sql = require('mssql');

/**
 * Configuração da conexão com SQL Server
 * 
 * Define os parâmetros necessários para estabelecer conexão com o banco,
 * incluindo credenciais, timeout e configurações do pool de conexões.
 * 
 * Propriedades:
 * - server: nome do servidor SQL Server (DESKTOP-13KH0VG)
 * - database: nome do banco de dados alvo
 * - user: usuário com permissões de administração (sa)
 * - password: senha do usuário configurada no SQL Server
 * - options: configurações adicionais de conexão
 *   - encrypt: desabilitado para ambiente local
 *   - trustServerCertificate: confiar em certificado autoassinado
 *   - enableArithAbort: habilitar abort em erros aritméticos
 * - pool: configurações do pool de conexões
 *   - max: máximo de conexões simultâneas
 *   - min: mínimo de conexões mantidas
 *   - idleTimeoutMillis: tempo máximo de inatividade
 */
const config = {
  server: 'DESKTOP-13KH0VG',
  database: 'PedidosDB',
  user: 'sa',
  password: '123',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

/**
 * connectDB
 * 
 * Estabelece conexão com o SQL Server e inicializa a estrutura do banco de dados.
 * 
 * Tipo de retorno: Promise<sql.ConnectionPool>
 * - Retorna o pool de conexões estabelecido
 * 
 * Funcionamento detalhado:
 * 1. Tenta estabelecer conexão usando as configurações definidas
 * 2. Verifica se o banco PedidosDB existe, criando-o se necessário
 * 3. Seleciona o banco PedidosDB para uso
 * 4. Cria/verifica as tabelas Orders e Items
 * 5. Em caso de erro, exibe mensagem e encerra o processo
 * 
 * Exceções:
 * - Erro de conexão: exibe mensagem e encerra aplicação
 */
const connectDB = async () => {
  try {
    console.log('Conectando ao SQL Server...');
    pool = await sql.connect(config);
    console.log('Conectado ao SQL Server com sucesso!');
    
    // Garantir que o banco PedidosDB existe
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'PedidosDB')
      BEGIN
        CREATE DATABASE PedidosDB;
      END
    `);
    
    // Usar o banco PedidosDB
    await pool.request().query('USE PedidosDB');
    
    // Criar tabelas se não existirem
    await createTables();
    
    console.log('Banco de dados pronto para uso!');
    return pool;
  } catch (error) {
    console.error('Erro ao conectar ao SQL Server:', error.message);
    process.exit(1);
  }
};

/**
 * createTables
 * 
 * Cria as tabelas Orders e Items no banco de dados caso não existam.
 * 
 * Tipo de retorno: Promise<void>
 * 
 * Funcionamento detalhado:
 * 1. Tabela Orders: armazena informações principais do pedido
 *    - id: identificador único autoincrementado
 *    - orderId: código único do pedido (vem do sistema externo)
 *    - value: valor total do pedido
 *    - creationDate: data de criação original do pedido
 *    - createdAt: timestamp de criação no sistema
 *    - updatedAt: timestamp da última atualização
 * 
 * 2. Tabela Items: armazena os itens de cada pedido
 *    - id: identificador único do item
 *    - orderId: chave estrangeira referenciando Orders
 *    - productId: código do produto
 *    - quantity: quantidade do item
 *    - price: preço unitário do item
 *    - FOREIGN KEY: garante integridade referencial
 * 
 * Exceções:
 * - Erro de criação de tabela: lança exceção para tratamento superior
 */
const createTables = async () => {
  try {
    // Criar tabela Orders
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Orders' AND xtype='U')
      CREATE TABLE Orders (
        id INT IDENTITY(1,1) PRIMARY KEY,
        orderId NVARCHAR(100) UNIQUE NOT NULL,
        value DECIMAL(18,2) NOT NULL,
        creationDate DATETIME NOT NULL,
        createdAt DATETIME DEFAULT GETDATE(),
        updatedAt DATETIME DEFAULT GETDATE()
      )
    `);
    console.log('Tabela Orders verificada/criada');

    // Criar tabela Items
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Items' AND xtype='U')
      CREATE TABLE Items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        orderId NVARCHAR(100) NOT NULL,
        productId INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(18,2) NOT NULL,
        FOREIGN KEY (orderId) REFERENCES Orders(orderId)
      )
    `);
    console.log('Tabela Items verificada/criada');
    
  } catch (error) {
    console.error('Erro ao criar tabelas:', error.message);
    throw error;
  }
};

/**
 * getPool
 * 
 * Retorna o pool de conexões ativo, lançando erro se não estiver conectado.
 * 
 * Tipo de retorno: sql.ConnectionPool
 * - Retorna o pool de conexões estabelecido
 * 
 * Funcionamento detalhado:
 * 1. Verifica se o pool foi inicializado (connectDB foi executado)
 * 2. Se não estiver conectado, lança erro orientando a executar connectDB primeiro
 * 3. Se conectado, retorna o pool para uso nas operações
 * 
 * Exceções:
 * - Error: banco de dados não conectado
 */
const getPool = () => {
  if (!pool) {
    throw new Error('Banco de dados não conectado. Execute connectDB primeiro.');
  }
  return pool;
};

module.exports = { connectDB, getPool, sql };