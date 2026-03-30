"use client";

import { useState } from "react";

const css = `
  #da *, #da *::before, #da *::after { box-sizing: border-box; margin: 0; padding: 0; }

  #da {
    --lime:    #C6F135;
    --dark:    #0E1A0F;
    --ink:     #1A2B1C;
    --ink-mid: #4A5C4C;
    --border:  #D8E8D9;
    --bg:      #F7FAF7;
    --white:   #FFFFFF;
    --red:     #E53E3E;
    --red-bg:  #FFF5F5;
    --red-border: #FED7D7;
    --radius:  14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--ink);
    line-height: 1.7;
    font-size: 16px;
    min-height: 100vh;
  }

  #da header {
    background: var(--dark);
    padding: 36px 24px 32px;
    text-align: center;
  }

  #da .logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  #da .logo-dot {
    width: 36px;
    height: 36px;
    background: var(--lime);
    border-radius: 10px;
  }

  #da .logo span {
    color: var(--lime);
    font-size: 26px;
    font-weight: 800;
  }

  #da header p {
    color: #8FA490;
    font-size: 14px;
    margin-top: 4px;
  }

  #da .lang-switcher {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
  }

  #da .lang-switcher button {
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

  #da .lang-switcher button.active,
  #da .lang-switcher button:hover {
    background: var(--lime);
    border-color: var(--lime);
    color: var(--dark);
  }

  #da main {
    max-width: 620px;
    margin: 40px auto;
    padding: 0 20px 60px;
  }

  #da .warning-box {
    background: var(--red-bg);
    border: 1px solid var(--red-border);
    border-radius: var(--radius);
    padding: 20px 24px;
    margin-bottom: 24px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  #da .warning-box .warn-icon {
    font-size: 22px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  #da .warning-box p {
    color: var(--red);
    font-size: 14px;
    line-height: 1.6;
  }

  #da .card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px;
    margin-bottom: 16px;
  }

  #da .card h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--dark);
    margin-bottom: 6px;
  }

  #da .card .subtitle {
    color: var(--ink-mid);
    font-size: 14px;
    margin-bottom: 24px;
  }

  #da .field {
    margin-bottom: 16px;
  }

  #da .field label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 6px;
  }

  #da .field input,
  #da .field select,
  #da .field textarea {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    font-size: 15px;
    color: var(--ink);
    background: var(--white);
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
    resize: vertical;
  }

  #da .field input:focus,
  #da .field select:focus,
  #da .field textarea:focus {
    border-color: var(--lime);
  }

  #da .field input::placeholder,
  #da .field textarea::placeholder {
    color: #A0B0A2;
  }

  #da .submit-btn {
    width: 100%;
    padding: 14px;
    background: var(--red);
    color: var(--white);
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s;
    margin-top: 8px;
  }

  #da .submit-btn:hover { opacity: 0.88; }
  #da .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  #da .info-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  #da .info-list li {
    color: var(--ink-mid);
    font-size: 14px;
    padding: 5px 0 5px 20px;
    position: relative;
  }

  #da .info-list li::before {
    content: "•";
    position: absolute;
    left: 6px;
    color: var(--lime);
    font-weight: 900;
  }

  #da .success-box {
    background: var(--dark);
    border-radius: var(--radius);
    padding: 40px 32px;
    text-align: center;
  }

  #da .success-box .check {
    font-size: 48px;
    margin-bottom: 16px;
  }

  #da .success-box h2 {
    color: var(--lime);
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 10px;
  }

  #da .success-box p {
    color: #8FA490;
    font-size: 14px;
    line-height: 1.7;
  }

  #da footer {
    text-align: center;
    padding: 20px;
    font-size: 13px;
    color: var(--ink-mid);
  }

  #da .error-msg {
    color: var(--red);
    font-size: 13px;
    margin-top: 12px;
    text-align: center;
  }

  @media (max-width: 560px) {
    #da .card { padding: 22px 18px; }
    #da .logo span { font-size: 22px; }
  }
`;

const REASONS_UZ = [
  "Ilovadan foydalanmayapman",
  "Shaxsiy ma'lumotlarimni o'chirmoqchiman",
  "Boshqa akkaunt ochmoqchiman",
  "Xizmatdan mamnun emasman",
  "Boshqa sabab",
];

const REASONS_RU = [
  "Больше не использую приложение",
  "Хочу удалить личные данные",
  "Хочу создать новый аккаунт",
  "Не доволен сервисом",
  "Другая причина",
];

export default function DeleteAccountPage() {
  const [lang, setLang] = useState<"uz" | "ru">("uz");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const isUz = lang === "uz";
  const reasons = isUz ? REASONS_UZ : REASONS_RU;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/delete-account-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, reason, comment }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(
        isUz
          ? "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
          : "Произошла ошибка. Пожалуйста, попробуйте ещё раз."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="da">
      <style>{css}</style>

      <header>
        <div className="logo">
          <div className="logo-dot" />
          <span>UcharGo</span>
        </div>
        <p>
          {isUz
            ? "Akkauntni o'chirish so'rovi"
            : "Запрос на удаление аккаунта"}
        </p>
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
        {submitted ? (
          <div className="success-box">
            <div className="check">✅</div>
            <h2>
              {isUz ? "So'rov yuborildi!" : "Запрос отправлен!"}
            </h2>
            <p>
              {isUz
                ? "Akkauntingizni o'chirish so'rovingiz qabul qilindi. Biz 3 ish kuni ichida siz bilan bog'lanamiz."
                : "Ваш запрос на удаление аккаунта получен. Мы свяжемся с вами в течение 3 рабочих дней."}
            </p>
          </div>
        ) : (
          <>
            <div className="warning-box">
              <span className="warn-icon">⚠️</span>
              <p>
                {isUz
                  ? "Akkauntni o'chirish qaytarib bo'lmaydigan jarayon. Barcha ma'lumotlaringiz, buyurtma tarixi va profil ma'lumotlari butunlay o'chiriladi."
                  : "Удаление аккаунта — необратимый процесс. Все ваши данные, история заказов и информация профиля будут полностью удалены."}
              </p>
            </div>

            <div className="card">
              <h2>
                {isUz
                  ? "Akkauntni o'chirish so'rovi"
                  : "Запрос на удаление аккаунта"}
              </h2>
              <p className="subtitle">
                {isUz
                  ? "Quyidagi ma'lumotlarni to'ldiring, biz sizga 3 ish kuni ichida javob beramiz."
                  : "Заполните данные ниже, и мы ответим вам в течение 3 рабочих дней."}
              </p>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>{isUz ? "Ismingiz" : "Ваше имя"}</label>
                  <input
                    type="text"
                    placeholder={isUz ? "Ism Familiya" : "Имя Фамилия"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    {isUz ? "Telefon raqamingiz" : "Ваш номер телефона"}
                  </label>
                  <input
                    type="tel"
                    placeholder="+998 XX XXX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    {isUz
                      ? "O'chirish sababi"
                      : "Причина удаления"}
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  >
                    <option value="">
                      {isUz ? "Sababni tanlang" : "Выберите причину"}
                    </option>
                    {reasons.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>
                    {isUz
                      ? "Qo'shimcha izoh (ixtiyoriy)"
                      : "Дополнительный комментарий (необязательно)"}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      isUz
                        ? "Qo'shimcha ma'lumot..."
                        : "Дополнительная информация..."
                    }
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                {error && <p className="error-msg">{error}</p>}

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading
                    ? isUz
                      ? "Yuborilmoqda..."
                      : "Отправка..."
                    : isUz
                    ? "So'rov yuborish"
                    : "Отправить запрос"}
                </button>
              </form>
            </div>

            <div className="card">
              <h2 style={{ fontSize: "15px", marginBottom: "12px" }}>
                {isUz ? "Nima bo'ladi?" : "Что произойдёт?"}
              </h2>
              <ul className="info-list">
                {isUz ? (
                  <>
                    <li>So&apos;rovingiz 3 ish kuni ichida ko&apos;rib chiqiladi</li>
                    <li>Telefon raqamingizga tasdiqlash SMS yuboriladi</li>
                    <li>Tasdiqlangandan so&apos;ng akkaunt o&apos;chiriladi</li>
                    <li>Barcha shaxsiy ma&apos;lumotlar tizimdan o&apos;chiriladi</li>
                    <li>Bu amal qaytarib bo&apos;lmaydi</li>
                  </>
                ) : (
                  <>
                    <li>Запрос будет обработан в течение 3 рабочих дней</li>
                    <li>На ваш номер телефона придёт SMS-подтверждение</li>
                    <li>После подтверждения аккаунт будет удалён</li>
                    <li>Все личные данные будут удалены из системы</li>
                    <li>Это действие необратимо</li>
                  </>
                )}
              </ul>
            </div>
          </>
        )}
      </main>

      <footer>
        &copy; 2026 UcharGo.{" "}
        {isUz
          ? "Barcha huquqlar himoyalangan"
          : "Все права защищены"}
      </footer>
    </div>
  );
}
