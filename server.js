/**
 * Server
 * 
 * Arquivo principal de inicialização da aplicação Express.
 * Configura middlewares, rotas e estabelece conexão com o banco de dados
 * antes de iniciar o servidor HTTP.
 * 
 * Funcionalidades:
 * - Configurar middlewares globais (CORS, JSON parsing)
 * - Registrar rotas da aplicação
 * - Estabelecer conexão com SQL Server via connectDB
 * - Iniciar servidor HTTP na porta configurada
 * - Fornecer rota de teste para verificação de status
 * 
 * Dependências:
 * - express: framework web para Node.js
 * - cors: middleware para habilitar CORS
 * - connectDB: função para conectar ao SQL Server
 * - orderRoutes: rotas da API de pedidos
 */

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./src/config/database');
const orderRoutes = require('./src/routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Middlewares Globais
 * 
 * Configura middlewares que processam todas as requisições antes
 * de chegarem às rotas específicas.
 * 
 * - cors(): permite requisições de origens diferentes (cross-origin)
 * - express.json(): faz parse automático de JSON no corpo da requisição
 * - express.urlencoded(): faz parse de dados de formulários URL-encoded
 */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Registro de Rotas
 * 
 * Monta todas as rotas relacionadas a pedidos no caminho raiz.
 * As rotas definidas em orderRoutes serão acessíveis via:
 * - GET /order/list
 * - POST /order
 * - GET /order/:orderId
 * - PUT /order/:orderId
 * - DELETE /order/:orderId
 */
app.use('/', orderRoutes);

/**
 * Rota de Teste (GET /)
 * 
 * Endpoint simples para verificar se a API está no ar e
 * se a conexão com o banco foi estabelecida com sucesso.
 * 
 * Tipo de retorno: JSON
 * - message: confirmação de funcionamento
 * - database: tipo de banco utilizado
 * - status: estado da aplicação
 * 
 * Funcionamento detalhado:
 * 1. Rota pública sem autenticação
 * 2. Retorna objeto JSON com informações de status
 * 3. Útil para health checks e testes iniciais
 */
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Pedidos funcionando!',
    database: 'SQL Server',
    status: 'Conectado'
  });
});

/**
 * Inicialização da Aplicação
 * 
 * Conecta ao banco de dados e só então inicia o servidor HTTP.
 * Esta abordagem garante que a API só comece a receber requisições
 * quando a conexão com o banco estiver totalmente estabelecida.
 * 
 * Fluxo de inicialização:
 * 1. Chama connectDB() para estabelecer conexão com SQL Server
 * 2. Se conexão bem-sucedida: inicia servidor na porta configurada
 * 3. Se conexão falhar: exibe erro e encerra processo (exit 1)
 * 
 * Tratamento de erros:
 * - Erros de conexão são capturados no catch
 * - Mensagem detalhada é exibida no console
 * - Processo é encerrado com código 1 (erro)
 */
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Teste: http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Falha ao iniciar a aplicação:', error);
  process.exit(1);
});