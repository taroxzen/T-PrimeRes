# 🔐 Güvenlik Politikası / Security Policy

T-PrimeRes,_primevideo.com_ ve desteklenen _amazon.*_ alan adlarında çözünürlük okuyan bir tarayıcı eklentisidir. Güvenlik açıklarını sorumlu şekilde bildirmenizi rica ederiz.

## ✅ Desteklenen sürümler / Supported versions

| Sürüm / Version | Destek / Supported |
|---|---|
| 1.0.x | ✅ Evet / Yes |
| < 1.0 | ❌ Hayır / No |

## 📢 Güvenlik açığı bildirme / Reporting a vulnerability

**Özel bildirim (tercih edilir):** [GitHub Security Advisories → Report a vulnerability](https://github.com/taroxzen/T-PrimeRes/security/advisories/new)

Alternatif: [@taroxzen](https://github.com/taroxzen) kullanıcısına GitHub üzerinden özel mesaj.

Lütfen şunları ekleyin:

- Etkilenen sürüm ve tarayıcı (Brave / Chrome sürümü)
- Yeniden üretme adımları / reproduction steps
- Olası etki / impact
- Varsa kanıt (log, ekran görüntüsü)

**Zaman çizelgesi / Timeline:**

| Aşama | Süre |
|---|---|
| İlk yanıt / Acknowledgement | 3 iş günü / business days |
| Değerlendirme / Assessment | 7 iş günü / business days |
| Düzeltme ve yayın / Fix & release | Duruma göre / case by case |

⚠️ Açığı herkese açık Issue olarak **paylaşmayın**. Önce özel bildirim kullanın.

## 🎯 Kapsam / Scope

**Kapsam içinde / In scope:**

- `manifest.json` izinleri ve host yetkileri
- `background/`, `content/`, `popup/` kaynak kodu
- MPD yakalama ve mesaj köprüsü
- Veri işleme ve ağ davranışı
- Eklentinin yetkisiz veri erişimi

**Kapsam dışında / Out of scope:**

- Prime Video / Amazon servislerinin kendisi
- Tarayıcı güvenlik açıkları
- Sosyal mühendislik
- Eklentiyi elle kurarken kullanıcıdan kaynaklanan hatalar

## 🛡️ Güvenlik tasarımı / Security design

- **İzinler sınırlı:** `activeTab`, `tabs`, `scripting`; host erişimi yalnızca `primevideo.com` ve 17 `amazon.*` alan adı.
- **Veri toplama yok:** Ölçümler bellekte tutulur; `localStorage`, `sessionStorage`, `chrome.storage` kullanılmaz.
- **Ağ trafiği:** Kendi sunucu yok; analitik/telemetri yok. Tek ek istek, `credentials: "omit"` ile `.mpd` manifestinin yeniden okunması.
- **Uzak kod yok:** `eval`, `new Function`, `importScripts`, CDN betiği yok. Yerel fontlar.
- **Açık kaynak:** GPL-3.0, build/minify yok; kod doğrudan denetlenebilir.

Detay: [Wiki → Güvenlik](https://github.com/taroxzen/T-PrimeRes/wiki/G%C3%BCvenlik) · [README → Security](https://github.com/taroxzen/T-PrimeRes#-güvenlik--security-)

## 🙏 Teşekkür / Acknowledgements

Sorumlu bildirim yapan katkıda bulunanlar burada listelenir. / Responsible reporters are listed here.
