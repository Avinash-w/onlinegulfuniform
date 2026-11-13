/**
 * Utilities for GST calculation, currency formatting in words, and invoice helpers.
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
]

function convertBelowThousand(num) {
  let str = ''
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + ' Hundred '
    num %= 100
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + (num % 10 ? ' ' + ONES[num % 10] : '')
  } else if (num > 0) {
    str += ONES[num]
  }
  return str.trim()
}

/**
 * Converts any number to Indian Currency words (Crores, Lakhs, Thousands, Hundreds, Rupees & Paise).
 * e.g. 1899 -> "INR One Thousand Eight Hundred Ninety-Nine Only"
 */
export function numberToIndianWords(amount) {
  if (isNaN(amount) || amount === 0) return 'INR Zero Only'

  const absAmount = Math.abs(Number(amount))
  const rupees = Math.floor(absAmount)
  const paise = Math.round((absAmount - rupees) * 100)

  let words = ''

  const crore = Math.floor(rupees / 10000000)
  let remainder = rupees % 10000000

  const lakh = Math.floor(remainder / 100000)
  remainder = remainder % 100000

  const thousand = Math.floor(remainder / 1000)
  remainder = remainder % 1000

  const hundred = remainder

  if (crore > 0) {
    words += convertBelowThousand(crore) + ' Crore '
  }
  if (lakh > 0) {
    words += convertBelowThousand(lakh) + ' Lakh '
  }
  if (thousand > 0) {
    words += convertBelowThousand(thousand) + ' Thousand '
  }
  if (hundred > 0) {
    words += convertBelowThousand(hundred) + ' '
  }

  words = words.trim()
  if (!words) words = 'Zero'

  let result = `INR ${words} Rupees`
  if (paise > 0) {
    result += ` and ${convertBelowThousand(paise)} Paise`
  }
  result += ' Only'

  return result
}

/**
 * Formats phone number into standard Indian format (+91 XXXXX XXXXX).
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '—'
  const clean = String(phone).trim()
  const digits = clean.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91 ${digits.slice(1, 6)} ${digits.slice(6)}`
  }
  return clean
}

/**
 * Resolves category-accurate GST HSN code for each product item.
 */
export function detectHsnForItem(l, defaultHsn = '34060010') {
  if (l?.hsn) return l.hsn
  const str = `${l?.category || ''} ${l?.productType || ''} ${l?.productHandle || l?.handle || ''} ${l?.title || ''}`.toLowerCase()
  if (str.includes('perfume') || str.includes('body') || str.includes('attar') || str.includes('fragrance bar') || str.includes('sanitizer')) {
    return '33030090' // Perfumes, Scents, Body Fragrance Bars
  }
  if (str.includes('diffuser') || str.includes('home-fragrance') || str.includes('spray') || str.includes('wax-melt') || str.includes('room') || str.includes('melt')) {
    return '33074900' // Room / Home Fragrances, Sprays, Diffusers
  }
  if (str.includes('hamper') || str.includes('gift set') || str.includes('gift') || str.includes('festive') || str.includes('custom-orders')) {
    return '95059000' // Festive / Gift Hampers / Curated Sets
  }
  return defaultHsn || '34060010' // Candles, tapers and wax articles
}

/**
 * Calculate comprehensive GST tax breakdown for an order based on invoice settings.
 */
export function calculateGstBreakup(order, invoiceConfig = {}) {
  if (!order) return null

  const defaultGstRate = Number(invoiceConfig.defaultGstRate ?? 18)
  const isTaxInclusive = (invoiceConfig.taxType || 'inclusive') === 'inclusive'
  const defaultHsn = invoiceConfig.defaultHsn || '34060010'
  const companyState = (invoiceConfig.state || 'Delhi').trim().toLowerCase()
  const companyStateCode = invoiceConfig.stateCode || '07'

  // Determine Customer Delivery State
  const destState = (
    order.address?.state ||
    order.shippingAddress?.state ||
    order.billingAddress?.state ||
    ''
  ).trim().toLowerCase()

  // Intra-state vs Inter-state
  const isIntraState =
    !destState ||
    destState === companyState ||
    destState.includes(companyState) ||
    companyState.includes(destState)

  const rawLines = order.lines || []
  const totalItemsGross = rawLines.reduce((sum, l) => sum + Number(l.price || 0) * Number(l.qty || 1), 0)
  const totalOrderDiscount = Number(order.discount || 0)

  const lines = rawLines.map((l, index) => {
    const qty = Number(l.qty || 1)
    const unitPrice = Number(l.price || 0)
    const lineGross = unitPrice * qty
    const hsn = detectHsnForItem(l, defaultHsn)
    const gstRate = Number(l.gstRate ?? defaultGstRate)

    // Calculate proportional discount for this line item
    let lineDiscount = 0
    if (totalOrderDiscount > 0 && totalItemsGross > 0) {
      lineDiscount = Math.round((lineGross / totalItemsGross) * totalOrderDiscount * 100) / 100
    } else if (l.discount) {
      lineDiscount = Number(l.discount)
    }

    const lineNet = Math.max(0, lineGross - lineDiscount)

    let taxableValue = 0
    let gstAmount = 0

    if (isTaxInclusive) {
      // Line price includes GST: Taxable = Net / (1 + Rate/100)
      taxableValue = lineNet / (1 + gstRate / 100)
      gstAmount = lineNet - taxableValue
    } else {
      // Tax added on top
      taxableValue = lineNet
      gstAmount = lineNet * (gstRate / 100)
    }

    const unitTaxable = qty > 0 ? taxableValue / qty : 0

    return {
      index: index + 1,
      title: l.title || 'Artisanal Candle Product',
      size: l.size || '',
      color: l.color || '',
      sku: l.sku || l.handle || l.productHandle || `SKU-${index + 1}`,
      hsn,
      qty,
      unitPrice,
      unitTaxable,
      lineGross,
      lineDiscount,
      lineNet,
      taxableValue,
      gstRate,
      gstAmount,
      cgstRate: isIntraState ? gstRate / 2 : 0,
      cgstAmount: isIntraState ? gstAmount / 2 : 0,
      sgstRate: isIntraState ? gstRate / 2 : 0,
      sgstAmount: isIntraState ? gstAmount / 2 : 0,
      igstRate: !isIntraState ? gstRate : 0,
      igstAmount: !isIntraState ? gstAmount : 0,
    }
  })

  // Calculate items taxable total and GST total
  const itemsTaxableValue = lines.reduce((sum, l) => sum + l.taxableValue, 0)
  const itemsGstAmount = lines.reduce((sum, l) => sum + l.gstAmount, 0)
  const itemsGross = lines.reduce((sum, l) => sum + l.lineGross, 0)
  const totalDiscount = lines.reduce((sum, l) => sum + l.lineDiscount, 0) || totalOrderDiscount

  // Shipping GST calculation
  const shippingTotal = Number(order.shipping || 0)
  let shippingTaxable = shippingTotal
  let shippingGst = 0
  if (shippingTotal > 0) {
    if (isTaxInclusive) {
      shippingTaxable = shippingTotal / (1 + defaultGstRate / 100)
      shippingGst = shippingTotal - shippingTaxable
    } else {
      shippingTaxable = shippingTotal
      shippingGst = shippingTotal * (defaultGstRate / 100)
    }
  }

  // HSN Tax Breakdown Map
  const hsnMap = {}
  lines.forEach((l) => {
    if (!hsnMap[l.hsn]) {
      hsnMap[l.hsn] = {
        hsn: l.hsn,
        taxableValue: 0,
        cgstRate: l.cgstRate,
        cgstAmount: 0,
        sgstRate: l.sgstRate,
        sgstAmount: 0,
        igstRate: l.igstRate,
        igstAmount: 0,
        totalTax: 0,
      }
    }
    hsnMap[l.hsn].taxableValue += l.taxableValue
    hsnMap[l.hsn].cgstAmount += l.cgstAmount
    hsnMap[l.hsn].sgstAmount += l.sgstAmount
    hsnMap[l.hsn].igstAmount += l.igstAmount
    hsnMap[l.hsn].totalTax += l.gstAmount
  })

  // Add shipping to HSN table if applicable
  if (shippingTotal > 0 && shippingGst > 0) {
    const shipHsn = '996813' // Courier/Freight transportation SAC code
    if (!hsnMap[shipHsn]) {
      hsnMap[shipHsn] = {
        hsn: shipHsn,
        taxableValue: 0,
        cgstRate: isIntraState ? defaultGstRate / 2 : 0,
        cgstAmount: 0,
        sgstRate: isIntraState ? defaultGstRate / 2 : 0,
        sgstAmount: 0,
        igstRate: !isIntraState ? defaultGstRate : 0,
        igstAmount: 0,
        totalTax: 0,
      }
    }
    hsnMap[shipHsn].taxableValue += shippingTaxable
    hsnMap[shipHsn].cgstAmount += isIntraState ? shippingGst / 2 : 0
    hsnMap[shipHsn].sgstAmount += isIntraState ? shippingGst / 2 : 0
    hsnMap[shipHsn].igstAmount += !isIntraState ? shippingGst : 0
    hsnMap[shipHsn].totalTax += shippingGst
  }

  const hsnBreakdown = Object.values(hsnMap)

  const totalTaxable = itemsTaxableValue + shippingTaxable
  const totalGst = itemsGstAmount + shippingGst
  const totalCgst = isIntraState ? totalGst / 2 : 0
  const totalSgst = isIntraState ? totalGst / 2 : 0
  const totalIgst = !isIntraState ? totalGst : 0

  const grandTotal = Number(order.total || itemsGross + shippingTotal - totalDiscount)

  return {
    lines,
    isIntraState,
    companyState,
    companyStateCode,
    destState: destState || companyState,
    itemsTaxableValue,
    itemsGstAmount,
    itemsGross,
    shippingTotal,
    shippingTaxable,
    shippingGst,
    discount: totalDiscount,
    totalTaxable,
    totalGst,
    totalCgst,
    totalSgst,
    totalIgst,
    grandTotal,
    hsnBreakdown,
    amountInWords: numberToIndianWords(grandTotal),
  }
}

/**
 * Formats a clean invoice reference number.
 */
export function formatInvoiceNumber(orderId, prefix = 'INV-2024-', digits = 5) {
  if (!orderId) return `${prefix}00001`
  const cleanId = String(orderId).replace(/\D/g, '')
  if (cleanId) {
    return `${prefix}${cleanId.padStart(digits, '0')}`
  }
  return `${prefix}${orderId}`
}
