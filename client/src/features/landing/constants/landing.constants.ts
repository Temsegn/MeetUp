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
  { id: 'workspace', href: '#workspace' },
  { id: 'security', href: '#security' },
  { id: 'pricing', href: '#pricing' },
] as const;

export const PRODUCT_MODULES = [
  { id: 'meetings', image: LANDING_ASSETS.moduleMeetings, preview: 'meetings' as const },
  { id: 'messages', image: LANDING_ASSETS.moduleMessages, preview: 'messages' as const },
  { id: 'calendar', image: LANDING_ASSETS.moduleCalendar, preview: 'calendar' as const },
  { id: 'recordings', image: LANDING_ASSETS.moduleRecordings, preview: 'recordings' as const },
] as const;

export type LandingCopy = typeof EN_COPY;

const EN_COPY = {
  nav: {
    product: 'Product',
    workspace: 'Workspace',
    security: 'Security',
    pricing: 'Pricing',
    signIn: 'Sign in',
    getStarted: 'Get started',
    openDashboard: 'Open workspace',
    langEn: 'EN',
    langAr: 'عربي',
  },
  hero: {
    eyebrow: 'Organization video meetings',
    title: 'Meet, collaborate, and keep the record in one workspace',
    body: 'Samtal is a conferencing workspace for teams. Live video and audio, waiting rooms, screen share, whiteboard, chat, calendar, and recordings — with members, invitations, and roles.',
    primary: 'Create an account',
    primaryAuthed: 'Open workspace',
    secondary: 'See the product',
    proof: 'English and Arabic. Sign in with email, or continue with Google when it is configured.',
  },
  capabilities: [
    { value: 'Waiting rooms', label: 'Host admit before anyone joins' },
    { value: 'Screen share', label: 'Present and remote-assist' },
    { value: 'Whiteboard', label: 'Draw together in the room' },
    { value: 'Recordings', label: 'Replay from the workspace library' },
  ],
  product: {
    eyebrow: 'Product',
    title: 'The same workspace your team already uses after sign-in',
    body: 'Meetings, messages, calendar, and recordings share one sidebar, one account, and one organization.',
    modules: {
      meetings: {
        label: 'Meetings',
        title: 'Rooms with host controls, not open links',
        body: 'Start or schedule a room. Guests wait for admit. Share screen, open the whiteboard, or take remote control during a guided session.',
        points: [
          'Waiting room and host admit',
          'HD video, audio, and screen share',
          'Whiteboard and remote control in the live room',
        ],
      },
      messages: {
        label: 'Messages',
        title: 'Chat that stays with the workspace',
        body: 'Direct and team conversations, contacts, and files next to the people who were in the room.',
        points: ['Threads and attachments', 'Direct and team conversations', 'Contacts in the same account'],
      },
      calendar: {
        label: 'Calendar',
        title: 'A shared schedule for the organization',
        body: 'Month, week, and day views. Join a meeting from the calendar without leaving the workspace.',
        points: ['Filter meetings by status', 'Workspace-wide visibility for admins', 'Join from the schedule in one click'],
      },
      recordings: {
        label: 'Recordings',
        title: 'A library of sessions you already ran',
        body: 'Capture optional recordings, store them in the workspace, and share a link with people who have access.',
        points: ['Searchable session library', 'Share and download from the workspace', 'Storage limits follow the organization plan'],
      },
    },
  },
  collaboration: {
    eyebrow: 'In the live room',
    title: 'Collaborate without switching tools',
    body: 'While a meeting is live, the same control bar covers media, collaboration, and host actions.',
    items: [
      { title: 'Video and audio', body: 'WebRTC media through a dedicated SFU. Mute, camera, and speaker controls stay in the room chrome.' },
      { title: 'Screen share', body: 'Present a window or display. Participants follow the share from the same stage.' },
      { title: 'Whiteboard', body: 'Open a shared board in the meeting. The person who opened it can close it for everyone.' },
      { title: 'Remote control', body: 'Guide another participant’s view during support or walkthrough sessions.' },
    ],
  },
  steps: {
    eyebrow: 'How it works',
    title: 'From invitation to archive, in the same product',
    items: [
      { step: '01', title: 'Invite with control', body: 'Add members, send an email invite, or admit a guest who matches the invited address. Meetings are not public rooms.' },
      { step: '02', title: 'Meet in the room', body: 'Waiting rooms, host controls, screen share, whiteboard, and remote assistance run in the live meeting.' },
      { step: '03', title: 'Keep the record', body: 'Chat, files, and optional recordings stay on the organization so follow-up is not a side channel.' },
    ],
  },
  workspace: {
    eyebrow: 'Organization',
    title: 'Members, rooms, and roles in one workspace',
    body: 'Each account belongs to an organization. Owners and admins manage people, rooms, branding, and the plan from Settings.',
    items: [
      { title: 'Members', body: 'Invite teammates by email. Owner, admin, and member roles decide who can host and govern.' },
      { title: 'Teams and rooms', body: 'Group people into teams and keep dedicated rooms for recurring work.' },
      { title: 'Invitations', body: 'Workspace invites use the public site origin. Guests join with the email they were invited with.' },
      { title: 'Billing', body: 'Free, Pro, and Enterprise plans meter participant minutes, members, concurrent meetings, and recording storage.' },
    ],
  },
  security: {
    eyebrow: 'Access and media',
    title: 'Meetings are authenticated, not public links',
    body: 'Who enters a room is decided by sign-in, invitations, and host controls — not by guessing a URL.',
    items: [
      { title: 'Signed-in sessions', body: 'Access tokens back the app. Socket connections without a valid session are refused.' },
      { title: 'Invitation model', body: 'Members join as host, invitee, or teammate. Guests must match an invited email.' },
      { title: 'Host waiting rooms', body: 'Guests wait for admit. Hosts can require a waiting room for members as well.' },
      { title: 'Encrypted media path', body: 'Live audio and video use DTLS-SRTP between each client and the media server.' },
      { title: 'Workspace roles', body: 'Owner, admin, and member permissions for who can see, host, and manage the organization.' },
      { title: 'Session hygiene', body: 'HttpOnly refresh cookies, CSRF origin checks, and password-aware token invalidation.' },
    ],
    footnote:
      'Media is encrypted in transit (DTLS-SRTP). The SFU decrypts to forward streams — this is not participant-to-participant end-to-end encryption.',
  },
  pricing: {
    eyebrow: 'Plans',
    title: 'Start free. Upgrade when the organization needs more capacity.',
    body: 'Prices are monthly for the organization, matching the live catalog. Participant minutes, members, concurrent meetings, and recording storage scale by plan.',
    tiers: [
      {
        name: 'Free',
        price: '$0',
        period: 'per month',
        description: 'For small groups getting started.',
        features: [
          '500 participant-minutes',
          '5 members',
          '1 concurrent meeting',
          '2 GB recording storage',
          'Messages and waiting room',
        ],
        highlighted: false,
        cta: 'Create an account',
      },
      {
        name: 'Pro',
        price: '$49',
        period: 'per month',
        description: 'For teams that meet every week.',
        features: [
          '10,000 participant-minutes',
          '50 members',
          '10 concurrent meetings',
          '50 GB recording storage',
          'Reports and auto-record',
        ],
        highlighted: true,
        cta: 'Choose Pro',
      },
      {
        name: 'Enterprise',
        price: '$299',
        period: 'per month',
        description: 'For larger organizations and more rooms.',
        features: [
          '100,000 participant-minutes',
          '1,000 members',
          '100 concurrent meetings',
          '500 GB recording storage',
          'Reports and auto-record',
        ],
        highlighted: false,
        cta: 'Choose Enterprise',
      },
    ],
    openApp: 'Open workspace',
  },
  cta: {
    title: 'Create the workspace, then run the first room',
    body: 'Sign up, invite your team, and keep meetings, chat, and recordings in one place.',
    action: 'Create an account',
    actionAuthed: 'Go to workspace',
  },
  footer: {
    blurb: 'Meetings, messaging, calendar, and recordings for organizations — with invitations, roles, and host controls.',
    product: 'Product',
    company: 'Account',
    legal: 'Access',
    productItems: [
      { label: 'Meetings', sectionId: 'product' },
      { label: 'Messages', sectionId: 'product' },
      { label: 'Calendar', sectionId: 'product' },
      { label: 'Recordings', sectionId: 'product' },
    ],
    companyItems: [
      { label: 'Sign in', to: '/auth' },
      { label: 'Create an account', to: '/auth/sign-up' },
      { label: 'Plans', sectionId: 'pricing' },
    ],
    legalItems: [
      { label: 'Waiting rooms', sectionId: 'security' },
      { label: 'Invitations', sectionId: 'workspace' },
      { label: 'Media path', sectionId: 'security' },
    ],
    rights: 'All rights reserved.',
  },
};

const AR_COPY: LandingCopy = {
  nav: {
    product: 'المنتج',
    workspace: 'مساحة العمل',
    security: 'الأمان',
    pricing: 'الأسعار',
    signIn: 'تسجيل الدخول',
    getStarted: 'ابدأ الآن',
    openDashboard: 'فتح مساحة العمل',
    langEn: 'EN',
    langAr: 'عربي',
  },
  hero: {
    eyebrow: 'اجتماعات مرئية للمؤسسات',
    title: 'اجتماع وتعاون وأرشفة في مساحة عمل واحدة',
    body: 'سمتال مساحة عمل للاجتماعات. فيديو وصوت مباشر، غرف انتظار، مشاركة شاشة، لوح أبيض، دردشة، تقويم، وتسجيلات — مع الأعضاء والدعوات والأدوار.',
    primary: 'إنشاء حساب',
    primaryAuthed: 'فتح مساحة العمل',
    secondary: 'اطّلع على المنتج',
    proof: 'العربية والإنجليزية. سجّل الدخول بالبريد، أو عبر Google عندما يكون مُعداً.',
  },
  capabilities: [
    { value: 'غرف انتظار', label: 'المضيف يوافق قبل الانضمام' },
    { value: 'مشاركة الشاشة', label: 'عرض ودعم عن بُعد' },
    { value: 'لوح أبيض', label: 'رسم مشترك داخل الغرفة' },
    { value: 'تسجيلات', label: 'إعادة التشغيل من المكتبة' },
  ],
  product: {
    eyebrow: 'المنتج',
    title: 'نفس مساحة العمل بعد تسجيل الدخول',
    body: 'الاجتماعات والرسائل والتقويم والتسجيلات تشترك في شريط جانبي واحد وحساب واحد ومؤسسة واحدة.',
    modules: {
      meetings: {
        label: 'الاجتماعات',
        title: 'غرف بتحكم المضيف وليست روابط مفتوحة',
        body: 'ابدأ غرفة أو جدولها. ينتظر الضيوف الموافقة. شارك الشاشة أو افتح اللوح الأبيض أو تحكّم عن بُعد أثناء الجلسة.',
        points: ['غرفة انتظار وموافقة المضيف', 'فيديو وصوت ومشاركة شاشة', 'لوح أبيض وتحكم عن بُعد في الغرفة المباشرة'],
      },
      messages: {
        label: 'الرسائل',
        title: 'دردشة تبقى مع مساحة العمل',
        body: 'محادثات مباشرة وفرق، وجهات اتصال وملفات بجانب من حضر الاجتماع.',
        points: ['خيوط نقاش ومرفقات', 'محادثات مباشرة وفرق', 'جهات الاتصال في الحساب نفسه'],
      },
      calendar: {
        label: 'التقويم',
        title: 'جدول مشترك للمؤسسة',
        body: 'عروض شهر وأسبوع ويوم. انضم إلى الاجتماع من التقويم دون مغادرة مساحة العمل.',
        points: ['تصفية الاجتماعات حسب الحالة', 'رؤية على مستوى المساحة للمدراء', 'انضمام من الجدول بنقرة واحدة'],
      },
      recordings: {
        label: 'التسجيلات',
        title: 'مكتبة للجلسات التي عقدتموها',
        body: 'احفظ التسجيلات الاختيارية في مساحة العمل وشارك رابطاً مع من لديهم صلاحية الوصول.',
        points: ['مكتبة جلسات قابلة للبحث', 'مشاركة وتنزيل من المساحة', 'حدود التخزين تتبع خطة المؤسسة'],
      },
    },
  },
  collaboration: {
    eyebrow: 'داخل الغرفة المباشرة',
    title: 'تعاون دون تبديل الأدوات',
    body: 'أثناء الاجتماع يغطي شريط التحكم نفسه الوسائط والتعاون وإجراءات المضيف.',
    items: [
      { title: 'فيديو وصوت', body: 'وسائط WebRTC عبر خادم وسائط مخصص. كتم الصوت والكاميرا ومكبر الصوت في واجهة الغرفة.' },
      { title: 'مشاركة الشاشة', body: 'اعرض نافذة أو شاشة. يتابع المشاركون المشاركة من المسرح نفسه.' },
      { title: 'لوح أبيض', body: 'افتح لوحة مشتركة في الاجتماع. من فتحها يمكنه إغلاقها للجميع.' },
      { title: 'تحكم عن بُعد', body: 'وجّه شاشة مشارك آخر أثناء الدعم أو الشرح.' },
    ],
  },
  steps: {
    eyebrow: 'آلية العمل',
    title: 'من الدعوة إلى الأرشيف في المنتج نفسه',
    items: [
      { step: '01', title: 'دعوة بتحكم', body: 'أضف أعضاء، أرسل دعوة بالبريد، أو اقبل ضيفاً يطابق العنوان المدعو. الاجتماعات ليست غرفاً عامة.' },
      { step: '02', title: 'اجتماع في الغرفة', body: 'غرف انتظار، تحكم المضيف، مشاركة شاشة، لوح أبيض، ودعم عن بُعد.' },
      { step: '03', title: 'حفظ السجل', body: 'الدردشة والملفات والتسجيلات الاختيارية تبقى في المؤسسة.' },
    ],
  },
  workspace: {
    eyebrow: 'المؤسسة',
    title: 'أعضاء وغرف وأدوار في مساحة عمل واحدة',
    body: 'كل حساب ينتمي إلى مؤسسة. يدير المالك والمدير الأشخاص والغرف والعلامة التجارية والخطة من الإعدادات.',
    items: [
      { title: 'الأعضاء', body: 'ادعُ الزملاء بالبريد. أدوار المالك والمدير والعضو تحدد من يستضيف ويدير.' },
      { title: 'الفرق والغرف', body: 'اجمع الأشخاص في فرق واحتفظ بغرف مخصصة للعمل المتكرر.' },
      { title: 'الدعوات', body: 'دعوات المساحة تستخدم أصل الموقع العام. ينضم الضيوف بالبريد الذي دُعوا به.' },
      { title: 'الفوترة', body: 'خطط مجانية وPro وEnterprise تقيس دقائق المشاركين والأعضاء والاجتماعات المتزامنة وتخزين التسجيلات.' },
    ],
  },
  security: {
    eyebrow: 'الوصول والوسائط',
    title: 'الاجتماعات موثّقة وليست روابط عامة',
    body: 'من يدخل الغرفة يحدده تسجيل الدخول والدعوات وتحكم المضيف — لا تخمين الرابط.',
    items: [
      { title: 'جلسات مسجّلة الدخول', body: 'رموز الوصول تدعم التطبيق. تُرفض اتصالات المقبس دون جلسة صالحة.' },
      { title: 'نموذج الدعوة', body: 'ينضم الأعضاء كمضيف أو مدعو أو زميل. الضيوف يجب أن يطابقوا بريداً مدعواً.' },
      { title: 'غرف انتظار المضيف', body: 'ينتظر الضيوف الموافقة. يمكن إلزام الأعضاء بغرفة انتظار أيضاً.' },
      { title: 'مسار إعلام مشفّر', body: 'الصوت والصورة يستخدمان DTLS-SRTP بين كل عميل وخادم الوسائط.' },
      { title: 'أدوار مساحة العمل', body: 'صلاحيات المالك والمدير والعضو لمن يرى ويستضيف ويدير المؤسسة.' },
      { title: 'نظافة الجلسة', body: 'كوكيز تحديث HttpOnly، فحوصات أصل CSRF، وإبطال الرموز عند تغيير كلمة المرور.' },
    ],
    footnote:
      'الوسائط مشفّرة أثناء النقل (DTLS-SRTP). يفك خادم الوسائط التشفير لإعادة التوجيه — وليست تشفيراً طرفاً لطرف بين المشاركين.',
  },
  pricing: {
    eyebrow: 'الخطط',
    title: 'ابدأ مجاناً. رقِّ عندما تحتاج المؤسسة سعة أكبر.',
    body: 'الأسعار شهرية للمؤسسة وفق الكتالوج الحي. دقائق المشاركين والأعضاء والاجتماعات المتزامنة وتخزين التسجيلات تتوسع حسب الخطة.',
    tiers: [
      {
        name: 'مجاني',
        price: '$0',
        period: 'شهرياً',
        description: 'للمجموعات الصغيرة عند البداية.',
        features: ['500 دقيقة مشاركين', '5 أعضاء', 'اجتماع متزامن واحد', '2 غيغابايت للتسجيلات', 'رسائل وغرفة انتظار'],
        highlighted: false,
        cta: 'إنشاء حساب',
      },
      {
        name: 'Pro',
        price: '$49',
        period: 'شهرياً',
        description: 'للفرق التي تجتمع أسبوعياً.',
        features: ['10,000 دقيقة مشاركين', '50 عضواً', '10 اجتماعات متزامنة', '50 غيغابايت للتسجيلات', 'تقارير وتسجيل تلقائي'],
        highlighted: true,
        cta: 'اختر Pro',
      },
      {
        name: 'Enterprise',
        price: '$299',
        period: 'شهرياً',
        description: 'للمؤسسات الأكبر والمزيد من الغرف.',
        features: ['100,000 دقيقة مشاركين', '1,000 عضو', '100 اجتماع متزامن', '500 غيغابايت للتسجيلات', 'تقارير وتسجيل تلقائي'],
        highlighted: false,
        cta: 'اختر Enterprise',
      },
    ],
    openApp: 'فتح مساحة العمل',
  },
  cta: {
    title: 'أنشئ مساحة العمل ثم افتح أول غرفة',
    body: 'سجّل، ادعُ فريقك، واحتفظ بالاجتماعات والدردشة والتسجيلات في مكان واحد.',
    action: 'إنشاء حساب',
    actionAuthed: 'الذهاب إلى مساحة العمل',
  },
  footer: {
    blurb: 'اجتماعات ورسائل وتقويم وتسجيلات للمؤسسات — مع دعوات وأدوار وتحكم المضيف.',
    product: 'المنتج',
    company: 'الحساب',
    legal: 'الوصول',
    productItems: [
      { label: 'الاجتماعات', sectionId: 'product' },
      { label: 'الرسائل', sectionId: 'product' },
      { label: 'التقويم', sectionId: 'product' },
      { label: 'التسجيلات', sectionId: 'product' },
    ],
    companyItems: [
      { label: 'تسجيل الدخول', to: '/auth' },
      { label: 'إنشاء حساب', to: '/auth/sign-up' },
      { label: 'الخطط', sectionId: 'pricing' },
    ],
    legalItems: [
      { label: 'غرف الانتظار', sectionId: 'security' },
      { label: 'الدعوات', sectionId: 'workspace' },
      { label: 'مسار الوسائط', sectionId: 'security' },
    ],
    rights: 'جميع الحقوق محفوظة.',
  },
};

export const LANDING_COPY: Record<'en' | 'ar', LandingCopy> = {
  en: EN_COPY,
  ar: AR_COPY,
};
