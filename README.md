# T-PrimeRes — Nothing

Prime Video oynatıcısının **o anki gerçek çözünürlüğünü** gösteren Chrome/Brave eklentisi.
Sabitlenen toolbar düğmesine basınca popup açılır ve tarama otomatik başlar. Ekstra tık yok.

## Kurulum (Brave / Chrome)

1. `brave://extensions` adresini aç.
2. Sağ üstten **Geliştirici modu**nu aç.
3. **Paketlenmemiş öğe yükle** → `PrimeRes` klasörünü seç.
4. Araç çubuğundaki yapboz ikonuna tıkla → T-PrimeRes yanındaki **Sabitle**yi seç.
   - Not: Tarayıcı API'si eklentiyi programatik olarak sabitlemeye izin vermez; bu adım elle yapılır.

## Kullanım

1. Prime Video'da bir içerik başlat.
2. Sabitlenen T-PrimeRes düğmesine tıkla.
3. Popup otomatik tarar; sonuç hazır gelir.

Düğme üzerindeki rozet de güncel yüksekliği gösterir:

| Rozet | Anlamı |
|---|---|
| `4K` | 2160p ve üzeri (yeşil) |
| `2K` | 1440p |
| `1080` | Full HD |
| `720` | HD |
| `SD` | 720p altı (sarı) |

`RE-SCAN` başlatıldıktan sonra oynatıcıya geçip tekrar denemek için kullanılır.

## Çözünürlük nasıl bulunuyor

| Katman | Yöntem |
|---|---|
| Ana | Prime Video'un DASH `*.mpd` manifest'i XHR ve `fetch` üzerinden yakalanır; video `Representation` değerlerinden `width/height`, codec, FPS ve HDR okunur. |
| Doğrulama | `<video>.videoWidth / videoHeight` — o an çözülen gerçek kare boyutu. |
| Kurtarma | Manifest yakalanamadıysa `performance.getEntriesByType("resource")` içindeki `.mpd` URL'leri yeniden okunur. |

Eklenti yalnızca `primevideo.com` ve manifest'te listelenen `amazon` alan adlarında çalışır. Veri toplamaz, MPD dışında ağ isteği yapmaz.

Sinema filmleri 2.2:1 kırpılmış kareyle gelir (ör. `1280 × 582`). Bu durumda hero sayı, genişlikten nominal sınıfı geri çıkarır (`720`), `DIMENSIONS` satırı gerçek pikseli gösterir ve `[CROP]` notu eklenir.

## Dosyalar

```
PrimeRes/
├── manifest.json              MV3 tanımı
├── background/service-worker _toolbar rozeti
├── content/probe.js           MAIN world: MPD + video ölçümü
├── content/bridge.js          izole world: mesaj köprüsü
├── popup/                     Nothing temalı arayüz
├── fonts/                     Doto, Space Grotesk, Space Mono (yerel)
└── icons/                     16 / 48 / 128 px
```

## Tasarım

Nothing Design sistemi, koyu mod. Fontlar yerel WOFF/TTF olarak paketlendi; Google Fonts'a canlı bağlantı yok.
Hiyerarşi: Doto hero sayı → Space Grotesk metin → Space Mono ALL CAPS label. Gri skala 4 seviye.
Kırmızı yalnızca hata durumunda; veri durumu yeşil/sarı ile gösterilir.

## Doğrulama (Brave, 21.11.2026)

Gerçek Prime Video oturumunda, oynatma sırasında ölçülen değerler:

| Alan | Sonuç |
|---|---|
| Video karesi | `1280 × 582` |
| Nominal sınıf | `720P / HD` (2.2:1 kırpma) |
| MPD maksimum | `1920 × 872` → `1080P` |
| Representation | 12 (video) + 54 (ses) |
| Codec / FPS | H.264 (`avc1`), 25 FPS, HDR yok |
| Düşen kare | 0 |

Popup, segment göstergesi ve rozet mantığı bu veriyle görsel olarak kontrol edildi.

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| `[NO BRIDGE]` | Prime Video sekmesini yenile, eklentiyi `brave://extensions` sayfasından yeniden yükle. |
| `[NO MPD]` | Oynatıcıyı başlat, birkaç saniye bekle, `RE-SCAN` yap. |
| Rozet görünmüyor | Eklentiyi araç çubuğuna sabitle. |
| `— / —` | Video henüz yüklenmemiş; oynatmayı başlat. |

## Lisans

GPL-3.0. Detaylar: [`LICENSE`](LICENSE). Telif: Taroxzen, 2026.
