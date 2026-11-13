import fs from 'fs'

const filePath = 'src/pages/Product.jsx'
let content = fs.readFileSync(filePath, 'utf8')

// Replace bulletPoints and specsList
content = content.replace(
  /\/\/ Multilingual Amazon bullet points[\s\S]*?const specsList = \[[\s\S]*?\]/m,
  `// Multilingual Amazon bullet points
  const bulletPoints = [
    lang === 'ar'
      ? '【أقمشة متينة فاخرة】: مصنوع من أجود خامات البوليستر والقطن المقاوم للاهتراء مع خياطة مدعمة للارتداء المدرسي والعملي اليومي.'
      : lang === 'ml'
      ? '【പ്രീമിയം ഗുണനിലവാരം】: സ്കൂൾ, വ്യാവസായിക ആവശ്യങ്ങൾക്കായി ഈടുനിൽക്കുന്ന മികച്ച പോളികോട്ടൺ തുണിത്തരത്തിൽ തയ്ച്ചെടുത്തത്.'
      : '【PREMIUM UNIFORM FABRIC】: Crafted from high-grade durable poly-cotton twill with reinforced double stitching for long-lasting school & workplace endurance.',

    lang === 'ar'
      ? '【راحة وتهوية طوال اليوم】: مصمم لتوفير أقصى درجات حرية الحركة مع نسيج مسامي لطيف على البشرة يمتص الرطوبة ويبقي الطلاب في قمة الانتعاش.'
      : lang === 'ml'
      ? '【ദിവസം മുഴുവൻ സൗകര്യം】: കഠിനമായ ചൂടിലും വിയർപ്പ് വലിച്ചെടുത്ത് തണുപ്പും ആശ്വാസവും നൽകുന്ന ബ്രീത്തബിൾ മെറ്റീരിയൽ.'
      : '【ALL-DAY BREATHABLE COMFORT】: Engineered for freedom of movement and moisture control. Keeps students and workers fresh and comfortable all day.',

    lang === 'ar'
      ? '【سهولة العناية ومقاومة البقع】: مقاوم للتجعد وثبات تام للألوان حتى مع الغسيل المتكرر والغسيل الآلي الأسبوعي.'
      : lang === 'ml'
      ? '【എളുപ്പത്തിൽ കഴുകാം】: ചുളിവുകൾ വീഴാത്തതും നിറം മങ്ങാത്തതുമായ വാഷ് ആന്റ് വെയർ തുണിത്തരം.'
      : '【EASY CARE & WRINKLE RESISTANT】: Machine washable with color-lock technology. Retains its sharp press and vibrant hue through frequent wash cycles.',

    lang === 'ar'
      ? '【جاهز للمدارس والمؤسسات】: مناسب للمدارس والشركات مع إمكانية إضافة شعار وتطريز مخصص لطلبات الجملة.'
      : lang === 'ml'
      ? '【ബൾക്ക് ഓർഡറുകൾ ലഭ്യമാണ്】: സ്കൂളുകൾക്കും സ്ഥാപനങ്ങൾക്കും കസ്റ്റം ലോഗോ എംബ്രോയിഡറിയോടെ ലഭ്യമാണ്.'
      : '【INSTITUTIONAL & BULK READY】: Perfect standard compliance for school uniform codes and industrial workplace safety standards.',
  ]

  // Dynamic translated specifications
  const specsList = [
    { label: t('attrBrand'), value: product.brand || 'Online Gulf Uniform' },
    { label: t('attrMaterial'), value: product.material || '65% Polyester, 35% Cotton Twill' },
    { label: t('attrScent'), value: product.fit || 'Regular Comfort Fit' },
    { label: t('attrBurnTime'), value: product.gender || product.category || 'Boys & Girls' },
    { label: t('attrItemWeight'), value: product.weight || '220 GSM' },
    { label: t('attrDimensions'), value: product.dimensions || 'Gulf / UK Standard Sizing' },
    { label: t('attrNumberItems'), value: '1 Uniform Unit with Size Label' },
    { label: t('attrCountryOrigin'), value: 'UAE / GCC & India' },
  ]`
)

// Replace breadcrumbs
content = content.replace(
  /<Link to="\/collections\/all-products" className="hover:text-\[#1D4ED8\]">Home & Kitchen<\/Link>[\s\S]*?<span className="truncate text-slate-700 font-medium">\{product\.title\}<\/span>/m,
  `<Link to="/collections/all-products" className="hover:text-[#1D4ED8]">Uniforms</Link>
          <span>›</span>
          <Link to={\`/collections/\${product.category ? product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'boys'}\`} className="hover:text-[#1D4ED8]">
            {product.category || 'Uniforms'}
          </Link>
          <span>›</span>
          <span className="truncate text-slate-700 font-medium">{product.title}</span>`
)

// Replace reviews text
content = content.replace(
  /headline: lang === 'ar' \? 'عطر ساحر[\s\S]*?: 'The scent fills the entire living room without being overwhelming[\s\S]*?zero soot\.',/m,
  `headline: lang === 'ar' ? 'جودة أقمشة ممتازة وخياطة متينة ومريحة طوال اليوم!' : lang === 'ml' ? 'മികച്ച തുണിത്തരവും ഈടുനിൽക്കുന്ന തയ്യലും!' : 'Superb fabric quality, durable stitching and comfortable all day!',
                    review: lang === 'ar'
                      ? 'القماش ممتاز جداً ومريح للطلاب طوال اليوم الدراسي. الألوان ثابتة حتى بعد الغسيل المتكرر.'
                      : lang === 'ml'
                      ? 'സ്കൂൾ ആവശ്യങ്ങൾക്ക് ഏറ്റവും അനുയോജ്യം. വാഷ് ചെയ്താലും നിറം മങ്ങുന്നില്ല, വളരെ കംഫർട്ടബിൾ ആണ്.'
                      : 'The fabric quality and reinforced stitching are outstanding. Held its shape and vibrant color through weekly washes. Perfect school fit.',`
)

// Replace Seo title
content = content.replace(
  /title=\{`\$\{product\.title\}: Buy Online at EvaraNest Amazon Store`\}/g,
  "title={`${product.title}: Buy Online at Online Gulf Uniform`}"
)

fs.writeFileSync(filePath, content, 'utf8')
console.log('Successfully patched Product.jsx')
