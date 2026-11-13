import fs from 'fs'
import path from 'path'

const filePath = 'src/admin/ProductNew.jsx'
let content = fs.readFileSync(filePath, 'utf8')

// Replace PRODUCT_TYPES and CANDLE_TYPES
content = content.replace(
  /const PRODUCT_TYPES = \[[\s\S]*?const CANDLE_TYPES = \[.*?\]/m,
  `const PRODUCT_TYPES = [
  { value: 'uniform', label: 'School / Industrial Uniform' },
  { value: 'schoolwear', label: 'Schoolwear' },
  { value: 'workwear', label: 'Workwear & Industrial' },
  { value: 'safety', label: 'Safety & FR Wear' },
  { value: 'corporate', label: 'Corporate Attire' },
  { value: 'other', label: 'Other' },
]

const UNIFORM_FITS = ['', 'Regular Fit', 'Classic School Fit', 'Athletic Fit', 'Tailored Cut', 'Industrial Workwear Fit', 'Pleated']`
)

// Replace blank
content = content.replace(
  /const blank = \(defaultCategory\) => \(\{[\s\S]*?newSize: '',\s*\}\)/m,
  `const blank = (defaultCategory) => ({
  title: '',
  handle: '',
  price: 65,
  compareAt: 85,
  color: 'Navy Blue',
  category: defaultCategory || 'Boys',
  subcategory: '',
  kind: 'uniforms',
  productType: 'uniform',
  material: '65% Polyester, 35% Cotton Twill',
  fit: 'Regular Fit',
  gender: 'Boys',
  sleeve: 'Short Sleeve',
  care: 'Machine wash warm, easy iron',
  occasion: 'School Uniform',
  shortDescription: '',
  description: '',
  sku: '',
  weight: '220 GSM',
  dimensions: 'Standard Sizing',
  collections: 'boys,all-products',
  badges: 'NEW ARRIVAL',
  thumbnail: '',
  gallery: [],
  variants: [
    { size: '28', selected: true, stock: 50 },
    { size: '30', selected: true, stock: 50 },
    { size: '32', selected: true, stock: 50 },
    { size: '34', selected: true, stock: 50 },
  ],
  newSize: '',
})`
)

// Replace existingProduct mapping in getInitialForm
content = content.replace(
  /material: existingProduct\.waxType[\s\S]*?candleType: existingProduct\.candleType \|\| 'Jar',/m,
  `material: existingProduct.material || '65% Polyester, 35% Cotton Twill',
    fit: existingProduct.fit || 'Regular Fit',
    gender: existingProduct.gender || 'Boys',
    sleeve: existingProduct.sleeve || 'Short Sleeve',
    care: existingProduct.careInstructions || 'Machine wash warm, easy iron',
    occasion: existingProduct.occasion || 'School Uniform',`
)

// Replace brand EvaraNest with Online Gulf Uniform
content = content.replace(/brand: 'EvaraNest'/g, "brand: 'Online Gulf Uniform'")

// Replace Step 1 specs in JSX
content = content.replace(
  /\{step === 1 && \([\s\S]*?<Field label="Candle style[\s\S]*?<\/Field>\s*<\/div>\s*<\/div>\s*\)\}/m,
  `{step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fabric / Material" hint="e.g. 65% Polyester / 35% Cotton Twill, Nomex FR">
              <Input value={form.material} onChange={set('material')} placeholder="65% Poly / 35% Cotton Twill" />
            </Field>
            <Field label="Fit / Cut">
              <Select
                value={form.fit}
                onChange={set('fit')}
                options={UNIFORM_FITS.map((t) => ({ value: t, label: t || '— None —' }))}
              />
            </Field>
            <Field label="Gender / Target Group" hint="e.g. Boys, Girls, Unisex Adults">
              <Input value={form.gender} onChange={set('gender')} placeholder="Boys" />
            </Field>
            <Field label="Sleeve / Length" hint="e.g. Short Sleeve, Long Sleeve, Full Length">
              <Input value={form.sleeve} onChange={set('sleeve')} placeholder="Short Sleeve" />
            </Field>
            <Field label="Fabric Weight / GSM" hint="e.g. 220 GSM">
              <Input value={form.weight} onChange={set('weight')} placeholder="220 GSM" />
            </Field>
            <Field label="Care Instructions" hint="e.g. Machine wash warm, easy iron">
              <Input value={form.care} onChange={set('care')} placeholder="Machine wash warm, easy iron" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Occasion / Work Environment" hint="e.g. School Academic, Oil & Gas Offshore, Kitchen">
                <Input value={form.occasion} onChange={set('occasion')} placeholder="School Uniform / Academic" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Sizing Standard" hint="e.g. UK / Gulf Standard Size Guide">
                <Input value={form.dimensions} onChange={set('dimensions')} placeholder="Gulf / UK Standard Sizing (Chest/Waist in inches)" />
              </Field>
            </div>
          </div>
        )}`
)

fs.writeFileSync(filePath, content, 'utf8')
console.log('Successfully patched ProductNew.jsx')
