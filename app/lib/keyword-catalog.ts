// Editorial classification by subject. Provenance and indexing rules: docs/CLASSEMENT_DOCUMENTAIRE.md.
export type Term={label:string;arabic:string;topic:string;aliases:string[]};
export const documentaryTopics:string[]=["Habitat et logement", "Politique de la ville et renouvellement urbain", "Urbanisme et planification urbaine", "Aménagement et développement du territoire", "Architecture et patrimoine bâti", "Formation et recherche dans les métiers du territoire", "Interventions et questions parlementaires", "Coopération et participation internationales", "Affaires juridiques et réglementation", "Vie institutionnelle"];
export const documentaryTopicTranslations:Record<string,string>={"Habitat et logement": "السكن والإسكان", "Politique de la ville et renouvellement urbain": "سياسة المدينة والتجديد الحضري", "Urbanisme et planification urbaine": "التعمير والتخطيط الحضري", "Aménagement et développement du territoire": "إعداد التراب والتنمية الترابية", "Architecture et patrimoine bâti": "الهندسة المعمارية والتراث المبني", "Formation et recherche dans les métiers du territoire": "التكوين والبحث في مهن إعداد التراب والتعمير", "Interventions et questions parlementaires": "المداخلات والأسئلة البرلمانية", "Coopération et participation internationales": "التعاون والمشاركة الدولية", "Affaires juridiques et réglementation": "الشؤون القانونية والتنظيم", "Vie institutionnelle": "الحياة المؤسساتية"};
export const keywordCatalog:Term[]=[
 {
  "label": "Aide directe au logement",
  "arabic": "الدعم المباشر للسكن",
  "topic": "Habitat et logement",
  "aliases": [
   "الدعم المباشر للسكن",
   "Daam Sakane",
   "Daamsakane",
   "دعم السكن"
  ]
 },
 {
  "label": "Accession à la propriété",
  "arabic": "تملك السكن",
  "topic": "Habitat et logement",
  "aliases": [
   "تملك السكن",
   "Accès à la propriété"
  ]
 },
 {
  "label": "Logement social",
  "arabic": "السكن الاجتماعي",
  "topic": "Habitat et logement",
  "aliases": [
   "السكن الاجتماعي"
  ]
 },
 {
  "label": "Logement des classes moyennes",
  "arabic": "سكن الطبقة المتوسطة",
  "topic": "Habitat et logement",
  "aliases": [
   "سكن الطبقة المتوسطة"
  ]
 },
 {
  "label": "Habitat rural",
  "arabic": "السكن القروي",
  "topic": "Habitat et logement",
  "aliases": [
   "السكن القروي"
  ]
 },
 {
  "label": "Bâtiments menaçant ruine",
  "arabic": "المباني الآيلة للسقوط",
  "topic": "Habitat et logement",
  "aliases": [
   "المباني الآيلة للسقوط",
   "Habitat menaçant ruine",
   "HMR"
  ]
 },
 {
  "label": "Résorption des bidonvilles",
  "arabic": "القضاء على دور الصفيح",
  "topic": "Habitat et logement",
  "aliases": [
   "القضاء على دور الصفيح",
   "Villes sans bidonvilles",
   "VSB",
   "مدن بدون صفيح"
  ]
 },
 {
  "label": "Résorption de l’habitat insalubre",
  "arabic": "معالجة السكن غير اللائق",
  "topic": "Habitat et logement",
  "aliases": [
   "معالجة السكن غير اللائق",
   "Lutte contre l’habitat insalubre",
   "Habitat indigne"
  ]
 },
 {
  "label": "Relogement des ménages",
  "arabic": "إعادة إسكان الأسر",
  "topic": "Habitat et logement",
  "aliases": [
   "إعادة إسكان الأسر",
   "Relogement"
  ]
 },
 {
  "label": "Restructuration de l’habitat non réglementaire",
  "arabic": "إعادة هيكلة السكن غير القانوني",
  "topic": "Habitat et logement",
  "aliases": [
   "إعادة هيكلة السكن غير القانوني"
  ]
 },
 {
  "label": "Reconstruction des logements après séisme",
  "arabic": "إعادة بناء المساكن بعد الزلزال",
  "topic": "Habitat et logement",
  "aliases": [
   "إعادة بناء المساكن بعد الزلزال",
   "Reconstruction post-séisme",
   "Reconstruction après séisme"
  ]
 },
 {
  "label": "Promotion immobilière",
  "arabic": "الإنعاش العقاري",
  "topic": "Habitat et logement",
  "aliases": [
   "الإنعاش العقاري"
  ]
 },
 {
  "label": "Marché immobilier",
  "arabic": "السوق العقارية",
  "topic": "Habitat et logement",
  "aliases": [
   "السوق العقارية"
  ]
 },
 {
  "label": "Qualité et sécurité des constructions",
  "arabic": "جودة وسلامة البناء",
  "topic": "Habitat et logement",
  "aliases": [
   "جودة وسلامة البناء"
  ]
 },
 {
  "label": "Mise à niveau urbaine",
  "arabic": "التأهيل الحضري",
  "topic": "Politique de la ville et renouvellement urbain",
  "aliases": [
   "التأهيل الحضري"
  ]
 },
 {
  "label": "Requalification des quartiers sous-équipés",
  "arabic": "تأهيل الأحياء ناقصة التجهيز",
  "topic": "Politique de la ville et renouvellement urbain",
  "aliases": [
   "تأهيل الأحياء ناقصة التجهيز",
   "Quartiers sous-équipés"
  ]
 },
 {
  "label": "Renouvellement urbain",
  "arabic": "التجديد الحضري",
  "topic": "Politique de la ville et renouvellement urbain",
  "aliases": [
   "التجديد الحضري",
   "Requalification urbaine"
  ]
 },
 {
  "label": "Intégration urbaine",
  "arabic": "الإدماج الحضري",
  "topic": "Politique de la ville et renouvellement urbain",
  "aliases": [
   "الإدماج الحضري",
   "الاندماج الحضري"
  ]
 },
 {
  "label": "Aménagement des espaces publics",
  "arabic": "تهيئة الفضاءات العمومية",
  "topic": "Politique de la ville et renouvellement urbain",
  "aliases": [
   "تهيئة الفضاءات العمومية"
  ]
 },
 {
  "label": "Revitalisation des centres-villes",
  "arabic": "إعادة تنشيط مراكز المدن",
  "topic": "Politique de la ville et renouvellement urbain",
  "aliases": [
   "إعادة تنشيط مراكز المدن"
  ]
 },
 {
  "label": "Réhabilitation des tissus urbains anciens",
  "arabic": "تأهيل الأنسجة الحضرية العتيقة",
  "topic": "Politique de la ville et renouvellement urbain",
  "aliases": [
   "تأهيل الأنسجة الحضرية العتيقة"
  ]
 },
 {
  "label": "Villes nouvelles",
  "arabic": "المدن الجديدة",
  "topic": "Politique de la ville et renouvellement urbain",
  "aliases": [
   "المدن الجديدة"
  ]
 },
 {
  "label": "Développement urbain durable",
  "arabic": "التنمية الحضرية المستدامة",
  "topic": "Politique de la ville et renouvellement urbain",
  "aliases": [
   "التنمية الحضرية المستدامة"
  ]
 },
 {
  "label": "Documents d’urbanisme",
  "arabic": "وثائق التعمير",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "وثائق التعمير"
  ]
 },
 {
  "label": "Planification urbaine",
  "arabic": "التخطيط الحضري",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "التخطيط الحضري"
  ]
 },
 {
  "label": "Schéma directeur d’aménagement urbain",
  "arabic": "التصميم المديري للتهيئة الحضرية",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "التصميم المديري للتهيئة الحضرية",
   "SDAU"
  ]
 },
 {
  "label": "Plan d’aménagement",
  "arabic": "تصميم التهيئة",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "تصميم التهيئة",
   "PA"
  ]
 },
 {
  "label": "Plan de développement des agglomérations rurales",
  "arabic": "تصميم تنمية التجمعات القروية",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "تصميم تنمية التجمعات القروية",
   "PDAR"
  ]
 },
 {
  "label": "Gestion urbaine",
  "arabic": "التدبير الحضري",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "التدبير الحضري"
  ]
 },
 {
  "label": "Autorisations d’urbanisme",
  "arabic": "رخص التعمير",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "رخص التعمير",
   "Permis de construire",
   "Autorisations de construire"
  ]
 },
 {
  "label": "Urbanisme en milieu rural",
  "arabic": "التعمير بالوسط القروي",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "التعمير بالوسط القروي",
   "Urbanisme rural"
  ]
 },
 {
  "label": "Foncier destiné à l’urbanisation",
  "arabic": "العقار المخصص للتعمير",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "العقار المخصص للتعمير"
  ]
 },
 {
  "label": "Digitalisation des autorisations d’urbanisme",
  "arabic": "رقمنة رخص التعمير",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "رقمنة رخص التعمير"
  ]
 },
 {
  "label": "Urbanisme opérationnel",
  "arabic": "التعمير العملياتي",
  "topic": "Urbanisme et planification urbaine",
  "aliases": [
   "التعمير العملياتي"
  ]
 },
 {
  "label": "Planification territoriale",
  "arabic": "التخطيط الترابي",
  "topic": "Aménagement et développement du territoire",
  "aliases": [
   "التخطيط الترابي"
  ]
 },
 {
  "label": "Schéma national d’aménagement du territoire",
  "arabic": "التصميم الوطني لإعداد التراب",
  "topic": "Aménagement et développement du territoire",
  "aliases": [
   "التصميم الوطني لإعداد التراب",
   "SNAT"
  ]
 },
 {
  "label": "Schéma régional d’aménagement du territoire",
  "arabic": "التصميم الجهوي لإعداد التراب",
  "topic": "Aménagement et développement du territoire",
  "aliases": [
   "التصميم الجهوي لإعداد التراب",
   "SRAT"
  ]
 },
 {
  "label": "Développement territorial",
  "arabic": "التنمية الترابية",
  "topic": "Aménagement et développement du territoire",
  "aliases": [
   "التنمية الترابية"
  ]
 },
 {
  "label": "Équité territoriale",
  "arabic": "الإنصاف الترابي",
  "topic": "Aménagement et développement du territoire",
  "aliases": [
   "الإنصاف الترابي"
  ]
 },
 {
  "label": "Armature urbaine",
  "arabic": "الهيكلة الحضرية",
  "topic": "Aménagement et développement du territoire",
  "aliases": [
   "الهيكلة الحضرية"
  ]
 },
 {
  "label": "Centres ruraux émergents",
  "arabic": "المراكز القروية الصاعدة",
  "topic": "Aménagement et développement du territoire",
  "aliases": [
   "المراكز القروية الصاعدة",
   "CREM"
  ]
 },
 {
  "label": "Observation des dynamiques territoriales",
  "arabic": "رصد الديناميات الترابية",
  "topic": "Aménagement et développement du territoire",
  "aliases": [
   "رصد الديناميات الترابية",
   "Observation territoriale"
  ]
 },
 {
  "label": "Résilience territoriale",
  "arabic": "القدرة على الصمود الترابي",
  "topic": "Aménagement et développement du territoire",
  "aliases": [
   "القدرة على الصمود الترابي"
  ]
 },
 {
  "label": "Convergence territoriale des politiques publiques",
  "arabic": "الالتقائية الترابية للسياسات العمومية",
  "topic": "Aménagement et développement du territoire",
  "aliases": [
   "الالتقائية الترابية للسياسات العمومية"
  ]
 },
 {
  "label": "Qualité architecturale",
  "arabic": "الجودة المعمارية",
  "topic": "Architecture et patrimoine bâti",
  "aliases": [
   "الجودة المعمارية"
  ]
 },
 {
  "label": "Patrimoine architectural",
  "arabic": "التراث المعماري",
  "topic": "Architecture et patrimoine bâti",
  "aliases": [
   "التراث المعماري"
  ]
 },
 {
  "label": "Architecture traditionnelle",
  "arabic": "العمارة التقليدية",
  "topic": "Architecture et patrimoine bâti",
  "aliases": [
   "العمارة التقليدية"
  ]
 },
 {
  "label": "Réhabilitation du patrimoine bâti",
  "arabic": "تأهيل التراث المبني",
  "topic": "Architecture et patrimoine bâti",
  "aliases": [
   "تأهيل التراث المبني"
  ]
 },
 {
  "label": "Assistance architecturale et technique",
  "arabic": "المساعدة المعمارية والتقنية",
  "topic": "Architecture et patrimoine bâti",
  "aliases": [
   "المساعدة المعمارية والتقنية"
  ]
 },
 {
  "label": "Conception architecturale durable",
  "arabic": "التصميم المعماري المستدام",
  "topic": "Architecture et patrimoine bâti",
  "aliases": [
   "التصميم المعماري المستدام"
  ]
 },
 {
  "label": "Architecture en terre",
  "arabic": "العمارة الترابية",
  "topic": "Architecture et patrimoine bâti",
  "aliases": [
   "العمارة الترابية"
  ]
 },
 {
  "label": "Techniques constructives durables",
  "arabic": "تقنيات البناء المستدامة",
  "topic": "Architecture et patrimoine bâti",
  "aliases": [
   "تقنيات البناء المستدامة"
  ]
 },
 {
  "label": "Enseignement de l’architecture",
  "arabic": "تدريس الهندسة المعمارية",
  "topic": "Formation et recherche dans les métiers du territoire",
  "aliases": [
   "تدريس الهندسة المعمارية"
  ]
 },
 {
  "label": "Formation en aménagement et urbanisme",
  "arabic": "التكوين في إعداد التراب والتعمير",
  "topic": "Formation et recherche dans les métiers du territoire",
  "aliases": [
   "التكوين في إعداد التراب والتعمير"
  ]
 },
 {
  "label": "Recherche en aménagement et urbanisme",
  "arabic": "البحث في إعداد التراب والتعمير",
  "topic": "Formation et recherche dans les métiers du territoire",
  "aliases": [
   "البحث في إعداد التراب والتعمير"
  ]
 },
 {
  "label": "Formation continue des architectes et urbanistes",
  "arabic": "التكوين المستمر للمهندسين المعماريين والمتخصصين في التعمير",
  "topic": "Formation et recherche dans les métiers du territoire",
  "aliases": [
   "التكوين المستمر للمهندسين المعماريين والمتخصصين في التعمير"
  ]
 },
 {
  "label": "Recherche en architecture et construction",
  "arabic": "البحث في الهندسة المعمارية والبناء",
  "topic": "Formation et recherche dans les métiers du territoire",
  "aliases": [
   "البحث في الهندسة المعمارية والبناء"
  ]
 },
 {
  "label": "Interventions parlementaires",
  "arabic": "المداخلات البرلمانية",
  "topic": "Interventions et questions parlementaires",
  "aliases": [
   "المداخلات البرلمانية",
   "Intervention parlementaire",
   "Intervention au Parlement"
  ]
 },
 {
  "label": "Réponses aux questions parlementaires",
  "arabic": "الأجوبة عن الأسئلة البرلمانية",
  "topic": "Interventions et questions parlementaires",
  "aliases": [
   "الأجوبة عن الأسئلة البرلمانية",
   "Réponse à une question parlementaire"
  ]
 },
 {
  "label": "Réponses aux questions orales",
  "arabic": "الأجوبة عن الأسئلة الشفهية",
  "topic": "Interventions et questions parlementaires",
  "aliases": [
   "الأجوبة عن الأسئلة الشفهية",
   "Réponse aux questions orales",
   "Réponse à une question orale"
  ]
 },
 {
  "label": "Réponses aux questions écrites",
  "arabic": "الأجوبة عن الأسئلة الكتابية",
  "topic": "Interventions et questions parlementaires",
  "aliases": [
   "الأجوبة عن الأسئلة الكتابية",
   "Réponse aux questions écrites",
   "Réponse à une question écrite"
  ]
 },
 {
  "label": "Travaux des commissions parlementaires",
  "arabic": "أشغال اللجان البرلمانية",
  "topic": "Interventions et questions parlementaires",
  "aliases": [
   "أشغال اللجان البرلمانية",
   "Travaux en commission parlementaire"
  ]
 },
 {
  "label": "Présentation du budget sectoriel",
  "arabic": "تقديم الميزانية القطاعية",
  "topic": "Interventions et questions parlementaires",
  "aliases": [
   "تقديم الميزانية القطاعية",
   "Présentation du budget du ministère"
  ]
 },
 {
  "label": "Examen des projets de loi",
  "arabic": "دراسة مشاريع القوانين",
  "topic": "Interventions et questions parlementaires",
  "aliases": [
   "دراسة مشاريع القوانين"
  ]
 },
 {
  "label": "Débats parlementaires",
  "arabic": "المناقشات البرلمانية",
  "topic": "Interventions et questions parlementaires",
  "aliases": [
   "المناقشات البرلمانية"
  ]
 },
 {
  "label": "Participation aux conférences internationales",
  "arabic": "المشاركة في المؤتمرات الدولية",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "المشاركة في المؤتمرات الدولية",
   "Conférence internationale",
   "Conférences internationales"
  ]
 },
 {
  "label": "Participation aux forums internationaux",
  "arabic": "المشاركة في المنتديات الدولية",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "المشاركة في المنتديات الدولية",
   "Forum international",
   "Forums internationaux"
  ]
 },
 {
  "label": "Participation aux salons internationaux",
  "arabic": "المشاركة في المعارض الدولية",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "المشاركة في المعارض الدولية",
   "Salon international",
   "Salons internationaux"
  ]
 },
 {
  "label": "Forum urbain mondial",
  "arabic": "المنتدى الحضري العالمي",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "المنتدى الحضري العالمي",
   "WUF",
   "World Urban Forum",
   "FUM"
  ]
 },
 {
  "label": "Coopération bilatérale",
  "arabic": "التعاون الثنائي",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "التعاون الثنائي"
  ]
 },
 {
  "label": "Coopération multilatérale",
  "arabic": "التعاون متعدد الأطراف",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "التعاون متعدد الأطراف"
  ]
 },
 {
  "label": "Partenariats internationaux",
  "arabic": "الشراكات الدولية",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "الشراكات الدولية",
   "Partenariat international"
  ]
 },
 {
  "label": "Visites officielles à l’étranger",
  "arabic": "الزيارات الرسمية إلى الخارج",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "الزيارات الرسمية إلى الخارج",
   "Visite officielle à l’étranger",
   "Déplacement officiel à l’étranger"
  ]
 },
 {
  "label": "Accords de coopération",
  "arabic": "اتفاقيات التعاون",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "اتفاقيات التعاون",
   "Accord de coopération"
  ]
 },
 {
  "label": "Forum urbain africain",
  "arabic": "المنتدى الحضري الإفريقي",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "المنتدى الحضري الإفريقي",
   "FUA",
   "AUF",
   "African Urban Forum",
   "المنتدى الحضري الأفريقي"
  ]
 },
 {
  "label": "Assemblée d’ONU-Habitat",
  "arabic": "جمعية موئل الأمم المتحدة",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "جمعية موئل الأمم المتحدة",
   "Assemblée générale d’ONU-Habitat",
   "Assemblée des Nations unies pour l’habitat",
   "UN-Habitat Assembly",
   "جمعية برنامج الأمم المتحدة للمستوطنات البشرية"
  ]
 },
 {
  "label": "Sommet Africités",
  "arabic": "قمة أفريسيتي",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "قمة أفريسيتي",
   "Africités",
   "Africities Summit",
   "أفريسيتي",
   "قمة المدن الإفريقية"
  ]
 },
 {
  "label": "Salon international de l’habitat du Sénégal",
  "arabic": "المعرض الدولي للسكن بالسنغال",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "المعرض الدولي للسكن بالسنغال",
   "SENHABITAT",
   "SEN HABITAT",
   "SENHABITAT Dakar"
  ]
 },
 {
  "label": "Forum ministériel africain sur l’habitat et le développement urbain",
  "arabic": "المنتدى الوزاري الإفريقي للإسكان والتنمية الحضرية",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "المنتدى الوزاري الإفريقي للإسكان والتنمية الحضرية",
   "FOMAHDU",
   "Forum ministériel africain"
  ]
 },
 {
  "label": "Coopération Sud-Sud",
  "arabic": "التعاون جنوب-جنوب",
  "topic": "Coopération et participation internationales",
  "aliases": [
   "التعاون جنوب-جنوب",
   "التعاون جنوب جنوب",
   "South-South cooperation"
  ]
 },

 {
  "label": "Élaboration des textes législatifs et réglementaires",
  "arabic": "إعداد النصوص التشريعية والتنظيمية",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "إعداد النصوص التشريعية والتنظيمية",
   "Projets de loi",
   "مشاريع القوانين",
   "Projets de décret",
   "مشاريع المراسيم"
  ]
 },
 {
  "label": "Législation de l’urbanisme",
  "arabic": "تشريعات التعمير",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "تشريعات التعمير",
   "Droit de l’urbanisme",
   "قانون التعمير"
  ]
 },
 {
  "label": "Réglementation de l’habitat",
  "arabic": "تنظيم قطاع الإسكان",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "تنظيم قطاع الإسكان",
   "Législation de l’habitat",
   "تشريعات الإسكان"
  ]
 },
 {
  "label": "Réglementation de la construction",
  "arabic": "ضوابط البناء",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "ضوابط البناء",
   "Droit de la construction",
   "قانون البناء"
  ]
 },
 {
  "label": "Encadrement juridique de l’aménagement du territoire",
  "arabic": "التأطير القانوني لإعداد التراب",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "التأطير القانوني لإعداد التراب"
  ]
 },
 {
  "label": "Réformes législatives et réglementaires",
  "arabic": "الإصلاحات التشريعية والتنظيمية",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "الإصلاحات التشريعية والتنظيمية",
   "Réforme juridique",
   "إصلاح قانوني"
  ]
 },
 {
  "label": "Consultations et avis juridiques",
  "arabic": "الاستشارات والآراء القانونية",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "الاستشارات والآراء القانونية",
   "Assistance juridique",
   "المساعدة القانونية"
  ]
 },
 {
  "label": "Études et recherches juridiques",
  "arabic": "الدراسات والأبحاث القانونية",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "الدراسات والأبحاث القانونية"
  ]
 },
 {
  "label": "Veille juridique",
  "arabic": "اليقظة القانونية",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "اليقظة القانونية"
  ]
 },
 {
  "label": "Contentieux du ministère",
  "arabic": "منازعات الوزارة",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "منازعات الوزارة",
   "Contentieux administratif",
   "المنازعات الإدارية",
   "المنازعات القضائية"
  ]
 },
 {
  "label": "Formation juridique",
  "arabic": "التكوين القانوني",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "التكوين القانوني",
   "Formation continue juridique",
   "التكوين المستمر في المجال القانوني"
  ]
 },
 {
  "label": "Actualisation des textes juridiques",
  "arabic": "تحيين النصوص القانونية",
  "topic": "Affaires juridiques et réglementation",
  "aliases": [
   "تحيين النصوص القانونية",
   "Mise à jour des textes juridiques"
  ]
 },
 {
  "label": "Salon International du Bâtiment",
  "arabic": "المعرض الدولي للبناء",
  "topic": "Habitat et logement",
  "aliases": [
   "المعرض الدولي للبناء",
   "SIB",
   "Salon international du bâtiment",
   "Salon du bâtiment"
  ]
 }
,

 {
  "label": "Aménagement urbain et foncier",
  "arabic": "التهيئة الحضرية والعقارية",
  "topic": "Habitat et logement",
  "aliases": [
   "التهيئة الحضرية والعقارية",
   "Aménagement urbain et aménagement foncier"
  ]
 },
 {
  "label": "Production de logements sociaux",
  "arabic": "إنتاج السكن الاجتماعي",
  "topic": "Habitat et logement",
  "aliases": [
   "إنتاج السكن الاجتماعي",
   "Production du logement social"
  ]
 },
 {
  "label": "Développement du monde rural",
  "arabic": "تنمية العالم القروي",
  "topic": "Habitat et logement",
  "aliases": [
   "تنمية العالم القروي",
   "Développement rural"
  ]
 }
,

 {
  "label": "Passation de pouvoirs",
  "arabic": "تسليم السلط",
  "topic": "Vie institutionnelle",
  "aliases": [
   "تسليم السلط",
   "Passation des pouvoirs",
   "تسليم السلطات"
  ]
 },
 {
  "label": "Prise de fonctions",
  "arabic": "تولي المهام",
  "topic": "Vie institutionnelle",
  "aliases": [
   "تولي المهام",
   "Prise de fonction",
   "تولي المسؤوليات"
  ]
 },
 {
  "label": "Nominations aux postes de responsabilité",
  "arabic": "التعيين في مناصب المسؤولية",
  "topic": "Vie institutionnelle",
  "aliases": [
   "التعيين في مناصب المسؤولية",
   "Nomination aux postes de responsabilité"
  ]
 },
 {
  "label": "Conseils d’administration",
  "arabic": "مجالس الإدارة",
  "topic": "Vie institutionnelle",
  "aliases": [
   "مجالس الإدارة",
   "Conseil d’administration"
  ]
 },
 {
  "label": "Conseils de surveillance",
  "arabic": "مجالس الرقابة",
  "topic": "Vie institutionnelle",
  "aliases": [
   "مجالس الرقابة",
   "Conseil de surveillance"
  ]
 },
 {
  "label": "Réunions de coordination",
  "arabic": "اجتماعات التنسيق",
  "topic": "Vie institutionnelle",
  "aliases": [
   "اجتماعات التنسيق",
   "Réunion de coordination"
  ]
 },
 {
  "label": "Réorganisation des services",
  "arabic": "إعادة تنظيم المصالح",
  "topic": "Vie institutionnelle",
  "aliases": [
   "إعادة تنظيم المصالح"
  ]
 },
 {
  "label": "Dialogue social",
  "arabic": "الحوار الاجتماعي",
  "topic": "Vie institutionnelle",
  "aliases": [
   "الحوار الاجتماعي"
  ]
 },
 {
  "label": "Bilan de l’action ministérielle",
  "arabic": "حصيلة العمل الوزاري",
  "topic": "Vie institutionnelle",
  "aliases": [
   "حصيلة العمل الوزاري"
  ]
 },
 {
  "label": "Distinctions et hommages",
  "arabic": "التكريم والتنويه",
  "topic": "Vie institutionnelle",
  "aliases": [
   "التكريم والتنويه"
  ]
 }

];
export const documentaryTranslations:Record<string,string>={...documentaryTopicTranslations,...Object.fromEntries(keywordCatalog.map(term=>[term.label,term.arabic]))};
export const normalizeKeyword=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const byAlias=new Map(keywordCatalog.flatMap(t=>[t.label,...t.aliases].map(a=>[normalizeKeyword(a),t] as const)));
export function canonicalKeyword(value:string){return byAlias.get(normalizeKeyword(value))?.label||value.trim();}
export function keywordSearchText(values:string[]){return values.flatMap(v=>{const term=byAlias.get(normalizeKeyword(v));return term?[term.label,...term.aliases]:[v];}).join(' ');}
export function parseKeywordText(value:string){return Array.from(new Set(value.split(/[,;\n]+/).map(v=>canonicalKeyword(v.trim())).filter(Boolean)));}
export type KeywordTopicMatch={topic:string;keywords:string[];score:number};
const topicOrder=documentaryTopics;
const broadTopics=new Map(topicOrder.map(topic=>[normalizeKeyword(topic),topic]));
export function rankKeywordTopics(values:string[]):KeywordTopicMatch[]{
 const matches=new Map<string,string[]>(),seen=new Set<string>();
 for(const raw of values){
  const label=canonicalKeyword(raw),key=normalizeKeyword(label);if(!key||seen.has(key))continue;seen.add(key);
  const topic=byAlias.get(key)?.topic||broadTopics.get(key);if(!topic)continue;
  const terms=matches.get(topic)||[];terms.push(label);matches.set(topic,terms);
 }
 return [...matches].map(([topic,keywords])=>({topic,keywords,score:keywords.length})).sort((a,b)=>b.score-a.score||topicOrder.indexOf(a.topic)-topicOrder.indexOf(b.topic));
}
export function preferredKeywordTopic(values:string[]):string|null{
 const ranked=rankKeywordTopics(values);return ranked.length&&(!ranked[1]||ranked[0].score>ranked[1].score)?ranked[0].topic:null;
}
const stopWords=new Set(['les','des','une','dans','pour','avec','sans','sur','aux','est','ses','du','de','la','le','et','au','en','un']);
export function suggestKeywords({topic,text,selected=[],query=''}:{topic:string;text:string;selected?:string[];query?:string}){
 const normalized=' '+normalizeKeyword(text.slice(0,100000))+' ',tokens=new Set(normalized.split(' ')),chosen=new Set(selected.map(v=>normalizeKeyword(canonicalKeyword(v)))),search=normalizeKeyword(query).split(' ').filter(Boolean);
 return keywordCatalog.map((term,index)=>{
  const names=[term.label,...term.aliases].map(normalizeKeyword);
  const match=Math.max(...names.map(name=>{if(normalized.includes(' '+name+' '))return 30;const words=name.split(' ').filter(w=>w.length>2&&!stopWords.has(w));return words.length>1&&words.every(w=>tokens.has(w))?15:0;}));
  return {term,index,score:match+(term.topic===topic?5:0),matchesSearch:search.every(q=>names.some(n=>n.includes(q)))};
 }).filter(x=>!chosen.has(normalizeKeyword(x.term.label))&&x.matchesSearch&&(search.length||x.score>0)).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.term.label);
}

// Submission uses controlled descriptors; the main domain is never a substitute for a keyword.
export function validateDocumentaryKeywords(topic:string,value:unknown):string[]{
 if(!documentaryTopics.includes(topic))throw new Error('Choisissez le domaine principal du contenu.');
 if(!Array.isArray(value)||!value.length||value.length>8)throw new Error('Choisissez de 1 à 8 mots-clés documentaires.');
 const selected:string[]=[];
 for(const raw of value){
  if(typeof raw!=='string'||!raw.trim()||raw.length>80)throw new Error('Choisissez les mots-clés dans le référentiel documentaire.');
  const term=byAlias.get(normalizeKeyword(raw));
  if(!term)throw new Error('Choisissez les mots-clés dans le référentiel documentaire.');
  if(!selected.includes(term.label))selected.push(term.label);
 }
 if(!selected.some(label=>byAlias.get(normalizeKeyword(label))?.topic===topic))throw new Error('Choisissez au moins un mot-clé correspondant au domaine principal.');
 return selected;
}
