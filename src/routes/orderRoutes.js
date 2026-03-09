/**
 * OrderRoutes
 * 
 * Define e configura todas as rotas relacionadas a pedidos na API.
 * Gerencia o mapeamento entre endpoints HTTP e as funções do controlador,
 * garantindo a ordem correta de declaração para evitar conflitos de rotas.
 * 
 * Funcionalidades:
 * - Rota para listar todos os pedidos (GET /order/list)
 * - Rota para criar novo pedido (POST /order)
 * - Rota para buscar pedido específico (GET /order/:orderId)
 * - Rota para atualizar pedido existente (PUT /order/:orderId)
 * - Rota para deletar pedido (DELETE /order/:orderId)
 * 
 * Dependências:
 * - express.Router: para criar rotas modulares e montáveis
 * - orderController: contém a lógica de negócio para cada endpoint
 * 
 * Observações importantes:
 * - A ordem das rotas é CRUCIAL: rotas específicas (/list) devem vir antes
 *   de rotas com parâmetros dinâmicos (/:orderId) para evitar que o Express
 *   interprete "list" como um parâmetro orderId inválido
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// IMPORTANTE: Rotas específicas devem vir antes das rotas com parâmetros

/**
 * GET /order/list
 * 
 * Rota para listar todos os pedidos cadastrados no sistema.
 * Não recebe parâmetros e retorna array completo de pedidos.
 * 
 * Controller: orderController.getAllOrders
 * 
 * Observação: Esta rota DEVE ser declarada antes de /order/:orderId
 * para que "list" não seja interpretado como um ID de pedido.
 */
router.get('/order/list', orderController.getAllOrders);

/**
 * POST /order
 * 
 * Rota para criar um novo pedido no sistema.
 * Recebe no corpo da requisição os dados do pedido no formato:
 * {
 *   numeroPedido: string,
 *   valorTotal: number,
 *   dataCriacao: string (ISO date),
 *   items: array de objetos com idItem, quantidadelItem, valorItem
 * }
 * 
 * Controller: orderController.createOrder
 */
router.post('/order', orderController.createOrder);

/**
 * GET /order/:orderId
 * 
 * Rota para buscar um pedido específico pelo seu identificador único.
 * O parâmetro :orderId na URL corresponde ao campo orderId no banco.
 * 
 * Controller: orderController.getOrderById
 * 
 * Exemplo: GET /order/v10089015vdb-01
 */
router.get('/order/:orderId', orderController.getOrderById);

/**
 * PUT /order/:orderId
 * 
 * Rota para atualizar completamente um pedido existente.
 * O parâmetro :orderId identifica qual pedido será atualizado.
 * O corpo da requisição deve conter todos os dados do pedido
 * (substituição completa, não parcial).
 * 
 * Controller: orderController.updateOrder
 * 
 * Exemplo: PUT /order/v10089015vdb-01
 */
router.put('/order/:orderId', orderController.updateOrder);

/**
 * DELETE /order/:orderId
 * 
 * Rota para remover um pedido e todos os seus itens associados.
 * O parâmetro :orderId identifica qual pedido será excluído.
 * 
 * Controller: orderController.deleteOrder
 * 
 * Exemplo: DELETE /order/v10089015vdb-01
 */
router.delete('/order/:orderId', orderController.deleteOrder);

module.exports = router;