import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "@/locales/ar.json";
import en from "@/locales/en.json";
import ru from "@/locales/ru.json";
import tr from "@/locales/tr.json";
import es from "@/locales/es.json";
import fa from "@/locales/fa.json";
import id from "@/locales/id.json";
const resources = {
    ar: { translation: ar },
    en: { translation: en },
    ru: { translation: ru },
    tr: { translation: tr },
    es: { translation: es },
    fa: { translation: fa },
    id: { translation: id }
};
i18n.use(initReactI18next).init({
    resources,
    lng: "ar",
    fallbackLng: "ar",
    interpolation: {
        escapeValue: false
    }
});
export default i18n;
