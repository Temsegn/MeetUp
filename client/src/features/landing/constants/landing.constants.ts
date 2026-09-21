export const LANDING_ASSETS = {
  logo: '/auth/samtal-logo.png?v=1',
  logoBlue: '/samtal-logo-blue.png',
  logoSidebar: '/samtal-logo-sidebar.png',
  heroDashboard: '/marketing/hero-workspace.png',
  moduleMeetings: '/marketing/meetings.png',
  moduleMessages: '/marketing/messages.png',
  moduleCalendar: '/marketing/calendar.png',
  moduleRecordings: '/marketing/recordings.png',
} as const;

export const NAV_LINKS = [
  { id: 'product', href: '#product' },
  { id: 'platform', href: '#platform' },
  { id: 'security', href: '#security' },
  { id: 'pricing', href: '#pricing' },
] as const;

export const PRODUCT_MODULES = [
  {
    id: 'meetings',
    image: LANDING_ASSETS.moduleMeetings,
  },
  {
    id: 'messages',
    image: LANDING_ASSETS.moduleMessages,
  },
  {
    id: 'calendar',
    image: LANDING_ASSETS.moduleCalendar,
  },
  {
    id: 'recordings',
    image: LANDING_ASSETS.moduleRecordings,
  },
] as const;

export type LandingCopy = typeof EN_COPY;

const EN_COPY = {
  nav: {
    product: 'Product',
    platform: 'Platform',
    security: 'Security',
    pricing: 'Pricing',
    signIn: 'Sign in',
    getStarted: 'Get started',
    openDashboard: 'Open workspace',
    langEn: 'EN',
    langAr: 'عربي',
  },
  hero: {
    eyebrow: 'Global video collaboration',
    title: 'Meet, align, and follow through in one workspace',
    body: 'Samtal is an enterprise conferencing platform for organizations that work across cities, time zones, and languages. Live video, messaging, calendar, and recordings — designed as one operating system for meetings.',
    primary: 'Start a meeting',
    primaryAuthed: 'Open workspace',
    secondary: 'Explore the platform',
    proof: 'English and Arabic. Built for EMEA, and ready for teams worldwide.',
  },
  capabilities: [
    { value: 'HD', label: 'WebRTC video' },
    { value: 'DTLS', label: 'Encrypted in transit' },
    { value: 'RBAC', label: 'Role-based rooms' },
    { value: 'AR / EN', label: 'Bilingual by design' },
  ],
  product: {
    eyebrow: 'Product',
    title: 'One platform for the full meeting lifecycle',
    body: 'Replace a patchwork of tools. Host, chat, schedule, and review from a single, consistent workspace.',
    modules: {
      meetings: {
        label: 'Meetings',
        title: 'Board-ready rooms, not consumer video chat',
        body: 'Instant or scheduled rooms with waiting rooms, host controls, screen share, and remote support.',
        points: ['Waiting room and host admit', 'HD video, screen share, whiteboard', 'Remote control for guided sessions'],
      },
      messages: {
        label: 'Messages',
        title: 'Context that survives the call',
        body: 'Keep decisions, files, and follow-ups next to the people who were in the room.',
        points: ['Threads and attachments', 'Direct and team conversations', 'Contact details in one place'],
      },
      calendar: {
        label: 'Calendar',
        title: 'A shared clock for distributed teams',
        body: 'Month, week, and day views so regional teams can see what is live, upcoming, or overdue.',
        points: ['Meeting filters by status', 'Workspace-wide visibility for admins', 'Join from the schedule in one click'],
      },
      recordings: {
        label: 'Recordings',
        title: 'An institutional memory of every session',
        body: 'Capture, store, and share sessions so people who could not attend still have the source of truth.',
        points: ['Searchable session library', 'Controlled sharing inside the workspace', 'Replay for training and compliance review'],
      },
    },
  },
  steps: {
    eyebrow: 'How it works',
    title: 'From invitation to archive, without switching products',
    items: [
      { step: '01', title: 'Invite with control', body: 'Hosts, teammates, and invited guests only. Guests join with the email they were invited with.' },
      { step: '02', title: 'Meet in high fidelity', body: 'WebRTC media through a dedicated SFU. Waiting rooms, live controls, whiteboard, and remote assistance.' },
      { step: '03', title: 'Keep the record', body: 'Chat, files, and optional recordings stay in the workspace so follow-up does not live in a side channel.' },
    ],
  },
  security: {
    eyebrow: 'Security & governance',
    title: 'Access is designed for enterprises, not open links',
    body: 'Meetings are not public rooms. Authentication, invitation rules, and host controls decide who can enter.',
    items: [
      { title: 'Authenticated sessions', body: 'JWT-backed access. Socket connections without a valid token are refused.' },
      { title: 'Invitation model', body: 'Members join as host, invitee, or teammate. Guests must match an invited email.' },
      { title: 'Host waiting rooms', body: 'Guests wait for admit. Hosts can require a waiting room for members as well.' },
      { title: 'Encrypted media path', body: 'Live audio and video use DTLS-SRTP between each client and the media server.' },
      { title: 'Workspace roles', body: 'Owner, admin, and member permissions for who can see, host, and govern meetings.' },
      { title: 'Session hygiene', body: 'HttpOnly refresh cookies, CSRF origin checks, and password-aware token invalidation.' },
    ],
    footnote: '* Media is encrypted in transit (DTLS-SRTP). The SFU decrypts to forward — this is not participant-to-participant E2EE.',
  },
  global: {
    eyebrow: 'International',
    title: 'A single workspace for regional and global operations',
    body: 'Samtal is built for organizations that span the Gulf, Europe, Africa, and international partners — without a consumer-chat aesthetic.',
    regions: [
      { name: 'EMEA', detail: 'Gulf, Europe, and Africa headquarters' },
      { name: 'Americas', detail: 'Cross-ocean partners and remote specialists' },
      { name: 'Asia-Pacific', detail: 'Follow-the-sun delivery and support' },
    ],
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Clear plans. No theatre.',
    body: 'Start free. Move to Pro when recordings and analytics matter. Enterprise when identity and retention are non-negotiable.',
    tiers: [
      {
        name: 'Free',
        price: '$0',
        period: 'forever',
        description: 'For pilots and small working groups.',
        features: ['Meetings up to 40 minutes', '5 participants', 'Chat and calendar'],
        highlighted: false,
        cta: 'Start free',
      },
      {
        name: 'Pro',
        price: '$12',
        period: 'per user / month',
        description: 'For teams that meet every day.',
        features: ['Unlimited duration', 'Recordings', 'Reports and analytics'],
        highlighted: true,
        cta: 'Choose Pro',
      },
      {
        name: 'Enterprise',
        price: 'Custom',
        period: 'annual',
        description: 'For IT, security, and multi-workspace control.',
        features: ['SSO-ready administration', 'Custom retention', 'Priority support'],
        highlighted: false,
        cta: 'Talk to us',
      },
    ],
    openApp: 'Open workspace',
  },
  cta: {
    title: 'Deploy a meeting stack your organization can govern',
    body: 'No credit card to start. Invite your team, run the first room, and keep the record in one place.',
    action: 'Create an account',
    actionAuthed: 'Go to workspace',
  },
  footer: {
    blurb: 'Enterprise meetings, messaging, and recordings for organizations that operate internationally.',
    product: 'Product',
    company: 'Company',
    legal: 'Legal',
    productItems: ['Meetings', 'Messages', 'Calendar', 'Recordings'],
    companyItems: ['About', 'Careers', 'Contact'],
    legalItems: ['Privacy', 'Terms', 'Security'],
    rights: 'All rights reserved.',
  },
};

const AR_COPY: LandingCopy = {
  nav: {
    product: 'المنتج',
    platform: 'المنصة',
    security: 'الأمان',
    pricing: 'الأسعار',
    signIn: 'تسجيل الدخول',
    getStarted: 'ابدأ الآن',
    openDashboard: 'فتح مساحة العمل',
    langEn: 'EN',
    langAr: 'عربي',
  },
  hero: {
    eyebrow: 'تعاون مرئي للمؤسسات',
    title: 'اجتماعات ومتابعة وأرشفة في مساحة عمل واحدة',
    body: 'سمتال منصة مؤتمرات للمؤسسات التي تعمل عبر المدن والمناطق الزمنية واللغات. فيديو مباشر، رسائل، تقويم، وتسجيلات — كنظام تشغيل واحد للاجتماعات.',
    primary: 'ابدأ اجتماعاً',
    primaryAuthed: 'فتح مساحة العمل',
    secondary: 'استكشف المنصة',
    proof: 'العربية والإنجليزية. صُممت لمنطقة الشرق الأوسط وأوروبا وأفريقيا، وجاهزة للفرق حول العالم.',
  },
  capabilities: [
    { value: 'HD', label: 'فيديو WebRTC' },
    { value: 'DTLS', label: 'تشفير أثناء النقل' },
    { value: 'RBAC', label: 'صلاحيات الأدوار' },
    { value: 'AR / EN', label: 'ثنائية اللغة' },
  ],
  product: {
    eyebrow: 'المنتج',
    title: 'منصة واحدة لدورة حياة الاجتماع كاملة',
    body: 'بدلاً من أدوات متفرقة: استضف، راسل، جدول، وراجع من مساحة عمل واحدة ومتسقة.',
    modules: {
      meetings: {
        label: 'الاجتماعات',
        title: 'غرف بمستوى مجالس الإدارة',
        body: 'غرف فورية أو مجدولة مع غرفة انتظار، تحكم المضيف، مشاركة الشاشة، والدعم عن بُعد.',
        points: ['غرفة انتظار وموافقة المضيف', 'فيديو عالي الدقة ومشاركة شاشة ولوح أبيض', 'تحكم عن بُعد للجلسات الموجهة'],
      },
      messages: {
        label: 'الرسائل',
        title: 'سياق يبقى بعد انتهاء المكالمة',
        body: 'القرارات والملفات والمتابعات بجانب الأشخاص الذين حضروا الاجتماع.',
        points: ['خيوط نقاش ومرفقات', 'محادثات مباشرة وفرق', 'بيانات التواصل في مكان واحد'],
      },
      calendar: {
        label: 'التقويم',
        title: 'ساعة مشتركة للفرق الموزّعة',
        body: 'عروض شهر وأسبوع ويوم حتى ترى الفرق الإقليمية ما هو مباشر أو قادم أو متأخر.',
        points: ['تصفية الاجتماعات حسب الحالة', 'رؤية على مستوى مساحة العمل للمدراء', 'انضمام من الجدول بنقرة واحدة'],
      },
      recordings: {
        label: 'التسجيلات',
        title: 'ذاكرة مؤسسية لكل جلسة',
        body: 'احفظ الجلسات وشاركها ليبقى المصدر الرسمي متاحاً لمن لم يتمكن من الحضور.',
        points: ['مكتبة جلسات قابلة للبحث', 'مشاركة محكومة داخل مساحة العمل', 'إعادة تشغيل للتدريب والمراجعة'],
      },
    },
  },
  steps: {
    eyebrow: 'آلية العمل',
    title: 'من الدعوة إلى الأرشيف دون تبديل المنتجات',
    items: [
      { step: '01', title: 'دعوة بتحكم', body: 'المضيف والزملاء والمدعوون فقط. ينضم الضيوف بالبريد الذي دُعوا به.' },
      { step: '02', title: 'اجتماع بجودة عالية', body: 'وسائط WebRTC عبر خادم وسائط مخصص. غرف انتظار، لوح أبيض، ودعم عن بُعد.' },
      { step: '03', title: 'حفظ السجل', body: 'الدردشة والملفات والتسجيلات الاختيارية تبقى في مساحة العمل.' },
    ],
  },
  security: {
    eyebrow: 'الأمان والحوكمة',
    title: 'الوصول مصمم للمؤسسات لا للروابط المفتوحة',
    body: 'الاجتماعات ليست غرفاً عامة. المصادقة وقواعد الدعوة وتحكم المضيف يحددون من يدخل.',
    items: [
      { title: 'جلسات موثّقة', body: 'وصول مدعوم بـ JWT. تُرفض اتصالات المقبس دون رمز صالح.' },
      { title: 'نموذج الدعوة', body: 'ينضم الأعضاء كمضيف أو مدعو أو زميل فريق. الضيوف يجب أن يطابقوا بريداً مدعواً.' },
      { title: 'غرف انتظار المضيف', body: 'ينتظر الضيوف الموافقة. يمكن إلزام الأعضاء بغرفة انتظار أيضاً.' },
      { title: 'مسار إعلام مشفّر', body: 'الصوت والصورة يستخدمان DTLS-SRTP بين كل عميل وخادم الوسائط.' },
      { title: 'أدوار مساحة العمل', body: 'صلاحيات المالك والمدير والعضو لمن يرى ويستضيف ويُدير.' },
      { title: 'نظافة الجلسة', body: 'كوكيز تحديث HttpOnly، فحوصات أصل CSRF، وإبطال الرموز عند تغيير كلمة المرور.' },
    ],
    footnote: '* الوسائط مشفّرة أثناء النقل (DTLS-SRTP). يفك خادم الوسائط التشفير لإعادة التوجيه — وليست تشفيراً طرفاً لطرف بين المشاركين.',
  },
  global: {
    eyebrow: 'حضور دولي',
    title: 'مساحة عمل واحدة للعمليات الإقليمية والدولية',
    body: 'صُممت سمتال للمؤسسات الممتدة عبر الخليج وأوروبا وأفريقيا والشركاء الدوليين — دون مظهر تطبيقات الدردشة الاستهلاكية.',
    regions: [
      { name: 'EMEA', detail: 'مقار الخليج وأوروبا وأفريقيا' },
      { name: 'الأمريكتان', detail: 'شركاء عبر المحيط ومتخصصون عن بُعد' },
      { name: 'آسيا والمحيط الهادئ', detail: 'تسليم ودعم يتبع الشمس' },
    ],
  },
  pricing: {
    eyebrow: 'الأسعار',
    title: 'خطط واضحة بلا مبالغة',
    body: 'ابدأ مجاناً. انتقل إلى Pro عند الحاجة للتسجيلات والتحليلات. Enterprise عندما تكون الهوية والاحتفاظ غير قابلة للتفاوض.',
    tiers: [
      {
        name: 'مجاني',
        price: '$0',
        period: 'للأبد',
        description: 'للتجربة والمجموعات الصغيرة.',
        features: ['اجتماعات حتى 40 دقيقة', '5 مشاركين', 'دردشة وتقويم'],
        highlighted: false,
        cta: 'ابدأ مجاناً',
      },
      {
        name: 'Pro',
        price: '$12',
        period: 'للمستخدم / شهرياً',
        description: 'للفرق التي تجتمع يومياً.',
        features: ['مدة غير محدودة', 'تسجيلات', 'تقارير وتحليلات'],
        highlighted: true,
        cta: 'اختر Pro',
      },
      {
        name: 'Enterprise',
        price: 'مخصص',
        period: 'سنوي',
        description: 'لتقنية المعلومات والأمان وتعدد مساحات العمل.',
        features: ['إدارة جاهزة لـ SSO', 'احتفاظ مخصص', 'دعم أولوية'],
        highlighted: false,
        cta: 'تحدث معنا',
      },
    ],
    openApp: 'فتح مساحة العمل',
  },
  cta: {
    title: 'انشر منصة اجتماعات يمكن لمؤسستك حوكمتها',
    body: 'بدون بطاقة ائتمان للبدء. ادعُ فريقك، افتح أول غرفة، واحتفظ بالسجل في مكان واحد.',
    action: 'إنشاء حساب',
    actionAuthed: 'الذهاب إلى مساحة العمل',
  },
  footer: {
    blurb: 'اجتماعات ورسائل وتسجيلات للمؤسسات التي تعمل على مستوى دولي.',
    product: 'المنتج',
    company: 'الشركة',
    legal: 'قانوني',
    productItems: ['الاجتماعات', 'الرسائل', 'التقويم', 'التسجيلات'],
    companyItems: ['حول', 'وظائف', 'تواصل'],
    legalItems: ['الخصوصية', 'الشروط', 'الأمان'],
    rights: 'جميع الحقوق محفوظة.',
  },
};

export const LANDING_COPY: Record<'en' | 'ar', LandingCopy> = {
  en: EN_COPY,
  ar: AR_COPY,
};
