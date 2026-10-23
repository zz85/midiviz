// Experiment #047 - Wardrobe: what the rails cycle through.
//
// The garments, hair and shoes are #032's (pianist/dress.js, hair.js,
// hair-mesh.js, shoes.js and the MakeHuman community assets fitted by
// pianist/build/build-character.mjs); the names and the outfits follow
// #032 / #045's menus. A value is what those pages take in ?dress= / ?hair= /
// ?shoes= / ?outfit=, so a link carries over.

// our dresses (pianist/dress.js): length-skirt[-sleeves|-qipao]
export const OUR_DRESSES = [
  ['knee-fitted', 'Halter · below the knee'],
  ['knee-cloth', 'Halter · below the knee, flowing'],
  ['gown-fitted', 'Halter gown'],
  ['gown-cloth', 'Halter gown, flowing'],
  ['knee-fitted-short', 'Short sleeves · below the knee'],
  ['knee-fitted-long', 'Long sleeves · below the knee'],
  ['knee-cloth-long', 'Long sleeves · below the knee, flowing'],
  ['gown-fitted-long', 'Long-sleeved gown'],
  ['gown-cloth-long', 'Long-sleeved gown, flowing'],
  ['gown-cloth-qipao', 'Qipao gown, flowing'],
  ['gown-fitted-qipao', 'Qipao gown, fitted'],
  ['knee-cloth-qipao', 'Qipao · below the knee, flowing'],
  ['knee-fitted-qipao', 'Qipao · below the knee, fitted'],
]

// MakeHuman community assets, plain names (their titles are the authors')
export const COMMUNITY = {
  dress: {
    // concert gowns (the asset packs, 2026): fishtail, Grecian, column, halter, strapless, one-shoulder, a jumpsuit
    c1855: 'Fishtail halter gown', c2558: 'Grecian gown · ivory', c2560: 'Grecian halter gown, draped', c2561: 'Grecian halter gown, gathered', c2562: 'Grecian gown, V-neck', c2564: 'Column halter gown',
    c1923: 'Halter gown, full skirt', c1730: 'Camisole dress, full skirt', c1516: 'High-neck sleeveless gown', c1705: 'Strapless ruffle dress', c1559: 'One-shoulder frilled mini', c1924: 'Halter jumpsuit',
    c563: 'Puff-shoulder dress · long sleeves', c533: 'Qipao · long (community)', c857: 'Qipao · knee length (community)', c1613: 'Keyhole-neck dress', c1515: 'Sixties shift dress', c1517: 'Fashion dress', c1424: 'Velvet evening gown', c806: 'Evening gown', c1640: 'Tiered-skirt dress', c1724: 'Shift dress', c411: 'Tube dress',
    c2802: 'Sequin bodycon mini', c141: 'Mini dress', c151: 'Mini dress II', c379: 'Black cocktail dress', c1419: 'Long evening gown',
    c1422: 'Knit dress', c1853: 'Halter dress · knee length', c1854: 'Halter dress · below the knee', c1922: 'Halter dress · flared',
  },
  // tops worn over our fitted skirt (their own colour, and the skirt's)
  top: { c1726: 'Camisole top', c1667: 'Bodice top', c894: 'T-shirt', c3508: 'T-shirt II', c1203: 'Tucked T-shirt', c416: 'Loose T-shirt', c1642: 'Turtleneck halter top', c3471: 'Sleeveless turtleneck' },
  // worn under a top (the Bottom rail); 'ours' is our fitted skirt
  bottom: { c2577: 'Palazzo trousers', c790: 'Slim trousers', c1194: 'Wool trousers', c1727: 'Long full skirt' },
  hair: { c1863: 'Long with a fringe', c1861: 'Long, swept back', c480: 'Long curls', c1551: 'Wavy bob', c1677: 'Curled-under bob', c1474: 'Sleek long bob', c1471: 'Long, shaggy layers', c2816: 'Long · Hazel', c1859: 'Long · Daisy', c1862: 'Long, side part', c482: 'Long, layered', c492: 'Long, wavy', c572: 'Medium', c1669: 'Blunt bob', c1673: 'Inverted bob', c3694: 'Bob II', c2001: 'Fifties updo', c2177: 'Braided bun', c2477: 'Bun with a velvet tie', c3542: 'Messy bun' },
  shoes: { c1734: 'Ballet flats', c2653: 'Mary Janes', c2801: 'T-bar shoes', c1822: 'Pumps', c1694: 'Stiletto booties', c1039: 'Peep-toe pumps' },
}

export const OUR_HAIR = [
  ['halfup', 'Half-up bun · strands'],
  ['updo', 'Bun · strands'],
  ['ponytail01', 'Ponytail'],
  ['braid01', 'Braid'],
  ['bob01', 'Bob'],
  ['bob02', 'Sleek bob'],
  ['long01', 'Long'],
]

export const OUR_SHOES = [['flats', 'Flats'], ['none', 'Barefoot']]
export const OUR_BOTTOMS = [['ours', 'Fitted skirt']]

export const FABRICS = [['made', 'Plain'], ['knit', 'Knit'], ['satin', 'Satin'], ['silk', 'Silk charmeuse'], ['chiffon', 'Chiffon'], ['crepe', 'Crepe'], ['taffeta', 'Shot taffeta'], ['velvet', 'Velvet'], ['damask', 'Damask'], ['lame', 'Lamé'], ['sequin', 'Sequins'], ['glitter', 'Glitter'], ['beaded', 'Beaded'], ['leather', 'Leather'], ['lace', 'Lace'], ['pleated', 'Pleated (plissé)']]

// gown slits (our dresses), cm about the knee joint, as #032's ?slit=
export const SLITS = [['off', 'Closed'], ['ankle', 'From the ankle'], ['calf', 'From mid-calf'], ['knee', 'From the knee'], ['thigh', 'Above the knee'], ['hip', 'From the hip']]
export const SLIT_AT = { ankle: -30, calf: -14, knee: -3, thigh: 8, hip: 30 }

// #032's outfits (dress, fabric, colour, shoes, hair at once)
// The 'concert' ones follow what women soloists wear on stage (see
// wardrobe/README.md, Research): concert black, sleeveless or shoulder-free so
// the arms move and show, floor-length fishtail and Grecian gowns, jewel tones,
// a jumpsuit, black separates with wide trousers, a short sequinned or frilled
// dress with heels, a white gown played barefoot; low closed shoes otherwise.
export const OUTFITS = {
  'fishtail-black': { group: 'Concert', name: 'Black fishtail gown, chignon', dress: 'c1855', fabric: 'satin', color: '#121214', shoes: 'c1822', shoeColor: '#151214', hair: 'c2477', hairColor: '#2b1d14' },
  'grecian-ivory': { group: 'Concert', name: 'Ivory Grecian gown, barefoot, long hair', dress: 'c2558', fabric: 'chiffon', color: '#efe6d6', shoes: 'none', hair: 'c1863', hairColor: '#d1b27a' },
  'column-sapphire': { group: 'Concert', name: 'Sapphire column gown, long hair', dress: 'c2564', fabric: 'silk', color: '#1d4f86', shoes: 'c1822', shoeColor: '#b9b6b0', hair: 'c1861', hairColor: '#2b1d14' },
  'grecian-emerald': { group: 'Concert', name: 'Emerald Grecian gown, braided bun', dress: 'c2562', fabric: 'chiffon', color: '#15563f', shoes: 'c1734', shoeColor: '#151214', hair: 'c2177', hairColor: '#4a3324' },
  'halter-wine': { group: 'Concert', name: 'Wine velvet halter gown, updo', dress: 'c1923', fabric: 'velvet', color: '#5e1224', shoes: 'c1822', shoeColor: '#151214', hair: 'c2001', hairColor: '#0e0b09' },
  'highneck-red': { group: 'Concert', name: 'Red high-neck gown, sleek bob', dress: 'c1516', fabric: 'crepe', color: '#c8102e', shoes: 'c1822', shoeColor: '#151214', hair: 'c1474', hairColor: '#0e0b09' },
  'jumpsuit-black': { group: 'Concert', name: 'Black halter jumpsuit, sleek bob', dress: 'c1924', fabric: 'made', color: '#121214', shoes: 'c1734', shoeColor: '#151214', hair: 'c1474', hairColor: '#2b1d14' },
  'palazzo-black': { group: 'Concert', name: 'Black separates, palazzo trousers, long grey hair', dress: 'c1726', bottom: 'c2577', fabric: 'made', color: '#121214', skirtColor: '#121214', shoes: 'c1734', shoeColor: '#151214', hair: 'c482', hairColor: '#8a8580' },
  'bodice-skirt': { group: 'Concert', name: 'Black bodice, long emerald taffeta skirt', dress: 'c1667', bottom: 'c1727', fabric: 'taffeta', color: '#121214', skirtColor: '#15563f', shoes: 'c2801', shoeColor: '#151214', hair: 'c2477', hairColor: '#4a3324' },
  'frill-sequin': { group: 'Concert', name: 'One-shoulder glitter mini, stilettos', dress: 'c1559', fabric: 'glitter', color: '#1d6f73', shoes: 'c1822', shoeColor: '#c9a24a', hair: 'c1677', hairColor: '#0e0b09' },
  'strapless-gold': { group: 'Concert', name: 'Strapless gold lamé cocktail dress, wavy bob', dress: 'c1705', fabric: 'lame', color: '#c9a24a', shoes: 'c1694', shoeColor: '#151214', hair: 'c1551', hairColor: '#2b1d14' },
  'damask-gown': { group: 'Concert', name: 'Ivory damask halter gown, braided bun', dress: 'c1923', fabric: 'damask', color: '#e6d2ae', shoes: 'c1734', shoeColor: '#c9a24a', hair: 'c2177', hairColor: '#2b1d14' },
  'leather-jumpsuit': { group: 'Concert', name: 'Black leather jumpsuit, wavy bob', dress: 'c1924', fabric: 'leather', color: '#121214', shoes: 'c1822', shoeColor: '#151214', hair: 'c1551', hairColor: '#0e0b09' },
  'fishtail-champagne': { group: 'Concert', name: 'Champagne beaded fishtail gown, long curls', dress: 'c1855', fabric: 'beaded', color: '#e6d2ae', shoes: 'c1822', shoeColor: '#c9a24a', hair: 'c480', hairColor: '#6b4428' },
  'bob-tee': { name: 'White tee and skirt, platinum bob', dress: 'c894', fabric: 'made', color: '#f2efe9', shoes: 'flats', hair: 'c3694', hairColor: '#d9c7a3' },
  'bob-turtleneck': { name: 'Black turtleneck, ash-grey bob', dress: 'c3471', fabric: 'made', color: '#1b1b1e', shoes: 'flats', hair: 'c3694', hairColor: '#514f4d' },
  'bob-cocktail': { name: 'Black satin cocktail, auburn updo', dress: 'c379', fabric: 'satin', color: '#121214', shoes: 'c1039', hair: 'c2001', hairColor: '#7a3b22' },
  'shift-long': { name: 'Blush shift dress, long hair', dress: 'c1724', fabric: 'made', color: '#e4a9a0', shoes: 'flats', hair: 'long01', hairColor: '#4a2f1f' },
  'braid-qipao': { name: 'Ivory qipao gown, braid', dress: 'gown-fitted-qipao', slit: 'knee', fabric: 'satin', color: '#efe6d6', trim: '#1f2a44', shoes: 'flats', hair: 'braid01', hairColor: '#68422c' },
  'long-gown': { name: 'Red velvet gown, blonde updo', dress: 'c806', fabric: 'velvet', color: '#c8102e', shoes: 'c1822', hair: 'c2001', hairColor: '#d1b27a' },
  'updo-gown': { name: 'Magenta satin gown, blonde ponytail', dress: 'c1424', fabric: 'satin', color: '#ff1dce', shoes: 'c1822', hair: 'ponytail01', hairColor: '#d1b27a' },
  tee: { name: 'Tee and skirt, long dark hair', dress: 'c894', fabric: 'made', color: '#e9e4da', shoes: 'flats', hair: 'long01', hairColor: '#312d2b' },
  'braid-halter': { name: 'Champagne halter gown, braid', dress: 'gown-cloth', slit: 'knee', fabric: 'satin', color: '#e6d2ae', shoes: 'c1822', hair: 'braid01', hairColor: '#4a2f1f' },
  'ponytail-qipao': { name: 'Red qipao gown, black ponytail', dress: 'gown-cloth-qipao', slit: 'knee', fabric: 'satin', color: '#9b1b25', trim: '#d4ae5a', shoes: 'c1822', hair: 'ponytail01', hairColor: '#17110d' },
  'bob-bodycon': { name: 'Gold sequin bodycon, brunette bob', dress: 'c2802', fabric: 'sequin', color: '#c9a24a', shoes: 'c1822', hair: 'c3694', hairColor: '#3b2618' },
  'sequin-mini': { name: 'Sequin mini, long dark hair', dress: 'c2802', fabric: 'sequin', color: '#b8b0a4', shoes: 'c1694', hair: 'c2816', hairColor: '#1c1410' },
  'sequin-gown': { name: 'Blue sequin gown, long dark hair', dress: 'gown-fitted', fabric: 'sequin', color: '#1d4f86', shoes: 'c1694', hair: 'c2816', hairColor: '#1c1410' },
  covered: { name: 'Long sleeves, braided bun', dress: 'knee-fitted-long', fabric: 'made', color: '#20242e', shoes: 'flats', hair: 'c2177', hairColor: '#4a3324' },
  reference: { name: 'Red knit halter, half-up hair', dress: 'knee-fitted', fabric: 'knit', color: '#8e1d1b', shoes: 'flats', hair: 'halfup', hairColor: '#5a3e2a' },
}

// swatches: one click each (the colour picker beside them takes any other)
export const PALETTES = {
  hair: [['#0e0b09', 'Black'], ['#2b1d14', 'Dark brown'], ['#4a3324', 'Brown'], ['#6b4428', 'Chestnut'], ['#7a3b22', 'Auburn'], ['#a5532a', 'Copper'], ['#b98b4e', 'Honey'], ['#d1b27a', 'Blonde'], ['#e6d5b0', 'Platinum'], ['#8a8580', 'Ash grey'], ['#c2477f', 'Pink'], ['#3d5fa8', 'Blue'], ['#5d3a8c', 'Violet']],
  dress: [['#121214', 'Black'], ['#f2efe9', 'White'], ['#efe6d6', 'Ivory'], ['#e6d2ae', 'Champagne'], ['#e4a9a0', 'Blush'], ['#c8102e', 'Red'], ['#9b1b25', 'Crimson'], ['#5e1224', 'Wine'], ['#ff1dce', 'Magenta'], ['#d9662b', 'Orange'], ['#c9a24a', 'Gold'], ['#15563f', 'Emerald'], ['#1d6f73', 'Teal'], ['#1f2a44', 'Navy'], ['#1d4f86', 'Royal blue'], ['#a99bd1', 'Lavender'], ['#6b6b70', 'Grey']],
  trim: [['#d4ae5a', 'Gold'], ['#1f2a44', 'Navy'], ['#121214', 'Black'], ['#f2efe9', 'White'], ['#9b1b25', 'Crimson'], ['#15563f', 'Emerald']],
  shoes: [['#151214', 'Black'], ['#f0ece4', 'White'], ['#c9a24a', 'Gold'], ['#b9b6b0', 'Silver'], ['#9b1b25', 'Red'], ['#d9b9a4', 'Nude'], ['#1f2a44', 'Navy']],
  // multiplies the skin texture (white: as textured)
  skin: [['#ffffff', 'As textured'], ['#fff6f0', 'Porcelain'], ['#fff0e6', 'Light'], ['#e8c8b0', 'Light medium'], ['#d0a184', 'Medium'], ['#b07c5c', 'Tan'], ['#8a5a3e', 'Brown'], ['#5e3a26', 'Deep']],
  backdrop: [['#d9d6d0', 'Paper white'], ['#8d8a86', 'Mid grey'], ['#2a2a2c', 'Charcoal'], ['#0b0b0c', 'Black'], ['#c9b79c', 'Sand'], ['#e7c9c1', 'Blush'], ['#7d8f7a', 'Sage'], ['#3b5672', 'Slate blue'], ['#5b2333', 'Burgundy']],
}
