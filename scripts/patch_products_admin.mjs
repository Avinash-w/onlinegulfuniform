import fs from 'fs'

const filePath = 'src/admin/Products.jsx'
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

// Replace defaultCategory fallback
content = content.replace(
  /const defaultCategory = managedCats\[0\]\?\.name \|\| 'Scented Candles'/g,
  "const defaultCategory = managedCats[0]?.name || 'Boys'"
)

// Replace modal form fields
content = content.replace(
  /<Field label="Candle style">[\s\S]*?<Field label="Sizes"/m,
  `<Field label="Fit / Cut">
          <Select
            value={form.fit || ''}
            onChange={set('fit')}
            disabled={saving}
            options={UNIFORM_FITS.map((t) => ({ value: t, label: t || '— None —' }))}
          />
        </Field>
        <Field label="Sizes"`
)

// Replace wax, fragrance, burn time fields in modal
content = content.replace(
  /<Field label="Wax type \/ Material">[\s\S]*?<\/div>\s*<\/Field>\s*<\/div>/m,
  `<Field label="Fabric / Material">
          <Input value={form.material || ''} onChange={set('material')} placeholder="65% Polyester, 35% Cotton Twill" disabled={saving} />
        </Field>
        <Field label="Gender / Target Group">
          <Input value={form.gender || ''} onChange={set('gender')} placeholder="Boys / Girls / Unisex" disabled={saving} />
        </Field>
        <Field label="Sleeve / Length">
          <Input value={form.sleeve || ''} onChange={set('sleeve')} placeholder="Short Sleeve / Long Sleeve" disabled={saving} />
        </Field>
        <Field label="Fabric Weight (GSM)">
          <Input value={form.weight || ''} onChange={set('weight')} placeholder="220 GSM" disabled={saving} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Care Instructions">
            <Input value={form.careInstructions || form.care || ''} onChange={set('careInstructions')} placeholder="Machine wash warm, easy iron" disabled={saving} />
          </Field>
        </div>`
)

fs.writeFileSync(filePath, content, 'utf8')
console.log('Successfully patched Products.jsx')
