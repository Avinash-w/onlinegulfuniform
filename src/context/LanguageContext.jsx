import { createContext, useContext, useEffect, useState } from 'react'

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇦🇪', dir: 'rtl' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳', dir: 'ltr' },
]

export const TRANSLATIONS = {
  en: {
    // Header
    deliverTo: 'Deliver to',
    newDelhi: 'Dubai / GCC & India',
    allCategories: 'All Categories',
    searchPlaceholder: 'Search Online Gulf Uniforms (Pants, Shirts, PE, Safety)...',
    helloSignIn: 'Hello, Sign in',
    accountAndLists: 'Account & Lists',
    returnsAndOrders: 'Returns & Orders',
    cart: 'Cart',
    all: 'All Categories',
    home: 'Home',
    aboutUs: 'About Us',
    boys: 'Boys',
    girls: 'Girls',
    industrialUniforms: 'Industrial Uniforms',
    trackOrder: 'Track Order',
    contactUs: 'Contact Us',
    todaysDeals: "Today's Deals",
    bestSellers: 'Best Sellers',
    bulkOrders: 'Bulk & Corporate Quote',
    customerService: 'Customer Service',
    primeFastDelivery: '⚡ Fast Dispatch Across UAE, GCC & India',
    changeLocation: 'Choose your delivery location',
    apply: 'Apply',
    yourLists: 'Your Lists',
    yourAccount: 'Your Account',
    wishList: 'Wish List',
    signIn: 'Sign in',
    newCustomer: 'New customer?',
    startHere: 'Start here.',

    // Home Hero
    heroTitle1: 'Complete School Uniforms for Boys & Girls',
    heroSub1: 'Tailored Pants, Oxford Shirts, PE Kits, Pleated Skirts, Pinafores & Blazers.',
    heroTitle2: 'Industrial Workwear & Flame Resistant (FR) Safety Uniforms',
    heroSub2: 'Offshore Oil & Gas Coveralls, Workshop Boiler Suits, Chef Coats & Corporate Attire.',
    heroTitle3: 'Physical Education & House Sports Uniforms',
    heroSub3: 'Breathable Pique Polos, Lightweight Track Trousers & Quick-Dry Round Neck Tees.',
    shopNow: 'Shop Now',
    upTo60Off: 'Up to 30% off | Academic Pack',
    seeAllOffers: 'See all uniforms',
    curatedHampers: 'Boys School Uniforms',
    exploreHampers: 'Shop Boys Uniforms',
    aromaBars: 'Girls School Uniforms',
    shopFragrance: 'Shop Girls Uniforms',
    bulkCorporate: 'Bulk Institutional Uniforms',
    bulkSub: 'School boards, factories, hotel chains, and offshore contractors custom branding.',
    requestQuote: 'Request Uniform Quote',
    learnMore: 'Learn more',
    dealOfDay: 'Uniform of the Day',
    off: 'off',
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    freeDeliveryTomorrow: 'Fast Delivery to your location',
    seeAllDeals: 'See all collections',

    // Trust Strip
    freeDelivery: 'Free Delivery Available',
    freeDeliverySub: 'On qualifying bulk & school orders',
    payOnDelivery: 'Secure Payment',
    payOnDeliverySub: 'Cards, Netbanking & Corporate Invoicing',
    replacement7Days: 'Hassle-Free Sizing Exchanges',
    replacementSub: 'Exchange sizes within 7 days',
    amazonDelivered: 'Quality Guaranteed',
    amazonDeliveredSub: 'Certified anti-tear & durable fabrics',
    safePayments: '100% Safe Payments',
    safePaymentsSub: 'SSL encrypted checkout',

    // Product Details
    visitStore: 'Visit the Online Gulf Uniform Store',
    ratings: 'ratings',
    boughtPastMonth: '100+ uniform sets supplied this month',
    amazonsChoice: "Verified Uniform",
    forHandmadeCandle: 'for "school and workwear uniforms"',
    mrp: 'Price:',
    inclusiveTaxes: 'Inclusive of all applicable taxes',
    emiStarts: 'Bulk discount available for 20+ units.',
    offers: 'Institutional Offers',
    bankOffer: 'Institutional Discount',
    bankOfferDesc: 'Extra discounts on bulk school / corporate orders',
    partnerOffer: 'GST & VAT Invoicing',
    partnerOfferDesc: 'Download tax-compliant VAT & GST invoices',
    secureTransaction: 'Secure Transaction',
    topBrand: 'Trusted Uniform Manufacturer',
    colour: 'Uniform Colour',
    fragrance: 'Style / Cut',
    selectSize: 'Select Uniform Size',
    aboutItem: 'About this uniform',
    technicalDetails: 'Technical Specifications',
    inStock: 'In Stock',
    quantity: 'Quantity:',
    shipsFrom: 'Ships from',
    soldBy: 'Sold by',
    payment: 'Payment',
    addGiftOptions: 'Add custom logo embroidery note',
    addToWishList: 'Add to Wish List',
    addedToWishList: '✓ Added to Wish List',
    bulkWhatsApp: 'Bulk Order Quotation (WhatsApp)',
    rollOverZoom: '🔍 Roll over image to zoom in',
    customerReviews: 'Customer reviews',
    outOf5Stars: 'out of 5 stars',
    globalRatings: 'verified buyer reviews',
    topReviews: 'Verified School & Corporate Feedback',
    verifiedPurchase: 'Verified Purchase',
    customersAlsoViewed: 'Frequently Bought Together',

    // Attributes
    attrBrand: 'Brand',
    attrMaterial: 'Fabric / Material',
    attrScent: 'Style / Pattern',
    attrBurnTime: 'Stitching & Seams',
    attrItemWeight: 'Fabric Weight (GSM)',
    attrDimensions: 'Sizing Standard',
    attrNumberItems: 'Package Contents',
    attrCountryOrigin: 'Origin',
  },

  ar: {
    // Header
    deliverTo: 'التوصيل إلى',
    newDelhi: 'دبي / دول الخليج والهند',
    allCategories: 'جميع الفئات',
    searchPlaceholder: 'ابحث في أونلاين جلف يونيفورم (بناطيل، قمصان، ملابس رياضية، صناعية)...',
    helloSignIn: 'مرحباً، تسجيل الدخول',
    accountAndLists: 'الحساب والقوائم',
    returnsAndOrders: 'الطلبات والمرتجعات',
    cart: 'عربة التسوق',
    all: 'جميع الفئات',
    home: 'الرئيسية',
    aboutUs: 'معلومات عنا',
    boys: 'الأولاد',
    girls: 'البنات',
    industrialUniforms: 'الزي الصناعي',
    trackOrder: 'تتبع الطلب',
    contactUs: 'اتصل بنا',
    todaysDeals: 'عروض اليوم',
    bestSellers: 'الأكثر مبيعاً',
    bulkOrders: 'طلبات الجملة والشركات',
    customerService: 'خدمة العملاء',
    primeFastDelivery: '⚡ شحن سريع في الإمارات والخليج والهند',
    changeLocation: 'اختر موقع التوصيل',
    apply: 'تطبيق',
    yourLists: 'قوائمك',
    yourAccount: 'حسابك',
    wishList: 'قائمة الرغبات',
    signIn: 'تسجيل الدخول',
    newCustomer: 'عميل جديد؟',
    startHere: 'ابدأ هنا.',

    // Home Hero
    heroTitle1: 'الزي المدرسي المتكامل للأولاد والبنات',
    heroSub1: 'بناطيل، قمصان أكسفورد، أطقم الرياضة، تنانير ومرايل وبلايزر رسمي.',
    heroTitle2: 'ملابس السلامة الصناعية المقاومة للحريق (FR)',
    heroSub2: 'أوفرول حقول النفط والغاز، بدلات ورش العمل، سترات الطهاة والزي المكتبي.',
    heroTitle3: 'أطقم التربية البدنية والأنشطة المدرسية',
    heroSub3: 'بولو بيكيه مسامي، بناطيل رياضية خفيفة وتيشرتات قطنية مريحة.',
    shopNow: 'تسوق الآن',
    upTo60Off: 'خصم حتى 30% | باقة المدارس',
    seeAllOffers: 'عرض جميع المنتجات',
    curatedHampers: 'زي الأولاد المدرسي',
    exploreHampers: 'تسوق للأولاد',
    aromaBars: 'زي البنات المدرسي',
    shopFragrance: 'تسوق للبنات',
    bulkCorporate: 'طلبات المؤسسات والكميات الكبيرة',
    bulkSub: 'للمدارس والمصانع وسلاسل الفنادق وشركات المقاولات مع تطريز الشعار.',
    requestQuote: 'طلب عرض سعر بالجملة',
    learnMore: 'اعرف المزيد',
    dealOfDay: 'عرض اليوم المميز',
    off: 'خصم',
    addToCart: 'أضف إلى السلة',
    buyNow: 'شراء الآن',
    freeDeliveryTomorrow: 'توصيل سريع إلى موقعك',
    seeAllDeals: 'عرض جميع المجموعات',

    // Trust Strip
    freeDelivery: 'شحن مجاني متاح',
    freeDeliverySub: 'للطلبات المؤهلة والكميات المدرسية',
    payOnDelivery: 'دفع آمن ومريح',
    payOnDeliverySub: 'بطاقات ائتمانية وفواتير ضريبية معتمدة',
    replacement7Days: 'استبدال المقاسات بسهولة',
    replacementSub: 'ضمان المقاس المناسب خلال 7 أيام',
    amazonDelivered: 'جودة مضمونة',
    amazonDeliveredSub: 'أقمشة متينة ومعتمدة ضد التمزق',
    safePayments: 'دفع آمن 100%',
    safePaymentsSub: 'بوابة دفع مشفرة بالكامل',

    // Product Details
    visitStore: 'زيارة متجر أونلاين جلف يونيفورم',
    ratings: 'تقييماً',
    boughtPastMonth: 'أكثر من 100 طقم تم توريده هذا الشهر',
    amazonsChoice: 'زي معتمد',
    forHandmadeCandle: 'لـ "الزي المدرسي وملابس العمل"',
    mrp: 'السعر:',
    inclusiveTaxes: 'شامل جميع الضرائب المطبقة',
    emiStarts: 'خصومات للكميات من 20 قطعة فأكثر.',
    offers: 'عروض المؤسسات',
    bankOffer: 'خصم الكميات الكبيرة',
    bankOfferDesc: 'خصومات خاصة لطلبات المدارس والشركات',
    partnerOffer: 'فواتير ضريبية معتمدة',
    partnerOfferDesc: 'احصل على فواتير ضريبة القيمة المضافة',
    secureTransaction: 'معاملة آمنة',
    topBrand: 'علامة تجارية موثوقة للزي الموحد',
    colour: 'لون الزي',
    fragrance: 'القصة والتصميم',
    selectSize: 'اختر مقاس الزي',
    aboutItem: 'تفاصيل المنتج',
    technicalDetails: 'المواصفات الفنية',
    inStock: 'متوفر في المخزون',
    quantity: 'الكمية:',
    shipsFrom: 'يشحن من',
    soldBy: 'يباع بواسطة',
    payment: 'الدفع',
    addGiftOptions: 'إضافة ملاحظة تطريز الشعار',
    addToWishList: 'إضافة إلى قائمة الرغبات',
    addedToWishList: '✓ تمت الإضافة إلى قائمة الرغبات',
    bulkWhatsApp: 'طلب عرض سعر كميات (واتساب)',
    rollOverZoom: '🔍 مرر مؤشر الماوس للتكبير',
    customerReviews: 'آراء العملاء',
    outOf5Stars: 'من 5 نجوم',
    globalRatings: 'تقييمات موثقة',
    topReviews: 'تقييمات المدارس والشركات',
    verifiedPurchase: 'شراء مؤكد',
    customersAlsoViewed: 'منتجات يشتريها العملاء معاً',

    // Attributes
    attrBrand: 'العلامة التجارية',
    attrMaterial: 'نوع القماش / الخامة',
    attrScent: 'القصة والموديل',
    attrBurnTime: 'نوع الخياطة والتدعيم',
    attrItemWeight: 'وزن القماش (GSM)',
    attrDimensions: 'معيار المقاسات',
    attrNumberItems: 'محتويات العبوة',
    attrCountryOrigin: 'بلد المنشأ',
  },

  ml: {
    // Header
    deliverTo: 'ഡെലിവറി ചെയ്യേണ്ട സ്ഥലം',
    newDelhi: 'ദുബായ് / ജിസിസി & ഇന്ത്യ',
    allCategories: 'എല്ലാ വിഭാഗങ്ങളും',
    searchPlaceholder: 'ഓൺലൈൻ ഗൾഫ് യൂണിഫോമുകൾ തിരയുക (പാന്റ്സ്, ഷർട്ട്സ്, പിഇ, വർക്ക്വെയർ)...',
    helloSignIn: 'ഹലോ, സൈൻ ഇൻ ചെയ്യുക',
    accountAndLists: 'അക്കൗണ്ടും ലിസ്റ്റുകളും',
    returnsAndOrders: 'ഓർഡറുകൾ & റിട്ടേണുകൾ',
    cart: 'കാർട്ട്',
    all: 'എല്ലാ വിഭാഗങ്ങളും',
    home: 'ഹോം',
    aboutUs: 'ഞങ്ങളെ കുറിച്ച്',
    boys: 'ആൺകുട്ടികൾ',
    girls: 'പെൺകുട്ടികൾ',
    industrialUniforms: 'വ്യാവസായിക യൂണിഫോമുകൾ',
    trackOrder: 'ഓർഡർ ട്രാക്ക് ചെയ്യുക',
    contactUs: 'ഞങ്ങളെ ബന്ധപ്പെടുക',
    todaysDeals: 'ഇന്നത്തെ ഡീലുകൾ',
    bestSellers: 'ഏറ്റവും കൂടുതൽ വിറ്റഴിക്കപ്പെടുന്നവ',
    bulkOrders: 'ബൾക്ക് & കോർപ്പറേറ്റ് ഓർഡറുകൾ',
    customerService: 'കസ്റ്റമർ കെയർ',
    primeFastDelivery: '⚡ യുഎഇ, ജിസിസി, ഇന്ത്യ എന്നിവിടങ്ങളിൽ വേഗതയേറിയ ഡെലിവറി',
    changeLocation: 'ഡെലിവറി ലൊക്കേഷൻ തിരഞ്ഞെടുക്കുക',
    apply: 'അപ്ലൈ',
    yourLists: 'നിങ്ങളുടെ ലിസ്റ്റുകൾ',
    yourAccount: 'നിങ്ങളുടെ അക്കൗണ്ട്',
    wishList: 'വിഷ് ലിസ്റ്റ്',
    signIn: 'സൈൻ ഇൻ',
    newCustomer: 'പുതിയ ഉപഭോക്താവാണോ?',
    startHere: 'ഇവിടെ ആരംഭിക്കുക.',

    // Home Hero
    heroTitle1: 'ആൺകുട്ടികൾക്കും പെൺകുട്ടികൾക്കുമുള്ള സ്കൂൾ യൂണിഫോമുകൾ',
    heroSub1: 'പാന്റ്സ്, ഓക്സ്ഫോർഡ് ഷർട്ടുകൾ, പിഇ സ്പോർട്സ് കിറ്റുകൾ, പ്ലേറ്റഡ് പാവാടകൾ, ബ്ലേസറുകൾ.',
    heroTitle2: 'വ്യാവസായിക & ഫയർ റെസിസ്റ്റന്റ് (FR) സുരക്ഷാ യൂണിഫോമുകൾ',
    heroSub2: 'ഓയിൽ & ഗ്യാസ് ബോയിലർ സ്യൂട്ടുകൾ, വർക്ക്‌ഷോപ്പ് കവറോൾസ്, ഷെഫ് കോട്ടുകൾ, കോർപ്പറേറ്റ് സ്യൂട്ടുകൾ.',
    heroTitle3: 'സ്പോർട്സ് & പിഇ യൂണിഫോമുകൾ',
    heroSub3: 'ബ്രീത്തബിൾ പോളോകൾ, ലൈറ്റ്വെയ്റ്റ് ട്രാക്ക് പാന്റുകൾ, ക്വിക്ക്-ഡ്രൈ ടി-ഷർട്ടുകൾ.',
    shopNow: 'ഇപ്പോൾ വാങ്ങുക',
    upTo60Off: '30% വരെ കിഴിവ് | സ്കൂൾ ഓഫറുകൾ',
    seeAllOffers: 'എല്ലാ യൂണിഫോമുകളും കാണുക',
    curatedHampers: 'ബോയ്സ് സ്കൂൾ യൂണിഫോമുകൾ',
    exploreHampers: 'ബോയ്സ് യൂണിഫോമുകൾ വാങ്ങുക',
    aromaBars: 'ഗേൾസ് സ്കൂൾ യൂണിഫോമുകൾ',
    shopFragrance: 'ഗേൾസ് യൂണിഫോമുകൾ വാങ്ങുക',
    bulkCorporate: 'സ്ഥാപനങ്ങൾക്കായുള്ള ബൾക്ക് ഓർഡറുകൾ',
    bulkSub: 'സ്കൂളുകൾ, കമ്പനികൾ, ഫാക്ടറികൾ എന്നിവർക്കായി കസ്റ്റം ലോഗോ എംബ്രോയിഡറി സഹിതം.',
    requestQuote: 'ബൾക്ക് ക്വോട്ട് ആവശ്യപ്പെടുക',
    learnMore: 'കൂടുതലറിയുക',
    dealOfDay: 'ഇന്നത്തെ പ്രധാന ഡീൽ',
    off: 'കിഴിവ്',
    addToCart: 'കാർട്ടിലേക്ക് ചേർക്കുക',
    buyNow: 'ഇപ്പോൾ വാങ്ങുക',
    freeDeliveryTomorrow: 'നിങ്ങളുടെ ലൊക്കേഷനിലേക്ക് വേഗത്തിലുള്ള ഡെലിവറി',
    seeAllDeals: 'എല്ലാ കളക്ഷനുകളും കാണുക',

    // Trust Strip
    freeDelivery: 'സൗജന്യ ഡെലിവറി ലഭ്യമാണ്',
    freeDeliverySub: 'ബൾക്ക് & സ്കൂൾ ഓർഡറുകൾക്ക്',
    payOnDelivery: 'സുരക്ഷിതമായ പെയ്‌മെന്റ്',
    payOnDeliverySub: 'കാർഡുകൾ & ജിഎസ്ടി / വാറ്റ് ഇൻവോയ്സിംഗ്',
    replacement7Days: '7 ദിവസത്തെ സൈസ് എക്സ്ചേഞ്ച്',
    replacementSub: 'എളുപ്പത്തിലുള്ള സൈസ് മാറ്റം',
    amazonDelivered: 'ഗുണനിലവാരം ഉറപ്പുനൽകുന്നു',
    amazonDeliveredSub: 'ഉയർന്ന നിലവാരമുള്ള ഡ്യൂറബിൾ തുണിത്തരങ്ങൾ',
    safePayments: '100% സുരക്ഷിത പെയ്‌മെന്റ്',
    safePaymentsSub: 'എസ്എസ്എൽ എൻക്രിപ്റ്റഡ് ചെക്കൗട്ട്',

    // Product Details
    visitStore: 'ഓൺലൈൻ ഗൾഫ് യൂണിഫോം സ്റ്റോർ സന്ദർശിക്കുക',
    ratings: 'റേറ്റിംഗുകൾ',
    boughtPastMonth: 'ഈ മാസം 100-ലധികം യൂണിഫോമുകൾ വിറ്റുപോയി',
    amazonsChoice: 'പരിശോധിച്ചുറപ്പിച്ച യൂണിഫോം',
    forHandmadeCandle: '"സ്കൂൾ & വർക്ക്വെയർ യൂണിഫോമുകൾക്ക്"',
    mrp: 'വില:',
    inclusiveTaxes: 'എല്ലാ നികുതികളും ഉൾപ്പെടെ',
    emiStarts: '20+ യൂണിറ്റുകൾക്ക് ബൾക്ക് ഡിസ്കൗണ്ട് ലഭ്യമാണ്.',
    offers: 'സ്ഥാപന ഓഫറുകൾ',
    bankOffer: 'ബൾക്ക് ഡിസ്കൗണ്ട്',
    bankOfferDesc: 'സ്കൂൾ / കോർപ്പറേറ്റ് ബൾക്ക് ഓർഡറുകൾക്ക് പ്രത്യേക കിഴിവ്',
    partnerOffer: 'നികുതി ഇൻവോയ്സുകൾ',
    partnerOfferDesc: 'ജിഎസ്ടി & വാറ്റ് ഇൻവോയ്സുകൾ ഡൗൺലോഡ് ചെയ്യുക',
    secureTransaction: 'സുരക്ഷിതമായ ഇടപാടുകൾ',
    topBrand: 'വിശ്വസനീയമായ യൂണിഫോം നിർമ്മാതാക്കൾ',
    colour: 'യൂണിഫോം നിറം',
    fragrance: 'സ്റ്റൈൽ / കട്ട്',
    selectSize: 'യൂണിഫോം സൈസ് തിരഞ്ഞെടുക്കുക',
    aboutItem: 'ഈ യൂണിഫോമിനെ കുറിച്ച്',
    technicalDetails: 'സാങ്കേതിക വിവരങ്ങൾ',
    inStock: 'സ്റ്റോക്കുണ്ട്',
    quantity: 'എണ്ണം:',
    shipsFrom: 'ഷിപ്പിംഗ് ഉറവിടം',
    soldBy: 'വിൽപ്പനക്കാരൻ',
    payment: 'പെയ്‌മെന്റ്',
    addGiftOptions: 'ലോഗോ എംബ്രോയിഡറി നിർദ്ദേശങ്ങൾ നൽകുക',
    addToWishList: 'വിഷ് ലിസ്റ്റിലേക്ക് ചേർക്കുക',
    addedToWishList: '✓ വിഷ് ലിസ്റ്റിലേക്ക് ചേർത്തു',
    bulkWhatsApp: 'ബൾക്ക് ഓർഡർ ക്വട്ടേഷൻ (വാട്സ്ആപ്പ്)',
    rollOverZoom: '🔍 ചിത്രം സൂം ചെയ്യാൻ മൗസ് നീക്കുക',
    customerReviews: 'ഉപഭോക്തൃ അവലോകനങ്ങൾ',
    outOf5Stars: '5-ൽ',
    globalRatings: 'പരിശോധിച്ച ഉപഭോക്തൃ റേറ്റിംഗുകൾ',
    topReviews: 'സ്കൂൾ & കോർപ്പറേറ്റ് ഫീഡ്‌ബാക്ക്',
    verifiedPurchase: 'സ്ഥിരീകരിച്ച വാങ്ങൽ',
    customersAlsoViewed: 'ഒരുമിച്ച് വാങ്ങുന്നവ',

    // Attributes
    attrBrand: 'ബ്രാൻഡ്',
    attrMaterial: 'തുണിത്തരം / മെറ്റീരിയൽ',
    attrScent: 'സ്റ്റൈൽ / ഡിസൈൻ',
    attrBurnTime: 'തയ്യൽ ഗുണനിലവാരം',
    attrItemWeight: 'തുണിയുടെ ഭാരം (GSM)',
    attrDimensions: 'സൈസിംഗ് മാനദണ്ഡം',
    attrNumberItems: 'പാക്കേജ് ഉള്ളടക്കം',
    attrCountryOrigin: 'ഉത്ഭവം',
  },
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('ogu_language') || 'en'
    } catch {
      return 'en'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('ogu_language', lang)
    } catch {}

    const selected = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', selected.dir)
  }, [lang])

  const t = (key) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en
    return dict[key] ?? TRANSLATIONS.en[key] ?? key
  }

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]

  return (
    <LanguageContext.Provider value={{ lang, setLang, currentLang, languages: LANGUAGES, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
