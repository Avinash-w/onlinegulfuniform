import fs from 'fs'

async function sync() {
  const res = await fetch('http://localhost/juneberry/api/bootstrap')
  const json = await res.json()
  const products = json.data.products || []

  const fileContent = `// Online Gulf Uniform product catalogue — School, Corporate & Industrial Uniforms.

export const products = ${JSON.stringify(products, null, 2)}

export default products
`

  fs.writeFileSync('src/data/products.js', fileContent, 'utf8')
  console.log(`Synced ${products.length} products to src/data/products.js`)
}

sync().catch(console.error)
