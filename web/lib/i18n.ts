// Все строки интерфейса. Казахский и английский добавятся отдельными словарями (ТЗ §5).
export const ru = {
  siteName: "Maqala",
  tagline: "Открытые научные статьи Казахстана и мира",
  heroTitle: "Найдите бесплатную научную статью за секунды",
  heroText:
    "Maqala собирает статьи в открытом доступе из открытых источников и показывает их в одном месте. Каждая ведёт к оригиналу, читать можно бесплатно.",
  nav: { search: "Поиск", kazakhstan: "Казахстан", about: "О проекте" },
  search: {
    placeholder: "Тема, ключевые слова, название…",
    button: "Найти",
    results: (n: number) => `${n.toLocaleString("ru-RU")} ${plural(n, "статья", "статьи", "статей")}`,
    nothing: "Ничего не нашлось",
    nothingHint: "Попробуйте другие слова или уберите часть фильтров.",
    resetFilters: "Сбросить фильтры",
    error: "Не удалось загрузить результаты. Попробуйте обновить страницу.",
  },
  sort: {
    label: "Сортировка",
    relevance: "По релевантности",
    date: "Сначала новые",
    cited: "По цитированиям",
  },
  filters: {
    title: "Фильтры",
    country: "Страна авторов",
    year: "Год публикации",
    yearFrom: "с",
    yearTo: "по",
    apply: "Применить",
    field: "Область науки",
    language: "Язык",
    license: "Лицензия",
    noLicense: "Не указана",
    unknown: "Не указан",
  },
  work: {
    authors: "Авторы",
    abstract: "Аннотация",
    noAbstract: "Аннотации нет в источнике.",
    readOriginal: "Читать оригинал",
    freeVersion: "Бесплатная версия",
    details: "Сведения",
    journal: "Журнал",
    year: "Год",
    date: "Дата публикации",
    type: "Тип",
    language: "Язык",
    license: "Лицензия",
    field: "Область",
    topic: "Тема",
    citations: "Цитирований",
    countries: "Страны авторов",
    source: "Источник данных",
    noLicense: "лицензия не указана",
    moreAuthors: (n: number) => `и ещё ${n}`,
    back: "← К результатам",
  },
  home: {
    stats: { works: "статей в базе", kz: "с авторами из Казахстана", oa: "в открытом доступе" },
    topCited: "Самые цитируемые",
    kzCard: "Наука Казахстана",
    kzCardText: "Статьи с участием казахстанских авторов: статистика по годам и областям.",
    open: "Открыть",
  },
  country: {
    total: "статей",
    byYear: "Статьи по годам",
    byField: "Области науки",
    recent: "Новые работы",
    topCited: "Самые цитируемые",
    all: "Все статьи страны",
  },
  pagination: { prev: "← Назад", next: "Дальше →", page: (p: number, n: number) => `Страница ${p} из ${n}` },
  notFound: { title: "Страница не найдена", back: "На главную" },
};

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
