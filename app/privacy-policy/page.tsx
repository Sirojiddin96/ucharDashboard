"use client";

import { useState } from "react";

const css = `
  #pp *, #pp *::before, #pp *::after { box-sizing: border-box; margin: 0; padding: 0; }

  #pp {
    --lime:    #C6F135;
    --dark:    #0E1A0F;
    --ink:     #1A2B1C;
    --ink-mid: #4A5C4C;
    --border:  #D8E8D9;
    --bg:      #F7FAF7;
    --white:   #FFFFFF;
    --radius:  14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--ink);
    line-height: 1.7;
    font-size: 16px;
    min-height: 100vh;
  }

  #pp header {
    background: var(--dark);
    padding: 36px 24px 32px;
    text-align: center;
  }

  #pp .logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  #pp .logo-dot {
    width: 36px;
    height: 36px;
    background: var(--lime);
    border-radius: 10px;
  }

  #pp .logo span {
    color: var(--lime);
    font-size: 26px;
    font-weight: 800;
  }

  #pp header p {
    color: #8FA490;
    font-size: 14px;
    margin-top: 4px;
  }

  #pp .lang-switcher {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
  }

  #pp .lang-switcher button {
    background: transparent;
    border: 1.5px solid #3A4A3C;
    color: #8FA490;
    padding: 5px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
  }

  #pp .lang-switcher button.active,
  #pp .lang-switcher button:hover {
    background: var(--lime);
    border-color: var(--lime);
    color: var(--dark);
  }

  #pp main {
    max-width: 780px;
    margin: 40px auto;
    padding: 0 20px 60px;
  }

  #pp .updated {
    text-align: center;
    font-size: 13px;
    color: var(--ink-mid);
    margin-bottom: 32px;
  }

  #pp section {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px 32px;
    margin-bottom: 16px;
  }

  #pp section h2 {
    font-size: 17px;
    font-weight: 700;
    color: var(--dark);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  #pp section h2 .icon {
    width: 32px;
    height: 32px;
    background: var(--lime);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  #pp section p {
    color: var(--ink-mid);
    font-size: 15px;
    margin-bottom: 10px;
  }

  #pp section p:last-child { margin-bottom: 0; }

  #pp section ul {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
  }

  #pp section ul li {
    color: var(--ink-mid);
    font-size: 15px;
    padding: 5px 0 5px 20px;
    position: relative;
  }

  #pp section ul li::before {
    content: "•";
    position: absolute;
    left: 6px;
    color: var(--lime);
    font-weight: 900;
  }

  #pp .contact-box {
    background: var(--dark);
    border-radius: var(--radius);
    padding: 28px 32px;
    text-align: center;
    margin-bottom: 16px;
  }

  #pp .contact-box h2 {
    color: var(--white);
    font-size: 17px;
    margin-bottom: 8px;
  }

  #pp .contact-box p {
    color: #8FA490;
    font-size: 14px;
    margin-bottom: 4px;
  }

  #pp .contact-box a {
    color: var(--lime);
    text-decoration: none;
    font-weight: 600;
  }

  #pp .contact-note {
    margin-top: 8px !important;
    font-size: 13px !important;
  }

  #pp footer {
    text-align: center;
    padding: 20px;
    font-size: 13px;
    color: var(--ink-mid);
  }

  @media (max-width: 560px) {
    #pp section { padding: 20px 18px; }
    #pp .logo span { font-size: 22px; }
  }
`;

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<"uz" | "ru">("uz");

  return (
    <div id="pp">
      <style>{css}</style>

      <header>
        <div className="logo">
          <div className="logo-dot" />
          <span>UcharGo</span>
        </div>
        <p>Maxfiylik siyosati / Политика конфиденциальности</p>
        <div className="lang-switcher">
          <button
            className={lang === "uz" ? "active" : ""}
            onClick={() => setLang("uz")}
          >
            O&apos;zbek
          </button>
          <button
            className={lang === "ru" ? "active" : ""}
            onClick={() => setLang("ru")}
          >
            Русский
          </button>
        </div>
      </header>

      <main>
        {lang === "uz" ? (
          <div>
            <p className="updated">Oxirgi yangilanish: 30 mart 2026</p>

            <section>
              <h2><span className="icon">📋</span>Umumiy ma&apos;lumot</h2>
              <p>
                Ushbu Maxfiylik siyosati <strong>UcharGo</strong> ilovasi
                (keyingi o&apos;rinlarda &quot;Ilova&quot;) foydalanuvchilarining
                shaxsiy ma&apos;lumotlarini qanday to&apos;plash, ishlatish va
                himoya qilishimizni tushuntiradi.
              </p>
              <p>Ilovadan foydalanib, siz ushbu siyosat shartlariga rozilik bildirasiz.</p>
            </section>

            <section>
              <h2><span className="icon">📱</span>To&apos;planadigan ma&apos;lumotlar</h2>
              <p>Biz quyidagi ma&apos;lumotlarni to&apos;playmiz:</p>
              <ul>
                <li><strong>Telefon raqami</strong> — ro&apos;yxatdan o&apos;tish va SMS orqali tizimga kirish uchun</li>
                <li><strong>Ism</strong> — profil sahifasida ko&apos;rsatish uchun</li>
                <li><strong>Joylashuv ma&apos;lumotlari</strong> — sizning manzilingizni aniqlash va haydovchiga ko&apos;rsatish uchun (ilova ochiq bo&apos;lganda)</li>
                <li><strong>Buyurtma tarixi</strong> — sayohatlar ro&apos;yxati va statistika uchun</li>
                <li><strong>FCM token</strong> — push-bildirishnomalar yuborish uchun</li>
                <li><strong>Qurilma ma&apos;lumotlari</strong> — ilova ishlashini yaxshilash uchun</li>
              </ul>
            </section>

            <section>
              <h2><span className="icon">🎯</span>Ma&apos;lumotlardan foydalanish maqsadi</h2>
              <ul>
                <li>Taksi buyurtmalarini qayta ishlash va haydovchi tayinlash</li>
                <li>SMS orqali OTP kodi yuborish va autentifikatsiya</li>
                <li>Buyurtma holati haqida push-bildirishnomalar yuborish</li>
                <li>Xizmat sifatini yaxshilash va statistika yuritish</li>
                <li>Foydalanuvchi bilan aloqa o&apos;rnatish</li>
              </ul>
            </section>

            <section>
              <h2><span className="icon">📍</span>Joylashuv ma&apos;lumotlari</h2>
              <p>
                Ilova sizning joylashuvingizni faqat ilova{" "}
                <strong>ochiq va faol</strong> bo&apos;lganida ishlatadi. Fonda
                joylashuvni kuzatmaymiz.
              </p>
              <p>Joylashuv ma&apos;lumotlari faqat buyurtma berish jarayonida ishlatiladi va uchinchi shaxslarga sotilmaydi.</p>
            </section>

            <section>
              <h2><span className="icon">🔒</span>Ma&apos;lumotlarni saqlash va himoya</h2>
              <p>
                Barcha ma&apos;lumotlar <strong>Supabase</strong> xizmati orqali
                xavfsiz serverda saqlanadi. Ma&apos;lumotlar uzatishda SSL/TLS
                shifrlashdan foydalaniladi.
              </p>
              <p>Parollar yoki to&apos;liq bank ma&apos;lumotlari saqlanmaydi.</p>
            </section>

            <section>
              <h2><span className="icon">🤝</span>Uchinchi tomon xizmatlari</h2>
              <p>Ilova quyidagi uchinchi tomon xizmatlaridan foydalanadi:</p>
              <ul>
                <li><strong>Eskiz SMS</strong> — OTP tasdiqlash kodlarini yuborish uchun</li>
                <li><strong>Google Maps</strong> — xarita va yo&apos;nalish ko&apos;rsatish uchun</li>
                <li><strong>Firebase (Google)</strong> — push-bildirishnomalar va analitika uchun</li>
                <li><strong>Supabase</strong> — ma&apos;lumotlar bazasi va autentifikatsiya uchun</li>
              </ul>
              <p>Ushbu xizmatlar o&apos;zlarining maxfiylik siyosatiga ega.</p>
            </section>

            <section>
              <h2><span className="icon">🗑️</span>Akkauntni o&apos;chirish</h2>
              <p>
                Siz istalgan vaqt ilovadagi{" "}
                <strong>Profil → Akkauntni o&apos;chirish</strong> orqali
                akkauntingizni o&apos;chirishingiz mumkin.
              </p>
              <p>Akkaunt o&apos;chirilgandan so&apos;ng tizimga kirish bloklandi. Ma&apos;lumotlaringizni to&apos;liq o&apos;chirish uchun biz bilan bog&apos;laning.</p>
            </section>

            <section>
              <h2><span className="icon">👶</span>Bolalar maxfiyligi</h2>
              <p>Ilova 13 yoshdan kichik bolalarga mo&apos;ljallanmagan. Biz bilmasdan 13 yoshdan kichik bolalarning ma&apos;lumotlarini to&apos;plamaymiz.</p>
            </section>

            <section>
              <h2><span className="icon">🔄</span>Siyosat yangilanishlari</h2>
              <p>Biz ushbu siyosatni vaqti-vaqti bilan yangilashimiz mumkin. Muhim o&apos;zgarishlar haqida ilova orqali xabar beriladi. Ilovadan foydalanishda davom etish yangi shartlarga rozilikni bildiradi.</p>
            </section>

            <div className="contact-box">
              <h2>Biz bilan bog&apos;laning</h2>
              <p>Savol yoki murojaatlar uchun:</p>
              <p><a href="mailto:support@ucharapp.uz">sirojiddin960417@gmail.com</a></p>
              <p className="contact-note">UcharGo — Namangan, O&apos;zbekiston</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="updated">Последнее обновление: 30 марта 2026 г.</p>

            <section>
              <h2><span className="icon">📋</span>Общие сведения</h2>
              <p>Настоящая Политика конфиденциальности описывает, как приложение <strong>UcharGo</strong> собирает, использует и защищает персональные данные пользователей.</p>
              <p>Используя приложение, вы соглашаетесь с условиями данной политики.</p>
            </section>

            <section>
              <h2><span className="icon">📱</span>Собираемые данные</h2>
              <p>Мы собираем следующие данные:</p>
              <ul>
                <li><strong>Номер телефона</strong> — для регистрации и входа через SMS-код</li>
                <li><strong>Имя пользователя</strong> — для отображения в профиле</li>
                <li><strong>Данные о местоположении</strong> — для определения вашего адреса и передачи водителю (только когда приложение открыто)</li>
                <li><strong>История заказов</strong> — для отображения поездок и статистики</li>
                <li><strong>FCM-токен</strong> — для отправки push-уведомлений</li>
                <li><strong>Данные устройства</strong> — для улучшения работы приложения</li>
              </ul>
            </section>

            <section>
              <h2><span className="icon">🎯</span>Цели использования данных</h2>
              <ul>
                <li>Обработка заказов такси и назначение водителя</li>
                <li>Отправка OTP-кода через SMS и аутентификация</li>
                <li>Push-уведомления о статусе заказа</li>
                <li>Улучшение качества сервиса и ведение статистики</li>
                <li>Связь с пользователем</li>
              </ul>
            </section>

            <section>
              <h2><span className="icon">📍</span>Данные о местоположении</h2>
              <p>Приложение использует ваше местоположение только когда оно <strong>открыто и активно</strong>. Фоновое отслеживание не осуществляется.</p>
              <p>Данные о местоположении используются исключительно в процессе оформления заказа и не продаются третьим лицам.</p>
            </section>

            <section>
              <h2><span className="icon">🔒</span>Хранение и защита данных</h2>
              <p>Все данные хранятся на защищённых серверах через сервис <strong>Supabase</strong>. При передаче данных используется SSL/TLS-шифрование.</p>
              <p>Пароли и полные банковские реквизиты не хранятся.</p>
            </section>

            <section>
              <h2><span className="icon">🤝</span>Сторонние сервисы</h2>
              <p>Приложение использует следующие сторонние сервисы:</p>
              <ul>
                <li><strong>Eskiz SMS</strong> — для отправки кодов подтверждения OTP</li>
                <li><strong>Google Maps</strong> — для отображения карты и маршрутов</li>
                <li><strong>Firebase (Google)</strong> — для push-уведомлений и аналитики</li>
                <li><strong>Supabase</strong> — для базы данных и аутентификации</li>
              </ul>
              <p>Каждый из этих сервисов имеет собственную политику конфиденциальности.</p>
            </section>

            <section>
              <h2><span className="icon">🗑️</span>Удаление аккаунта</h2>
              <p>Вы можете удалить свой аккаунт в любое время через <strong>Профиль → Удалить аккаунт</strong>.</p>
              <p>После удаления аккаунта вход в систему будет заблокирован. Для полного удаления ваших данных свяжитесь с нами.</p>
            </section>

            <section>
              <h2><span className="icon">👶</span>Конфиденциальность детей</h2>
              <p>Приложение не предназначено для детей до 13 лет. Мы не собираем данные лиц младше 13 лет намеренно.</p>
            </section>

            <section>
              <h2><span className="icon">🔄</span>Обновления политики</h2>
              <p>Мы можем периодически обновлять данную политику. О существенных изменениях будет сообщено через приложение. Продолжение использования приложения означает согласие с новыми условиями.</p>
            </section>

            <div className="contact-box">
              <h2>Свяжитесь с нами</h2>
              <p>По вопросам и обращениям:</p>
              <p><a href="mailto:support@ucharapp.uz">sirojiddin960417@gmail.com</a></p>
              <p className="contact-note">UcharGo — Наманган, Узбекистан</p>
            </div>
          </div>
        )}
      </main>

      <footer>
        &copy; 2026 UcharGo. Barcha huquqlar himoyalangan / Все права защищены.
      </footer>
    </div>
  );
}
