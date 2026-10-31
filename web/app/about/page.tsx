import type { Metadata } from "next";
import { ru } from "@/lib/i18n";

export const metadata: Metadata = { title: ru.nav.about };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl py-12 leading-relaxed">
      <h1 className="font-serif text-4xl font-bold">О проекте</h1>
      <p className="mt-6 text-lg">
        <strong>Maqala</strong> (каз. «мақала» — «статья») помогает найти научные статьи в открытом
        доступе. Мы собираем метаданные из открытых источников, приводим их к единому виду и
        показываем с удобным поиском и фильтрами. Отдельное внимание — научным работам Казахстана,
        которые плохо видны в международных каталогах.
      </p>

      <h2 className="mt-10 font-serif text-2xl font-bold">Что мы храним</h2>
      <p className="mt-3">
        Только метаданные: название, авторов, аннотацию, журнал, лицензию и ссылку на оригинал.
        Полные тексты и PDF мы не копируем: кнопка «Читать оригинал» ведёт на сайт издателя или
        репозитория.
      </p>

      <h2 className="mt-10 font-serif text-2xl font-bold">Источники данных</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <a href="https://openalex.org" className="text-accent underline">
            OpenAlex
          </a>{" "}
          — открытый каталог научных работ. Данные распространяются под лицензией CC0.
        </li>
      </ul>
      <p className="mt-3 text-muted">
        Позже добавятся CORE, Crossref и репозитории казахстанских вузов и журналов.
      </p>

      <h2 className="mt-10 font-serif text-2xl font-bold">Удаление записи</h2>
      <p className="mt-3">
        Если вы автор или правообладатель и хотите удалить или исправить запись, напишите нам и
        укажите ссылку на статью. {/* TODO: контактный e-mail до запуска (ТЗ §10). */}
        Контактный адрес появится здесь до запуска сайта.
      </p>
    </article>
  );
}
