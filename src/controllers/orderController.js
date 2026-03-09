/**
 * OrderController
 * 
 * Controlador responsável por gerenciar todas as operações relacionadas a pedidos
 * no sistema. Implementa as funcionalidades de CRUD (Create, Read, Update, Delete)
 * para pedidos e seus itens, utilizando transações para garantir integridade dos dados.
 * 
 * Funcionalidades:
 * - Criar novo pedido com seus respectivos itens
 * - Buscar pedido específico por ID
 * - Listar todos os pedidos com seus itens
 * - Atualizar pedido existente (substitui itens antigos)
 * - Excluir pedido e seus itens associados
 * 
 * Dependências:
 * - getPool: função que retorna o pool de conexões do SQL Server
 * - sql: objeto do driver mssql para tipos e transações
 * - OrderModel: modelo responsável pela transformação de dados
 */

const { getPool, sql } = require('../config/database');
const OrderModel = require('../models/orderModel');

/**
 * createOrder
 * 
 * Cria um novo pedido no sistema com todos os seus itens associados.
 * Utiliza transação para garantir atomicidade: ou tudo é salvo, ou nada.
 * 
 * Tipo de retorno: Promise<void>
 * - 201: Pedido criado com sucesso, retorna dados transformados
 * - 400: Erro na criação, retorna mensagem de erro
 * 
 * Funcionamento detalhado:
 * 1. Obtém pool de conexões e inicia transação
 * 2. Transforma dados da requisição para formato do banco
 * 3. Insere registro na tabela Orders
 * 4. Itera sobre itens inserindo cada um na tabela Items
 * 5. Confirma transação (commit) se tudo ocorrer bem
 * 6. Em caso de erro, desfaz transação (rollback)
 * 7. Retorna resposta apropriada com status HTTP
 * 
 * Parâmetros:
 * - req.body: objeto contendo numeroPedido, valorTotal, dataCriacao e items
 * - req: objeto de requisição Express
 * - res: objeto de resposta Express
 */
exports.createOrder = async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    const orderData = OrderModel.transformRequest(req.body);
    
    await transaction.begin();
    
    // Inserir na tabela Orders
    const orderResult = await transaction.request()
      .input('orderId', sql.NVarChar, orderData.orderId)
      .input('value', sql.Decimal, orderData.value)
      .input('creationDate', sql.DateTime, orderData.creationDate)
      .query(`
        INSERT INTO Orders (orderId, value, creationDate)
        OUTPUT INSERTED.*
        VALUES (@orderId, @value, @creationDate)
      `);
    
    // Inserir items
    for (const item of orderData.items) {
      await transaction.request()
        .input('orderId', sql.NVarChar, orderData.orderId)
        .input('productId', sql.Int, item.productId)
        .input('quantity', sql.Int, item.quantity)
        .input('price', sql.Decimal, item.price)
        .query(`
          INSERT INTO Items (orderId, productId, quantity, price)
          VALUES (@orderId, @productId, @quantity, @price)
        `);
    }
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso!',
      data: orderData
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao criar pedido:', error);
    
    res.status(400).json({
      success: false,
      message: 'Erro ao criar pedido',
      error: error.message
    });
  }
};

/**
 * getOrderById
 * 
 * Busca um pedido específico pelo seu orderId (identificador único externo).
 * Retorna o pedido com todos os seus itens associados.
 * 
 * Tipo de retorno: Promise<void>
 * - 200: Pedido encontrado, retorna dados completos
 * - 404: Pedido não encontrado
 * - 400: Erro na busca
 * 
 * Funcionamento detalhado:
 * 1. Extrai orderId dos parâmetros da URL
 * 2. Busca pedido na tabela Orders
 * 3. Se não encontrado, retorna 404
 * 4. Busca itens relacionados na tabela Items
 * 5. Transforma dados para formato de resposta
 * 6. Retorna JSON com dados do pedido
 * 
 * Parâmetros:
 * - req.params.orderId: identificador do pedido na URL
 * - req: objeto de requisição Express
 * - res: objeto de resposta Express
 */
exports.getOrderById = async (req, res) => {
  const pool = getPool();
  
  try {
    const { orderId } = req.params;
    
    // Buscar pedido
    const orderResult = await pool.request()
      .input('orderId', sql.NVarChar, orderId)
      .query('SELECT * FROM Orders WHERE orderId = @orderId');
    
    if (orderResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Buscar items
    const itemsResult = await pool.request()
      .input('orderId', sql.NVarChar, orderId)
      .query('SELECT * FROM Items WHERE orderId = @orderId');
    
    const order = OrderModel.transformResponse(
      orderResult.recordset[0],
      itemsResult.recordset
    );
    
    res.status(200).json({
      success: true,
      data: order
    });
    
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    
    res.status(400).json({
      success: false,
      message: 'Erro ao buscar pedido',
      error: error.message
    });
  }
};

/**
 * getAllOrders
 * 
 * Lista todos os pedidos cadastrados no sistema, ordenados por data de criação
 * (mais recentes primeiro). Para cada pedido, busca e anexa seus itens.
 * 
 * Tipo de retorno: Promise<void>
 * - 200: Retorna array com todos os pedidos e seus itens
 * - 400: Erro na listagem
 * 
 * Funcionamento detalhado:
 * 1. Busca todos os registros na tabela Orders (ordenado por data decrescente)
 * 2. Inicializa array vazio para armazenar pedidos processados
 * 3. Para cada pedido encontrado:
 *    a. Busca itens relacionados na tabela Items
 *    b. Transforma dados usando OrderModel.transformResponse
 *    c. Adiciona ao array de resultados
 * 4. Retorna JSON com contagem e dados dos pedidos
 * 
 * Parâmetros:
 * - req: objeto de requisição Express
 * - res: objeto de resposta Express
 */
exports.getAllOrders = async (req, res) => {
  const pool = getPool();
  
  try {
    // Buscar todos os pedidos
    const ordersResult = await pool.request()
      .query('SELECT * FROM Orders ORDER BY creationDate DESC');
    
    const orders = [];
    
    // Para cada pedido, buscar seus items
    for (const orderRow of ordersResult.recordset) {
      const itemsResult = await pool.request()
        .input('orderId', sql.NVarChar, orderRow.orderId)
        .query('SELECT * FROM Items WHERE orderId = @orderId');
      
      orders.push(OrderModel.transformResponse(
        orderRow,
        itemsResult.recordset
      ));
    }
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
    
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    
    res.status(400).json({
      success: false,
      message: 'Erro ao listar pedidos',
      error: error.message
    });
  }
};

/**
 * updateOrder
 * 
 * Atualiza um pedido existente, substituindo completamente seus dados e itens.
 * A operação é atômica: remove itens antigos e insere novos em uma transação.
 * 
 * Tipo de retorno: Promise<void>
 * - 200: Pedido atualizado com sucesso
 * - 404: Pedido não encontrado
 * - 400: Erro na atualização
 * 
 * Funcionamento detalhado:
 * 1. Extrai orderId dos parâmetros da URL
 * 2. Transforma dados da requisição para formato do banco
 * 3. Inicia transação e verifica existência do pedido
 * 4. Se não existir, desfaz transação e retorna 404
 * 5. Atualiza dados na tabela Orders
 * 6. Remove todos os itens antigos (DELETE)
 * 7. Insere novos itens (INSERT)
 * 8. Confirma transação (commit)
 * 9. Em caso de erro, desfaz transação (rollback)
 * 
 * Parâmetros:
 * - req.params.orderId: identificador do pedido a ser atualizado
 * - req.body: novos dados do pedido (mesmo formato da criação)
 * - req: objeto de requisição Express
 * - res: objeto de resposta Express
 */
exports.updateOrder = async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    const { orderId } = req.params;
    const orderData = OrderModel.transformRequest(req.body);
    
    await transaction.begin();
    
    // Verificar se o pedido existe
    const checkResult = await transaction.request()
      .input('orderId', sql.NVarChar, orderId)
      .query('SELECT orderId FROM Orders WHERE orderId = @orderId');
    
    if (checkResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Atualizar pedido
    await transaction.request()
      .input('orderId', sql.NVarChar, orderId)
      .input('value', sql.Decimal, orderData.value)
      .input('creationDate', sql.DateTime, orderData.creationDate)
      .query(`
        UPDATE Orders 
        SET value = @value, 
            creationDate = @creationDate,
            updatedAt = GETDATE()
        WHERE orderId = @orderId
      `);
    
    // Deletar items antigos
    await transaction.request()
      .input('orderId', sql.NVarChar, orderId)
      .query('DELETE FROM Items WHERE orderId = @orderId');
    
    // Inserir novos items
    for (const item of orderData.items) {
      await transaction.request()
        .input('orderId', sql.NVarChar, orderData.orderId)
        .input('productId', sql.Int, item.productId)
        .input('quantity', sql.Int, item.quantity)
        .input('price', sql.Decimal, item.price)
        .query(`
          INSERT INTO Items (orderId, productId, quantity, price)
          VALUES (@orderId, @productId, @quantity, @price)
        `);
    }
    
    await transaction.commit();
    
    res.status(200).json({
      success: true,
      message: 'Pedido atualizado com sucesso!',
      data: orderData
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao atualizar pedido:', error);
    
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar pedido',
      error: error.message
    });
  }
};

/**
 * deleteOrder
 * 
 * Remove um pedido e todos os seus itens associados do banco de dados.
 * A operação é atômica: garante que items sejam removidos antes do pedido.
 * 
 * Tipo de retorno: Promise<void>
 * - 200: Pedido deletado com sucesso
 * - 404: Pedido não encontrado
 * - 400: Erro na deleção
 * 
 * Funcionamento detalhado:
 * 1. Extrai orderId dos parâmetros da URL
 * 2. Inicia transação e verifica existência do pedido
 * 3. Se não existir, desfaz transação e retorna 404
 * 4. Remove todos os itens relacionados (primeiro, por causa da FK)
 * 5. Remove o pedido da tabela Orders
 * 6. Confirma transação (commit)
 * 7. Em caso de erro, desfaz transação (rollback)
 * 
 * Parâmetros:
 * - req.params.orderId: identificador do pedido a ser deletado
 * - req: objeto de requisição Express
 * - res: objeto de resposta Express
 */
exports.deleteOrder = async (req, res) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    const { orderId } = req.params;
    
    await transaction.begin();
    
    // Verificar se o pedido existe
    const checkResult = await transaction.request()
      .input('orderId', sql.NVarChar, orderId)
      .query('SELECT orderId FROM Orders WHERE orderId = @orderId');
    
    if (checkResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }
    
    // Deletar items primeiro
    await transaction.request()
      .input('orderId', sql.NVarChar, orderId)
      .query('DELETE FROM Items WHERE orderId = @orderId');
    
    // Deletar pedido
    await transaction.request()
      .input('orderId', sql.NVarChar, orderId)
      .query('DELETE FROM Orders WHERE orderId = @orderId');
    
    await transaction.commit();
    
    res.status(200).json({
      success: true,
      message: 'Pedido deletado com sucesso!'
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erro ao deletar pedido:', error);
    
    res.status(400).json({
      success: false,
      message: 'Erro ao deletar pedido',
      error: error.message
    });
  }
};