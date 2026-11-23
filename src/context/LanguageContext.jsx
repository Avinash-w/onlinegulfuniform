import { createContext, useContext, useEffect, useRef, useState } from 'react'

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
    amazonsChoice: 'Verified Uniform',
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

    // Categories & Subcategories
    'Boys': 'Boys',
    'Girls': 'Girls',
    'Industrial Uniforms': 'Industrial Uniforms',
    'Home': 'Home',
    'About Us': 'About Us',
    'Track Order': 'Track Order',
    'Contact Us': 'Contact Us',
    'Pants': 'Pants',
    'Dress Shirts Short Sleeve': 'Dress Shirts Short Sleeve',
    'Dress shirt Long Sleeve': 'Dress shirt Long Sleeve',
    'PE trousers': 'PE trousers',
    'PE polo shirts': 'PE polo shirts',
    'PE Round Neck T Shirts': 'PE Round Neck T Shirts',
    'Shorts': 'Shorts',
    'Jackets': 'Jackets',
    'Skirts': 'Skirts',
    'Skorts': 'Skorts',
    'Pinafore': 'Pinafore',
    'Polo Shirts': 'Polo Shirts',
    'Corporate Uniform': 'Corporate Uniform',
    'Restaurant Uniforms': 'Restaurant Uniforms',
    'Engineering Uniforms': 'Engineering Uniforms',
    'Oil and Gas Uniforms': 'Oil and Gas Uniforms',
    'School Uniforms': 'School Uniforms',
    'Workwear': 'Workwear',
    'Safety & Oil/Gas': 'Safety & Oil/Gas',
    'All Products': 'All Products',
    'Uniform Catalog': 'Uniform Catalog',

    // Cart & Checkout
    shoppingBag: 'Shopping Cart',
    shoppingCart: 'Shopping Cart',
    cartEmpty: 'Your shopping cart is empty',
    cartEmptySub: 'Explore our school and industrial uniform collections to add items.',
    continueShopping: 'Continue Shopping',
    subtotal: 'Subtotal',
    proceedToCheckout: 'Proceed to Checkout',
    checkout: 'Checkout',
    applyCoupon: 'Apply Coupon',
    couponCode: 'Coupon Code',
    enterCoupon: 'Enter coupon code',
    discount: 'Discount',
    shipping: 'Shipping',
    free: 'FREE',
    taxes: 'Taxes',
    total: 'Total',
    orderTotal: 'Order Total',
    viewCart: 'View Cart',
    remove: 'Remove',
    qty: 'Qty',
    savings: 'Savings',

    // Collection, Filters & Search
    search: 'Search',
    results: 'Results',
    filterBy: 'Filter by',
    sortBy: 'Sort by',
    featured: 'Featured',
    bestSelling: 'Best selling',
    priceLowHigh: 'Price: Low to High',
    priceHighLow: 'Price: High to Low',
    newest: 'Newest arrivals',
    reset: 'Reset',
    clearAll: 'Clear all',
    price: 'Price',
    category: 'Category',
    size: 'Size',
    color: 'Color',
    fabric: 'Fabric',
    availability: 'Availability',
    selectedPriceRange: 'Selected Price Range',
    noProductsMatch: 'No products matched your search or filters.',
    tryDifferentSearch: 'Try searching with different keywords or clearing applied filters.',
    viewAllBoys: 'View All Boys Uniforms',
    viewAllGirls: 'View All Girls Uniforms',
    viewAllIndustrial: 'View All Industrial Uniforms',

    // Mobile Menu
    myAccount: 'My Account',
    logIn: 'Log In',
    whatsappQuotation: 'WhatsApp Quotation',
    browseCategories: 'Browse Uniform Categories',
    selectLanguage: 'Select Language',
    currencyAedOnly: 'All prices in AED (United Arab Emirates Dirham)',

    // Header extras
    boysSubcatHeading: 'Boys Uniform Categories',
    girlsSubcatHeading: 'Girls Uniform Categories',
    industrialSubcatHeading: 'Industrial & Workwear Categories',
    schoolUniforms: 'School Uniforms',
    corporateUniforms: 'Corporate Uniforms',
    safetyOilGas: 'Safety & Oil/Gas',
    uniformCatalog: 'Uniform Catalog',
    returns: 'Returns',
    andOrders: '& Orders',
    locationPlaceholder: 'City or Postcode (e.g. Dubai, Abu Dhabi)',

    // Home Hero extras
    viewDetails: 'View Details',
    shopByCategory: 'Shop by Category',
    boysUniforms: 'Boys Uniforms',
    girlsUniforms: 'Girls Uniforms',
    industrialWorkwear: 'Industrial Workwear',
    boysSub: 'Pants, Shirts & PE Kits',
    girlsSub: 'Skirts, Pinafores & Shirts',
    industrialSub: 'Coveralls, Polo & Suits',
    boysSection: 'Boys School Uniform',
    girlsSection: 'Girls School Uniform',
    industrialSection: 'Industrial & Safety Workwear',
    viewAll: 'View all →',

    // Footer extras
    getToKnowUs: 'Get to Know Us',
    connectWithUs: 'Connect with Us',
    makeMoneyWithUs: 'Make Money with Us',
    letUsHelpYou: 'Let Us Help You',
    aboutOGU: 'About Online Gulf Uniform',
    whatsappDirect: 'WhatsApp Direct',
    contactSupport: 'Contact Support',
    bulkCorporateSupply: 'Bulk & Corporate Supply',
    wholesalePartners: 'Wholesale Partners',
    adminPortal: 'Admin Portal',
    trackYourOrders: 'Track Your Orders',
    shippingRates: 'Shipping Rates & Policies',
    returnsReplacements: 'Returns & Replacements',
    backToTop: '▲ Back to Top',
    emailPlaceholder: 'Enter email for deals...',
    subscribedMsg: 'Subscribed! Check your inbox.',
    subscribe: 'Subscribe',

    // Cart & Product Card extras
    myBag: 'My Bag',
    availableCoupons: 'Available Coupons',
    customization: 'Customization',
    youSave: 'You save',
    availableOffers: 'Available Offers',
    coupons: 'Coupons',
    coupon: 'Coupon',
    freeShippingNote: 'Free Shipping in UAE',
    dayReturns: '7-Day Returns',
    soldOut: 'Sold Out',
    customize: 'Customize',
    colors: 'colors',
    bestPrice: 'Best Price',

    // Footer copyright
    footerCopyright: '© 2024 Online Gulf Uniform. All rights reserved.',
    allRightsReserved: 'Operated under EvaraNest Retail Pvt. Ltd.',
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

    // Categories & Subcategories
    'Boys': 'الأولاد',
    'Girls': 'البنات',
    'Industrial Uniforms': 'الزي الصناعي',
    'Home': 'الرئيسية',
    'About Us': 'معلومات عنا',
    'Track Order': 'تتبع الطلب',
    'Contact Us': 'اتصل بنا',
    'Pants': 'بناطيل',
    'Dress Shirts Short Sleeve': 'قمصان رسمية بنصف كم',
    'Dress shirt Long Sleeve': 'قمصان رسمية بأكمام طويلة',
    'PE trousers': 'بناطيل رياضية (PE)',
    'PE polo shirts': 'قمصان بولو رياضية (PE)',
    'PE Round Neck T Shirts': 'تيشرتات رياضية برقبة مستديرة',
    'Shorts': 'شورت مدرسي',
    'Jackets': 'سترات وبلايزر',
    'Skirts': 'تنانير مدرسية',
    'Skorts': 'سكورت مدرسي (تنورة شورت)',
    'Pinafore': 'مرايل مدرسية (بينافورا)',
    'Polo Shirts': 'قمصان بولو صناعية للعمل',
    'Corporate Uniform': 'الزي المكتبي والشركات',
    'Restaurant Uniforms': 'زي المطاعم والضيافة',
    'Engineering Uniforms': 'زي المهندسين والفنيين',
    'Oil and Gas Uniforms': 'زي حقول النفط والغاز المقاوم للحريق',
    'School Uniforms': 'الزي المدرسي',
    'Workwear': 'ملابس العمل',
    'Safety & Oil/Gas': 'السلامة وحقول النفط والغاز',
    'All Products': 'جميع المنتجات',
    'Uniform Catalog': 'كتالوج الزي الموحد',

    // Cart & Checkout
    shoppingBag: 'عربة التسوق',
    shoppingCart: 'عربة التسوق',
    cartEmpty: 'عربة التسوق فارغة حالياً',
    cartEmptySub: 'تصفح تشكيلات الزي المدرسي والصناعي وأضف منتجاتك المفضلة.',
    continueShopping: 'متابعة التسوق',
    subtotal: 'المجموع الفرعي',
    proceedToCheckout: 'متابعة الدفع',
    checkout: 'إتمام الطلب',
    applyCoupon: 'تطبيق كود الخصم',
    couponCode: 'رمز القسيمة',
    enterCoupon: 'أدخل رمز القسيمة',
    discount: 'الخصم',
    shipping: 'الشحن والتوصيل',
    free: 'مجاناً',
    taxes: 'شامل الضريبة',
    total: 'الإجمالي النهائي',
    orderTotal: 'إجمالي الطلب',
    viewCart: 'عرض السلة',
    remove: 'حذف',
    qty: 'الكمية',
    savings: 'مجموع التوفير',

    // Collection, Filters & Search
    search: 'بحث',
    results: 'النتائج',
    filterBy: 'تصفية النتائج',
    sortBy: 'ترتيب حسب',
    featured: 'المميز',
    bestSelling: 'الأكثر مبيعاً',
    priceLowHigh: 'السعر: من الأقل إلى الأعلى',
    priceHighLow: 'السعر: من الأعلى إلى الأقل',
    newest: 'أحدث الإضافات',
    reset: 'إعادة تعيين',
    clearAll: 'مسح الكل',
    price: 'السعر',
    category: 'الفئة',
    size: 'المقاس',
    color: 'اللون',
    fabric: 'القماش',
    availability: 'التوفر',
    selectedPriceRange: 'نطاق السعر المحدد',
    noProductsMatch: 'لم يتم العثور على أي منتج يطابق معايير البحث أو التصفية.',
    tryDifferentSearch: 'يرجى تجربة كلمات بحث أخرى أو إلغاء تطبيق الفلاتر.',
    viewAllBoys: 'عرض جميع أزياء الأولاد',
    viewAllGirls: 'عرض جميع أزياء البنات',
    viewAllIndustrial: 'عرض جميع الأزياء الصناعية',

    // Mobile Menu
    myAccount: 'حسابي',
    logIn: 'تسجيل الدخول',
    whatsappQuotation: 'طلب عرض سعر (واتساب)',
    browseCategories: 'تصفح فئات الزي الموحد',
    selectLanguage: 'اختر اللغة',
    currencyAedOnly: 'جميع الأسعار بالدرهم الإماراتي (AED)',

    // Header extras
    boysSubcatHeading: 'أقسام زي الأولاد',
    girlsSubcatHeading: 'أقسام زي البنات',
    industrialSubcatHeading: 'فئات الزي الصناعي وملابس العمل',
    schoolUniforms: 'الزي المدرسي',
    corporateUniforms: 'زي الشركات',
    safetyOilGas: 'السلامة وحقول النفط والغاز',
    uniformCatalog: 'كتالوج الزي',
    returns: 'الإرجاع',
    andOrders: 'والطلبات',
    locationPlaceholder: 'المدينة أو الرمز البريدي (مثال: دبي، أبوظبي)',

    // Home Hero extras
    viewDetails: 'عرض التفاصيل',
    shopByCategory: 'تسوق حسب الفئة',
    boysUniforms: 'زي الأولاد',
    girlsUniforms: 'زي البنات',
    industrialWorkwear: 'ملابس العمل الصناعية',
    boysSub: 'بناطيل، قمصان وأطقم رياضية',
    girlsSub: 'تنانير، مرايل وقمصان',
    industrialSub: 'أوفرول، بولو وبدلات',
    boysSection: 'زي الأولاد المدرسي',
    girlsSection: 'زي البنات المدرسي',
    industrialSection: 'الزي الصناعي وملابس السلامة',
    viewAll: 'عرض الكل →',

    // Footer extras
    getToKnowUs: 'تعرف علينا',
    connectWithUs: 'تواصل معنا',
    makeMoneyWithUs: 'اربح معنا',
    letUsHelpYou: 'دعنا نساعدك',
    aboutOGU: 'عن أونلاين جلف يونيفورم',
    whatsappDirect: 'واتساب مباشر',
    contactSupport: 'تواصل مع الدعم',
    bulkCorporateSupply: 'التوريد بالجملة والشركات',
    wholesalePartners: 'شراكات الجملة',
    adminPortal: 'بوابة المسؤول',
    trackYourOrders: 'تتبع طلباتك',
    shippingRates: 'أسعار الشحن والسياسات',
    returnsReplacements: 'الإرجاع والاستبدال',
    backToTop: '▲ العودة للأعلى',
    emailPlaceholder: 'أدخل بريدك الإلكتروني للعروض...',
    subscribedMsg: 'تم الاشتراك! تحقق من بريدك.',
    subscribe: 'اشتراك',

    // Cart & Product Card extras
    myBag: 'حقيبتي',
    availableCoupons: 'القسائم المتاحة',
    customization: 'تخصيص',
    youSave: 'وفرت',
    availableOffers: 'العروض المتاحة',
    coupons: 'القسائم',
    coupon: 'قسيمة',
    freeShippingNote: 'شحن مجاني في الإمارات',
    dayReturns: '7 أيام للإرجاع',
    soldOut: 'نفد المخزون',
    customize: 'تخصيص',
    colors: 'ألوان',
    bestPrice: 'أفضل سعر',

    // Footer copyright
    footerCopyright: '© 2024 أونلاين جلف يونيفورم. جميع الحقوق محفوظة.',
    allRightsReserved: 'تحت إشراف EvaraNest Retail Pvt. Ltd.',
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

    // Categories & Subcategories
    'Boys': 'ആൺകുട്ടികൾ',
    'Girls': 'പെൺകുട്ടികൾ',
    'Industrial Uniforms': 'വ്യാവസായിക യൂണിഫോമുകൾ',
    'Home': 'ഹോം',
    'About Us': 'ഞങ്ങളെ കുറിച്ച്',
    'Track Order': 'ഓർഡർ ട്രാക്ക് ചെയ്യുക',
    'Contact Us': 'ഞങ്ങളെ ബന്ധപ്പെടുക',
    'Pants': 'പാന്റ്സ്',
    'Dress Shirts Short Sleeve': 'ഷോർട്ട് സ്ലീവ് ഡ്രസ്സ് ഷർട്ടുകൾ',
    'Dress shirt Long Sleeve': 'ലോംഗ് സ്ലീവ് ഡ്രസ്സ് ഷർട്ടുകൾ',
    'PE trousers': 'പിഇ ട്രൗസറുകൾ',
    'PE polo shirts': 'പിഇ പോളോ ഷർട്ടുകൾ',
    'PE Round Neck T Shirts': 'പിഇ റൗണ്ട് നെക്ക് ടി-ഷർട്ടുകൾ',
    'Shorts': 'ഷോർട്ട്സ്',
    'Jackets': 'ജാക്കറ്റുകൾ & ബ്ലേസറുകൾ',
    'Skirts': 'പാവാടകൾ',
    'Skorts': 'സ്കോർട്സ്',
    'Pinafore': 'പിനാഫോർ (മറിയോൾ)',
    'Polo Shirts': 'വർക്ക് പോളോ ഷർട്ടുകൾ',
    'Corporate Uniform': 'കോർപ്പറേറ്റ് യൂണിഫോം',
    'Restaurant Uniforms': 'റെസ്റ്റോറന്റ് യൂണിഫോമുകൾ',
    'Engineering Uniforms': 'എഞ്ചിനീയറിംഗ് യൂണിഫോമുകൾ',
    'Oil and Gas Uniforms': 'ഓയിൽ & ഗ്യാസ് സേഫ്റ്റി യൂണിഫോമുകൾ',
    'School Uniforms': 'സ്കൂൾ യൂണിഫോമുകൾ',
    'Workwear': 'വർക്ക് വെയർ',
    'Safety & Oil/Gas': 'സേഫ്റ്റി & ഓയിൽ/ഗ്യാസ്',
    'All Products': 'എല്ലാ ഉൽപ്പന്നങ്ങളും',
    'Uniform Catalog': 'യൂണിഫോം കാറ്റലോഗ്',

    // Cart & Checkout
    shoppingBag: 'ഷോപ്പിംഗ് കാർട്ട്',
    shoppingCart: 'ഷോപ്പിംഗ് കാർട്ട്',
    cartEmpty: 'നിങ്ങളുടെ കാർട്ട് ശൂന്യമാണ്',
    cartEmptySub: 'സ്കൂൾ, വ്യാവസായിക യൂണിഫോമുകൾ കാണാനും കാർട്ടിലേക്ക് ചേർക്കാനും തുടങ്ങൂ.',
    continueShopping: 'ഷോപ്പിംഗ് തുടരുക',
    subtotal: 'ആകെ തുക',
    proceedToCheckout: 'ചെക്കൗട്ടിലേക്ക് കടക്കുക',
    checkout: 'ചെക്കൗട്ട്',
    applyCoupon: 'കൂപ്പൺ ചേർക്കുക',
    couponCode: 'കൂപ്പൺ കോഡ്',
    enterCoupon: 'കൂപ്പൺ കോഡ് നൽകുക',
    discount: 'കിഴിവ്',
    shipping: 'ഷിപ്പിംഗ്',
    free: 'സൗജന്യം',
    taxes: 'നികുതികൾ ഉൾപ്പെടെ',
    total: 'ആകെ തുക',
    orderTotal: 'ഓർഡർ ആകെ തുക',
    viewCart: 'കാർട്ട് കാണുക',
    remove: 'ഒഴിവാക്കുക',
    qty: 'എണ്ണം',
    savings: 'ലാഭം',

    // Collection, Filters & Search
    search: 'തിരയുക',
    results: 'ഫലങ്ങൾ',
    filterBy: 'ഫിൽട്ടർ ചെയ്യുക',
    sortBy: 'തരംതിരിക്കുക',
    featured: 'പ്രത്യേകതയുള്ളവ',
    bestSelling: 'ഏറ്റവും കൂടുതൽ വിറ്റഴിയുന്നവ',
    priceLowHigh: 'വില: കുറഞ്ഞതിൽ നിന്ന് കൂടിയതിലേക്ക്',
    priceHighLow: 'വില: കൂടിയതിൽ നിന്ന് കുറഞ്ഞതിലേക്ക്',
    newest: 'പുതിയവ',
    reset: 'റീസെറ്റ് ചെയ്യുക',
    clearAll: 'എല്ലാം ഒഴിവാക്കുക',
    price: 'വില',
    category: 'വിഭാഗം',
    size: 'സൈസ്',
    color: 'നിറം',
    fabric: 'തുണിത്തരം',
    availability: 'ലഭ്യത',
    selectedPriceRange: 'തിരഞ്ഞെടുത്ത വില പരിധി',
    noProductsMatch: 'നിങ്ങൾ തിരഞ്ഞ ഉൽപ്പന്നങ്ങൾ ഒന്നും കണ്ടെത്താനായില്ല.',
    tryDifferentSearch: 'മറ്റ് വാക്കുകൾ ഉപയോഗിച്ച് തിരയുക അല്ലെങ്കിൽ ഫിൽട്ടറുകൾ റീസെറ്റ് ചെയ്യുക.',
    viewAllBoys: 'എല്ലാ ബോയ്സ് യൂണിഫോമുകളും കാണുക',
    viewAllGirls: 'എല്ലാ ഗേൾസ് യൂണിഫോമുകളും കാണുക',
    viewAllIndustrial: 'എല്ലാ ഇൻഡസ്ട്രിയൽ യൂണിഫോമുകളും കാണുക',

    // Mobile Menu
    myAccount: 'എന്റെ അക്കൗണ്ട്',
    logIn: 'ലോഗിൻ',
    whatsappQuotation: 'വാട്സ്ആപ്പ് ക്വട്ടേഷൻ',
    browseCategories: 'യൂണിഫോം വിഭാഗങ്ങൾ',
    selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
    currencyAedOnly: 'എല്ലാ വിലകളും യുഎഇ ദിർഹത്തിൽ (AED) മാത്രം',

    // Header extras
    boysSubcatHeading: 'ബോയ്സ് വിഭാഗങ്ങൾ',
    girlsSubcatHeading: 'ഗേൾസ് വിഭാഗങ്ങൾ',
    industrialSubcatHeading: 'വ്യവസായ & വർക്ക്‌വെയർ വിഭാഗങ്ങൾ',
    schoolUniforms: 'സ്കൂൾ യൂണിഫോമുകൾ',
    corporateUniforms: 'കോർപ്പറേറ്റ് യൂണിഫോമുകൾ',
    safetyOilGas: 'സേഫ്റ്റി & ഓയിൽ/ഗ്യാസ്',
    uniformCatalog: 'യൂണിഫോം കാറ്റലോഗ്',
    returns: 'റിട്ടേൺ',
    andOrders: '& ഓർഡറുകൾ',
    locationPlaceholder: 'നഗരം അല്ലെങ്കിൽ പിൻകോഡ്',

    // Home Hero extras
    viewDetails: 'വിശദാംശങ്ങൾ കാണുക',
    shopByCategory: 'വിഭാഗം അനുസരിച്ച് ഷോപ്പ് ചെയ്യുക',
    boysUniforms: 'ബോയ്സ് യൂണിഫോമുകൾ',
    girlsUniforms: 'ഗേൾസ് യൂണിഫോമുകൾ',
    industrialWorkwear: 'വ്യാവസായിക വർക്ക്‌വെയർ',
    boysSub: 'പാന്റ്സ്, ഷർട്ടുകൾ & PE',
    girlsSub: 'പാവാടകൾ, പിനാഫോർ & ഷർട്ടുകൾ',
    industrialSub: 'കവറോൾ, പോളോ & സ്യൂട്ടുകൾ',
    boysSection: 'ബോയ്സ് സ്കൂൾ യൂണിഫോം',
    girlsSection: 'ഗേൾസ് സ്കൂൾ യൂണിഫോം',
    industrialSection: 'വ്യവസായ & സേഫ്റ്റി വർക്ക്‌വെയർ',
    viewAll: 'എല്ലാം കാണുക →',

    // Footer extras
    getToKnowUs: 'ഞങ്ങളെ അറിയുക',
    connectWithUs: 'ഞങ്ങളുമായി ബന്ധപ്പെടുക',
    makeMoneyWithUs: 'ഞങ്ങളോടൊപ്പം വരുമാനം നേടുക',
    letUsHelpYou: 'ഞങ്ങൾ സഹായിക്കാം',
    aboutOGU: 'ഞങ്ങളെ കുറിച്ച്',
    whatsappDirect: 'വാട്സ്ആപ്പ് നേരിട്ട്',
    contactSupport: 'സഹായ കേന്ദ്രം',
    bulkCorporateSupply: 'ബൾക്ക് & കോർപ്പറേറ്റ് സപ്ലൈ',
    wholesalePartners: 'മൊത്ത വ്യാപാര പങ്കാളിത്തം',
    adminPortal: 'അഡ്മിൻ പോർട്ടൽ',
    trackYourOrders: 'ഓർഡറുകൾ ട്രാക്ക് ചെയ്യുക',
    shippingRates: 'ഷിപ്പിംഗ് നിരക്കുകൾ',
    returnsReplacements: 'റിട്ടേൺ & എക്സ്ചേഞ്ച്',
    backToTop: '▲ മുകളിലേക്ക്',
    emailPlaceholder: 'ഡീലുകൾക്ക് ഇ-മെയിൽ നൽകുക...',
    subscribedMsg: 'സബ്സ്ക്രൈബ് ചെയ്തു! ഇൻബോക്സ് പരിശോധിക്കുക.',
    subscribe: 'സബ്സ്ക്രൈബ്',

    // Cart & Product Card extras
    myBag: 'എന്റെ ബാഗ്',
    availableCoupons: 'ലഭ്യമായ കൂപ്പണുകൾ',
    customization: 'കസ്റ്റമൈസേഷൻ',
    youSave: 'ലാഭം',
    availableOffers: 'ലഭ്യമായ ഓഫറുകൾ',
    coupons: 'കൂപ്പണുകൾ',
    coupon: 'കൂപ്പൺ',
    freeShippingNote: 'സൗജന്യ ഷിപ്പിംഗ്',
    dayReturns: '7 ദിവസം റിട്ടേൺ',
    soldOut: 'സ്റ്റോക്ക് ഇല്ല',
    customize: 'കസ്റ്റമൈസ് ചെയ്യുക',
    colors: 'നിറങ്ങൾ',
    bestPrice: 'ഏറ്റവും നല്ല വില',

    // Footer copyright
    footerCopyright: '© 2024 ഓൺലൈൻ ഗൾഫ് യൂണിഫോം. എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.',
    allRightsReserved: 'EvaraNest Retail Pvt. Ltd. നടത്തിപ്പ്.',
  },
}

const LanguageContext = createContext(null)

// Some screens (including older admin and storefront components) still render
// plain English strings instead of translation keys. Resolve exact English
// dictionary values and a small set of frequently used page copy here so the
// shared language setting applies to those rendered strings too.
const PAGE_TRANSLATIONS = {
  ar: {
    'Shop by Category': 'تسوق حسب الفئة',
    'Boys Uniforms — Pants, Oxford Shirts, PE Kits & Blazers': 'زي الأولاد — سراويل وقمصان أكسفورد وملابس رياضية وبلايزر',
    'Girls Uniforms — Pleated Skirts, Pinafores, Blouses & PE': 'زي البنات — تنانير ومرايل وبلوزات وملابس رياضية',
    'Industrial Uniforms — FR Coveralls, Engineering & Corporate': 'الزي الصناعي — بدلات مقاومة للحريق وملابس هندسية ورسمية',
    'Industrial & Safety Workwear': 'ملابس العمل والسلامة الصناعية',
    'Boys School Uniform': 'الزي المدرسي للأولاد',
    'Girls School Uniform': 'الزي المدرسي للبنات',
    'NEW SCHOOL SESSION 2026': 'العام الدراسي الجديد 2026',
    'Certified Workwear': 'ملابس عمل معتمدة',
    'PE & Sports Kits': 'أطقم التربية البدنية والرياضة',
    'BEST SELLERS': 'الأكثر مبيعاً',
    'Featured Uniforms': 'أزياء مميزة',
    'Limited-time institutional savings on school & workwear': 'وفّر للمدارس وملابس العمل لفترة محدودة',
    'Durable stain-resistant schoolwear engineered for daily wear': 'ملابس مدرسية متينة ومقاومة للبقع للاستخدام اليومي',
    'Comfort-tailored premium fabrics for junior & senior students': 'أقمشة مريحة وفاخرة للطلاب والطالبات',
    'EN ISO & NFPA certified safety garments for commercial industries': 'ملابس سلامة معتمدة وفق EN ISO وNFPA للقطاعات التجارية',
    'Corporate Invoicing & Custom Embroidery': 'فواتير الشركات والتطريز حسب الطلب',
    'Get an Immediate Factory Quote': 'احصل على عرض سعر فوري من المصنع',
    'Request Your Custom Uniform Quote': 'اطلب عرض سعر مخصصاً للزي الموحد',
    'Receive a comprehensive quotation, fabric swatch recommendation, and complimentary digital mockup within 4 business hours.': 'احصل على عرض سعر شامل وتوصية بعينة القماش ونموذج رقمي مجاني خلال 4 ساعات عمل.',
    'Select Industry / Garment Sector': 'اختر القطاع الصناعي أو نوع الملابس',
    'Customization Technique': 'طريقة التخصيص',
    'Estimated Order Quantity': 'الكمية التقديرية للطلب',
    'Company & Contact Details': 'بيانات الشركة والتواصل',
    'Company Name': 'اسم الشركة',
    'Contact Person Name': 'اسم جهة الاتصال',
    'Phone / WhatsApp Number': 'رقم الهاتف أو واتساب',
    'Corporate Email': 'البريد الإلكتروني للشركة',
    'Delivery Region / Emirate': 'منطقة أو إمارة التسليم',
    'Project Details / Fabric Preference / Specifications': 'تفاصيل المشروع وتفضيلات القماش والمواصفات',
    'SUBMIT REQUEST FOR FACTORY QUOTE →': 'إرسال طلب عرض سعر من المصنع ←',
    'Quote Request Received!': 'تم استلام طلب عرض السعر!',
    'Submit Another RFQ': 'إرسال طلب عرض سعر آخر',
    'Fast-Track on WhatsApp': 'تواصل سريع عبر واتساب',
    'Please provide your contact name.': 'يرجى إدخال اسم جهة الاتصال.',
    'Please enter your phone / WhatsApp number.': 'يرجى إدخال رقم الهاتف أو واتساب.',
    'This site is temporarily unavailable.': 'هذا الموقع غير متاح مؤقتاً.',
  },
  ml: {
    'Shop by Category': 'വിഭാഗം അനുസരിച്ച് ഷോപ്പ് ചെയ്യുക',
    'Boys Uniforms — Pants, Oxford Shirts, PE Kits & Blazers': 'ആൺകുട്ടികളുടെ യൂണിഫോം — പാന്റ്സ്, ഓക്സ്ഫോർഡ് ഷർട്ടുകൾ, പി.ഇ. കിറ്റുകൾ, ബ്ലേസറുകൾ',
    'Girls Uniforms — Pleated Skirts, Pinafores, Blouses & PE': 'പെൺകുട്ടികളുടെ യൂണിഫോം — പാവാടകൾ, പിനാഫോറുകൾ, ബ്ലൗസുകൾ, പി.ഇ.',
    'Industrial Uniforms — FR Coveralls, Engineering & Corporate': 'വ്യാവസായിക യൂണിഫോം — സുരക്ഷാ കവറോൾ, എഞ്ചിനീയറിംഗ്, കോർപ്പറേറ്റ് വസ്ത്രങ്ങൾ',
    'Industrial & Safety Workwear': 'വ്യാവസായിക സുരക്ഷാ വർക്ക്വെയർ',
    'Boys School Uniform': 'ആൺകുട്ടികളുടെ സ്കൂൾ യൂണിഫോം',
    'Girls School Uniform': 'പെൺകുട്ടികളുടെ സ്കൂൾ യൂണിഫോം',
    'NEW SCHOOL SESSION 2026': 'പുതിയ സ്കൂൾ സെഷൻ 2026',
    'Certified Workwear': 'സർട്ടിഫൈഡ് വർക്ക്വെയർ',
    'PE & Sports Kits': 'പി.ഇ. & സ്പോർട്സ് കിറ്റുകൾ',
    'BEST SELLERS': 'ഏറ്റവും കൂടുതൽ വിറ്റവ',
    'Featured Uniforms': 'തിരഞ്ഞെടുത്ത യൂണിഫോമുകൾ',
    'Limited-time institutional savings on school & workwear': 'സ്കൂൾ, ജോലിവസ്ത്രങ്ങൾക്ക് പരിമിതകാല സ്ഥാപന ഓഫറുകൾ',
    'Durable stain-resistant schoolwear engineered for daily wear': 'ദൈനംദിന ഉപയോഗത്തിനായി കറ പ്രതിരോധിക്കുന്ന ദൃഢമായ സ്കൂൾ വസ്ത്രങ്ങൾ',
    'Comfort-tailored premium fabrics for junior & senior students': 'ചെറുതും മുതിർന്നതുമായ വിദ്യാർത്ഥികൾക്കായി സുഖകരമായ പ്രീമിയം തുണിത്തരങ്ങൾ',
    'EN ISO & NFPA certified safety garments for commercial industries': 'വ്യവസായങ്ങൾക്കായി EN ISO, NFPA അംഗീകൃത സുരക്ഷാ വസ്ത്രങ്ങൾ',
    'Corporate Invoicing & Custom Embroidery': 'കോർപ്പറേറ്റ് ഇൻവോയ്സിംഗും കസ്റ്റം എംബ്രോയിഡറിയും',
    'Get an Immediate Factory Quote': 'ഫാക്ടറിയിൽ നിന്ന് ഉടൻ ക്വോട്ട് നേടുക',
    'Request Your Custom Uniform Quote': 'കസ്റ്റം യൂണിഫോം ക്വോട്ട് അഭ്യർത്ഥിക്കുക',
    'Receive a comprehensive quotation, fabric swatch recommendation, and complimentary digital mockup within 4 business hours.': 'വിശദമായ ക്വോട്ട്, തുണി സാമ്പിൾ നിർദ്ദേശം, സൗജന്യ ഡിജിറ്റൽ മാതൃക എന്നിവ 4 പ്രവൃത്തി മണിക്കൂറിനുള്ളിൽ നേടുക.',
    'Select Industry / Garment Sector': 'വ്യവസായം / വസ്ത്ര മേഖല തിരഞ്ഞെടുക്കുക',
    'Customization Technique': 'കസ്റ്റമൈസേഷൻ രീതി',
    'Estimated Order Quantity': 'കണക്കാക്കിയ ഓർഡർ അളവ്',
    'Company & Contact Details': 'കമ്പനി, ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ',
    'Company Name': 'കമ്പനിയുടെ പേര്',
    'Contact Person Name': 'ബന്ധപ്പെടേണ്ട വ്യക്തിയുടെ പേര്',
    'Phone / WhatsApp Number': 'ഫോൺ / വാട്ട്‌സ്ആപ്പ് നമ്പർ',
    'Corporate Email': 'കോർപ്പറേറ്റ് ഇമെയിൽ',
    'Delivery Region / Emirate': 'ഡെലിവറി പ്രദേശം / എമിറേറ്റ്',
    'Project Details / Fabric Preference / Specifications': 'പ്രോജക്ട് വിവരങ്ങൾ / തുണി താൽപ്പര്യം / സവിശേഷതകൾ',
    'SUBMIT REQUEST FOR FACTORY QUOTE →': 'ഫാക്ടറി ക്വോട്ട് അഭ്യർത്ഥന സമർപ്പിക്കുക →',
    'Quote Request Received!': 'ക്വോട്ട് അഭ്യർത്ഥന ലഭിച്ചു!',
    'Submit Another RFQ': 'മറ്റൊരു RFQ സമർപ്പിക്കുക',
    'Fast-Track on WhatsApp': 'വാട്ട്‌സ്ആപ്പിൽ വേഗത്തിൽ ബന്ധപ്പെടുക',
    'Please provide your contact name.': 'ബന്ധപ്പെടേണ്ട വ്യക്തിയുടെ പേര് നൽകുക.',
    'Please enter your phone / WhatsApp number.': 'ഫോൺ / വാട്ട്‌സ്ആപ്പ് നമ്പർ നൽകുക.',
    'This site is temporarily unavailable.': 'ഈ സൈറ്റ് താൽക്കാലികമായി ലഭ്യമല്ല.',
  },
}

const ENGLISH_VALUE_KEYS = new Map(
  Object.entries(TRANSLATIONS.en).map(([key, value]) => [String(value).trim(), key])
)

function translateVisibleText(value, lang) {
  const trimmed = String(value).trim()
  if (!trimmed || lang === 'en') return value
  const pageTranslation = PAGE_TRANSLATIONS[lang]?.[trimmed]
  const key = ENGLISH_VALUE_KEYS.get(trimmed) || trimmed
  const translated = PAGE_TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS[lang]?.[key]
  if (translated === undefined) return value
  const leading = String(value).match(/^\s*/)?.[0] ?? ''
  const trailing = String(value).match(/\s*$/)?.[0] ?? ''
  return `${leading}${pageTranslation ?? translated}${trailing}`
}

export function LanguageProvider({ children }) {
  const originalTextRef = useRef(new WeakMap())
  const originalAttributesRef = useRef(new WeakMap())
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

  // Translate raw JSX text as it appears, including older admin and storefront
  // views which have not yet been converted to explicit t('key') calls.
  useEffect(() => {
    const originalText = originalTextRef.current
    const originalAttributes = originalAttributesRef.current
    const translatedAttributes = ['placeholder', 'aria-label', 'title', 'alt']

    const translateNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement
        if (!parent || parent.closest('script,style,noscript,textarea,[contenteditable="true"]')) return
        if (!originalText.has(node)) originalText.set(node, node.nodeValue)
        const original = originalText.get(node)
        const next = lang === 'en' ? original : translateVisibleText(original, lang)
        if (node.nodeValue !== next) node.nodeValue = next
        return
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return
      let originals = originalAttributes.get(node)
      for (const name of translatedAttributes) {
        if (!node.hasAttribute(name)) continue
        originals ??= {}
        if (originals[name] === undefined) originals[name] = node.getAttribute(name)
        const original = originals[name]
        const next = lang === 'en' ? original : translateVisibleText(original, lang)
        if (node.getAttribute(name) !== next) node.setAttribute(name, next)
      }
      if (originals) originalAttributes.set(node, originals)
      if (node.matches('script,style,noscript,textarea,[contenteditable="true"]')) return
      for (const child of node.childNodes) translateNode(child)
    }

    translateNode(document.body)
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') translateNode(record.target)
        else {
          for (const node of record.addedNodes) translateNode(node)
          if (record.type === 'attributes') translateNode(record.target)
        }
      }
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatedAttributes,
    })
    return () => observer.disconnect()
  }, [lang])

  const t = (key) => {
    if (!key) return ''
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en
    if (dict[key] !== undefined) return dict[key]

    const trimmed = String(key).trim()
    if (dict[trimmed] !== undefined) return dict[trimmed]
    const englishKey = ENGLISH_VALUE_KEYS.get(trimmed)
    if (englishKey && dict[englishKey] !== undefined) return dict[englishKey]
    if (PAGE_TRANSLATIONS[lang]?.[trimmed]) return PAGE_TRANSLATIONS[lang][trimmed]

    if (TRANSLATIONS.en[key] !== undefined) return TRANSLATIONS.en[key]
    if (TRANSLATIONS.en[trimmed] !== undefined) return TRANSLATIONS.en[trimmed]

    return key
  }

  const formatPrice = (amount) => {
    const val = Number(amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    if (lang === 'ar') return `${val} د.إ`
    return `AED ${val}`
  }

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]

  return (
    <LanguageContext.Provider value={{ lang, setLang, currentLang, languages: LANGUAGES, t, formatPrice }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
