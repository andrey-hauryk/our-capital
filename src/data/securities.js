// Количество акций указывается в штуках, не в лотах. Стоимость рассчитывается по котировкам.
// category: securities — обычный брокерский счёт, iis — ИИС.
export const securitiesHoldings = [
  { id: 'broker-sberp', name: 'Сбербанк ап', symbol: 'SBERP', quantity: 2110, category: 'securities' },
  { id: 'broker-sber', name: 'Сбербанк', symbol: 'SBER', quantity: 1000, category: 'securities' },
  { id: 'iis-sber', name: 'Сбербанк', symbol: 'SBER', quantity: 1139, category: 'iis' },
  { id: 'iis-sberp', name: 'Сбербанк ап', symbol: 'SBERP', quantity: 395, category: 'iis' },
]
