/**
 * Функция для расчета выручки от продажи товара
 * @param {Object} item - данные о покупке товара
 * @param {Object} product - карточка товара
 * @returns {number} - выручка с учетом скидки
 */
function calculateSimpleRevenue(item = {}, product = {}) {
    const discount = (item.discount || 0) / 100; 
    const price = item.price || product.sale_price;
    return price * item.quantity * (1 - discount);
}

/**
 * Функция для расчета бонуса продавца
 * @param {number} index - позиция в рейтинге
 * @param {number} total - общее количество продавцов
 * @param {Object} seller - данные продавца
 * @returns {number} - размер бонуса
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return seller.total_profit * 0.15;
    if (index === 1 || index === 2) return seller.total_profit * 0.10;
    if (index === total - 1) return 0;
    return seller.total_profit * 0.05;
}

/**
 * Функция для анализа данных о продажах
 * @param {Object} data - входные данные
 * @param {Object} options - параметры расчета
 * @returns {Array} - массив с результатами анализа
 */
function analyzeSalesData(data, options) {
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.customers)
        || !Array.isArray(data.products)
    ) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Не переданы обязательные функции расчета');
    }

    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        total_profit: 0,
        products_sold: {},
        sales_count: 0,
        revenue: 0
    }));

    const sellerIndex = {};
    sellerStats.forEach(seller => {
        sellerIndex[seller.seller_id] = seller;
    });

    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const itemRevenue = options.calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const itemProfit = itemRevenue - cost;

            seller.revenue += itemRevenue;
            seller.total_profit += itemProfit;
            
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.total_profit - a.total_profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = options.calculateBonus(index, sellerStats.length, seller);
        
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({
                sku,
                quantity,
                name: productIndex[sku]?.name || sku
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10)
            .map(item => item.name);
    });


    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.total_profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}