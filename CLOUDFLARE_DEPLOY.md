# راهنمای دیپلوی Pro TooLs روی Cloudflare Pages

## مزایای Cloudflare Pages
✅ سازگاری کامل با کد موجود (Cloudflare Workers)  
✅ KV Database رایگان  
✅ عملکرد بالا و CDN جهانی  
✅ SSL رایگان  
✅ Functions بدون محدودیت  

## مراحل دیپلوی

### 1. آماده‌سازی فایل‌ها
فایل‌های زیر ایجاد شده‌اند:
- ✅ `_wrangler.toml` - پیکربندی Cloudflare
- ✅ `_headers` - تنظیمات امنیتی
- ✅ `_redirects` - مسیریابی API

### 2. ایجاد KV Namespace
در Cloudflare Dashboard:
1. برو به **Workers & Pages** > **KV**
2. کلیک **Create a namespace**
3. نام: `pro-tools-db`
4. Namespace ID را کپی کن

### 3. تنظیم پروژه در Cloudflare Pages

#### روش 1: اتصال Git Repository
1. برو به **Cloudflare Dashboard** > **Pages**
2. کلیک **Create a project**
3. **Connect to Git** را انتخاب کن
4. Repository خود را انتخاب کن
5. تنظیمات Build:
   - **Build command**: `echo "No build required"`
   - **Build output directory**: `/`

#### روش 2: آپلود مستقیم
1. برو به **Cloudflare Dashboard** > **Pages**
2. کلیک **Create a project**
3. **Upload assets** را انتخاب کن
4. تمام فایل‌های پروژه را آپلود کن

### 4. تنظیم Environment Variables
در **Pages** > **Settings** > **Environment variables**:

```
BOT_TOKEN = "your_telegram_bot_token_here"
ADMIN_USER = "your_admin_username"
ADMIN_PASS = "your_admin_password"
```

### 5. تنظیم KV Binding
در **Pages** > **Settings** > **Functions**:
1. **KV namespace bindings** را پیدا کن
2. کلیک **Add binding**
3. Variable name: `DATABASE`
4. KV namespace: `pro-tools-db` (که در مرحله 2 ساختید)

### 6. تست عملکرد
پس از دیپلوی:
1. برو به `your-site.pages.dev/api/health`
2. باید پاسخ زیر را ببینی:
```json
{
  "status": "ok",
  "timestamp": "...",
  "version": "1.0.0",
  "services": {
    "kv": "ok",
    "bot_token": "set",
    "admin_credentials": "set"
  }
}
```

## تنظیم ربات تلگرام

### 1. ایجاد ربات
1. برو به [@BotFather](https://t.me/BotFather) در تلگرام
2. ارسال `/newbot`
3. نام ربات را وارد کن: `Pro TooLs Verify Bot`
4. Username ربات: `protoolsverify_bot` (یا هر نام دیگری)
5. توکن ربات را کپی کن

### 2. تنظیم Webhook (اختیاری)
برای دریافت پیام‌ها:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-site.pages.dev/api/webhook"}'
```

## عیب‌یابی

### خطای "KV not found"
- مطمئن شوید KV namespace ایجاد شده
- بررسی کنید KV binding صحیح تنظیم شده
- Variable name باید دقیقاً `DATABASE` باشد

### خطای "Bot token not configured"
- بررسی Environment Variables
- مطمئن شوید `BOT_TOKEN` تنظیم شده
- ربات باید فعال باشد

### خطای 502 در API
- بررسی Functions logs در Cloudflare Dashboard
- مطمئن شوید تمام Environment Variables تنظیم شده‌اند

## امنیت و بهینه‌سازی

### Headers امنیتی
فایل `_headers` شامل:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### Cache تنظیمات
- فایل‌های static: 1 سال cache
- فایل‌های HTML: بدون cache
- API responses: بدون cache

### CORS
API endpoints دارای CORS headers مناسب هستند.

## نکات مهم

1. **رایگان بودن**: Cloudflare Pages و KV تا حد زیادی رایگان هستند
2. **سرعت**: CDN جهانی برای سرعت بالا
3. **امنیت**: SSL خودکار و Headers امنیتی
4. **مقیاس‌پذیری**: تا میلیون‌ها درخواست در ماه

## پشتیبانی
در صورت بروز مشکل:
1. بررسی Functions logs در Cloudflare Dashboard
2. تست API endpoints با Postman یا curl
3. بررسی Environment Variables و KV bindings
