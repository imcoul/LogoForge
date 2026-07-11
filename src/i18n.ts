import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: {
      "app_title": "Forgel Workspace",
      "app_description": "Manage your generated logos, brand guides, mockups, and sonic identities.",
      "new_project": "New Project",
      "no_projects": "No projects yet",
      "create_first_project": "Create your first brand identity project to get started.",
      "create_project": "Create Project",
      
      "refinement_studio": "Refinement Studio",
      "no_project_selected": "Select or create a project from the dashboard.",
      "create_new": "Create New",
      "upload_logo": "Upload Logo",
      "company_description": "1. Company Description",
      "company_desc_placeholder": "Describe your company, its mission, and its target audience in a few sentences...",
      "generate_logo": "Generate Logo",
      
      "studio_tabs_preview": "PREVIEW",
      "studio_tabs_guide": "GUIDE",
      "studio_tabs_refine": "REFINE",
      "studio_tabs_sonic": "SONIC",
      "studio_tabs_collab": "COLLAB",
      
      "export_notion": "Export Notion",
      
      "dynamic_motion": "Dynamic Motion:",
      "no_logo_yet": "No logo generated yet.",
      "brand_guide": "Brand Guide",
      "ai_refinement_studio": "AI Refinement Studio",
      "organic_sonic_branding": "Organic Sonic Branding",
      "collaboration": "Collaboration & Comments"
    }
  },
  fr: {
    translation: {
      "app_title": "Espace Forgel",
      "app_description": "Gérez vos logos générés, guides de marque, maquettes et identités sonores.",
      "new_project": "Nouveau Projet",
      "no_projects": "Aucun projet pour le moment",
      "create_first_project": "Créez votre premier projet d'identité de marque pour commencer.",
      "create_project": "Créer le Projet",
      
      "refinement_studio": "Studio d'Affinement",
      "no_project_selected": "Sélectionnez ou créez un projet depuis le tableau de bord.",
      "create_new": "Créer",
      "upload_logo": "Uploader",
      "company_description": "1. Description de l'Entreprise",
      "company_desc_placeholder": "Décrivez votre entreprise, sa mission et son public cible en quelques phrases...",
      "generate_logo": "Générer le Logo",
      
      "studio_tabs_preview": "APERÇU",
      "studio_tabs_guide": "GUIDE",
      "studio_tabs_refine": "AFFINER",
      "studio_tabs_sonic": "SONORE",
      "studio_tabs_collab": "COLLAB",
      
      "export_notion": "Exporter vers Notion",
      
      "dynamic_motion": "Mouvement Dynamique :",
      "no_logo_yet": "Aucun logo généré pour le moment.",
      "brand_guide": "Guide de Marque",
      "ai_refinement_studio": "Studio d'Affinement IA",
      "organic_sonic_branding": "Image de Marque Sonore Organique",
      "collaboration": "Collaboration & Commentaires"
    }
  },
  ar: {
    translation: {
      "app_title": "مساحة عمل Forgel",
      "app_description": "إدارة الشعارات التي تم إنشاؤها، أدلة العلامة التجارية، النماذج، والهويات الصوتية.",
      "new_project": "مشروع جديد",
      "no_projects": "لا توجد مشاريع بعد",
      "create_first_project": "قم بإنشاء مشروع هوية علامتك التجارية الأول للبدء.",
      "create_project": "إنشاء مشروع",
      
      "refinement_studio": "استوديو التحسين",
      "no_project_selected": "اختر أو قم بإنشاء مشروع من لوحة التحكم.",
      "create_new": "إنشاء جديد",
      "upload_logo": "تحميل الشعار",
      "company_description": "1. وصف الشركة",
      "company_desc_placeholder": "صف شركتك، مهمتها، والجمهور المستهدف في بضع جمل...",
      "generate_logo": "إنشاء الشعار",
      
      "studio_tabs_preview": "معاينة",
      "studio_tabs_guide": "دليل",
      "studio_tabs_refine": "تحسين",
      "studio_tabs_sonic": "صوتي",
      "studio_tabs_collab": "تعاون",
      
      "export_notion": "تصدير إلى Notion",
      
      "dynamic_motion": "حركة ديناميكية:",
      "no_logo_yet": "لم يتم إنشاء شعار بعد.",
      "brand_guide": "دليل العلامة التجارية",
      "ai_refinement_studio": "استوديو التحسين بالذكاء الاصطناعي",
      "organic_sonic_branding": "العلامة التجارية الصوتية العضوية",
      "collaboration": "التعاون والتعليقات"
    }
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
