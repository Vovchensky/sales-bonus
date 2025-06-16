/**
 * Функция для расчета выручки от продажи товара
 * @param {Object} item - данные о покупке товара
 * @param {Object} product - карточка товара
 * @returns {number} - выручка с учетом скидки
 */
function calculateSimpleRevenue(item = {}, product = {}) {
    const discount = (item.discount || 0) / 100;
    const price = item.price || product.sale_price || 0;
    const quantity = item.quantity || 0;
    return price * quantity * (1 - discount);
}

/**
 * Функция для расчета бонуса продавца
 * @param {number} index - позиция в рейтинге
 * @param {number} total - общее количество продавцов
 * @param {Object} seller - данные продавца
 * @returns {number} - размер бонуса
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return seller.total_profit * 0.15;
    }
    if (index === 1 || index === 2) {
        return seller.total_profit * 0.10;
    }
    if (index === total - 1) {
        return 0;
    }
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
        start_date: seller.start_date,
        position: seller.position,
        total_profit: 0,
        products_sold: {},
        sales_count: 0,
        revenue: 0,
        bonus: 0
    }));

    const sellerIndex = sellerStats.reduce((index, seller) => {
        index[seller.seller_id] = seller;
        return index;
    }, {});

    const productIndex = data.products.reduce((index, product) => {
        index[product.sku] = product;
        return index;
    }, {});

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const itemRevenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            const itemProfit = itemRevenue - cost;

            seller.revenue += itemRevenue;
            seller.total_profit += itemProfit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    sellerStats.sort((sellerA, sellerB) => sellerB.total_profit - sellerA.total_profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({
                sku,
                quantity,
                name: productIndex[sku]?.name || sku
            }))
            .sort((productA, productB) => productB.quantity - productA.quantity)
            .slice(0, 10)
            .map(product => product.name);
    });

    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: parseFloat(seller.revenue.toFixed(2)),
        profit: parseFloat(seller.total_profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: parseFloat(seller.bonus.toFixed(2))
    }));
}