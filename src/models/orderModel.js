/**
 * OrderModel
 * 
 * Modelo responsável pela transformação de dados entre os formatos da API e do banco de dados.
 * Atua como uma camada de tradução que converte as nomenclaturas e tipos dos campos
 * entre o formato esperado pela requisição HTTP e o formato armazenado no SQL Server.
 * 
 * Funcionalidades:
 * - Transformar dados da requisição (formato externo) para formato do banco (formato interno)
 * - Transformar dados do banco para formato de resposta da API
 * - Garantir consistência nos tipos de dados (datas, números inteiros, decimais)
 * 
 * Observações:
 * - Este não é um Schema do Mongoose (ORM), mas sim um modelo conceitual
 * - Todas as funções são estáticas para facilitar o uso sem instanciação
 */

class OrderModel {
  /**
   * transformRequest
   * 
   * Converte os dados recebidos na requisição POST/PUT para o formato
   * utilizado internamente no banco de dados SQL Server.
   * 
   * Tipo de retorno: Object
   * - Retorna objeto com estrutura pronta para inserção no banco
   * 
   * Funcionamento detalhado:
   * 1. Mapeia numeroPedido externo para orderId interno
   * 2. Mapeia valorTotal externo para value interno
   * 3. Converte string de data para objeto Date do JavaScript
   * 4. Itera sobre array de items transformando cada um:
   *    a. idItem (string) para productId (número inteiro)
   *    b. quantidadelItem para quantity (mantém número)
   *    c. valorItem para price (mantém número)
   * 
   * Parâmetros:
   * - data: objeto bruto da requisição contendo:
   *   - numeroPedido: string com identificador externo do pedido
   *   - valorTotal: número com valor total do pedido
   *   - dataCriacao: string ISO com data de criação
   *   - items: array de objetos com idItem, quantidadelItem, valorItem
   */
  static transformRequest(data) {
    return {
      orderId: data.numeroPedido,
      value: data.valorTotal,
      creationDate: new Date(data.dataCriacao),
      items: data.items.map(item => ({
        productId: parseInt(item.idItem),
        quantity: item.quantidadelItem,
        price: item.valorItem
      }))
    };
  }

  /**
   * transformResponse
   * 
   * Converte os dados obtidos do banco de dados para o formato
   * adequado para resposta nas requisições GET.
   * 
   * Tipo de retorno: Object
   * - Retorna objeto com estrutura padronizada para resposta JSON
   * 
   * Funcionamento detalhado:
   * 1. Mantém orderId, value e creationDate como estão no banco
   * 2. Itera sobre array de items do banco transformando cada um:
   *    a. productId (número) mantém como está
   *    b. quantity (número) mantém como está
   *    c. price (número) mantém como está
   * 3. ItemsData é opcional: se não fornecido, usa array vazio
   * 
   * Parâmetros:
   * - orderData: objeto da tabela Orders contendo:
   *   - orderId: string identificadora do pedido
   *   - value: número com valor total
   *   - creationDate: objeto Date com data de criação
   * - itemsData: array opcional da tabela Items, cada objeto com:
   *   - productId: número identificador do produto
   *   - quantity: número com quantidade
   *   - price: número com preço unitário
   */
  static transformResponse(orderData, itemsData = []) {
    return {
      orderId: orderData.orderId,
      value: orderData.value,
      creationDate: orderData.creationDate,
      items: itemsData.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    };
  }
}

module.exports = OrderModel;