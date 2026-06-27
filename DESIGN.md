# Design Document — Grab Philippines (grab.com/ph)

## 1. Tổng quan thương hiệu (Brand Overview)

| Thuộc tính | Giá trị |
|---|---|
| **Tên thương hiệu** | Grab |
| **Tagline chính** | "The Everyday Everything App" |
| **Tagline hero** | "Making every day better." |
| **Tagline footer** | "Forward Together" |
| **Định vị** | Superapp hàng đầu Đông Nam Á |
| **Thị trường** | Philippines (PH) |
| **Giọng điệu** | Thân thiện, tin cậy, trao quyền, cộng đồng |

---

## 2. Màu sắc (Color Palette)

### Màu chính (Primary)

| Tên | Hex | Dùng cho |
|---|---|---|
| **Grab Green** | `#00B14F` | CTA chính, icon dịch vụ, điểm nhấn thương hiệu |
| **Grab Dark Green** | `#00873A` | Hover state của nút xanh |
| **Grab Deep Teal / Near-Black** | `#00212F` | Nền tối, headline lớn, footer background |

### Màu phụ (Secondary)

| Tên | Hex | Dùng cho |
|---|---|---|
| **White** | `#FFFFFF` | Nền card, text trên nền tối |
| **Light Gray** | `#F5F5F5` | Nền section xen kẽ |
| **Mid Gray** | `#767676` | Body text phụ, metadata |
| **Dark Gray** | `#333333` | Body text chính |

### Quy tắc sử dụng màu
- Xanh Grab (`#00B14F`) chỉ dùng cho CTA, brand accent — **không** làm nền toàn màn hình.
- Hero section dùng nền video/ảnh tối với text trắng.
- Section impact / newsroom xen kẽ nền trắng và nền xám nhạt để tạo nhịp điệu.
- Footer: nền `#00212F` (dark teal), text trắng.

---

## 3. Typography

### Font chữ
Grab sử dụng font sans-serif clean, hiện đại — gần với **Grab Ney** (font thương hiệu nội bộ) hoặc fallback sang `"Helvetica Neue", Arial, sans-serif`.

### Thang đo chữ (Type Scale)

| Cấp độ | Size (desktop) | Weight | Dùng cho |
|---|---|---|---|
| **Hero H1** | 56–72px | 700 (Bold) | Headline hero chính |
| **Section H2** | 36–42px | 700 | Tiêu đề section |
| **Card H3** | 20–24px | 600 | Tiêu đề card/dịch vụ |
| **Subtitle** | 16–18px | 400 | Mô tả ngắn dưới tiêu đề |
| **Body** | 15–16px | 400 | Nội dung thông thường |
| **Label / Tag** | 12–13px | 600 | Nhãn danh mục, metadata ngày tháng |
| **CTA Button** | 15–16px | 600 | Text trong nút bấm |

### Quy tắc Typography
- Heading luôn dùng weight Bold (700).
- Line-height: 1.3 cho heading, 1.6 cho body text.
- Letter-spacing heading lớn: nhẹ âm (−0.5px đến −1px) để trông chắc chắn hơn.
- Text-transform: không dùng ALL CAPS cho heading chính; dùng Title Case.

---

## 4. Layout & Grid

### Breakpoints

| Tên | Width |
|---|---|
| Mobile | < 768px |
| Tablet | 768px – 1024px |
| Desktop | 1025px – 1440px |
| Wide | > 1440px |

### Container
- Max-width: **1200px** (nội dung), căn giữa, padding ngang 24px (mobile) / 40px (desktop).
- Full-bleed sections (hero, footer): 100vw.

### Grid System
- Desktop: 12-column grid, gutter 24px.
- Card grids dịch vụ: 3–4 cột trên desktop, 2 cột tablet, 1 cột mobile.
- Impact cards: horizontal scroll carousel trên mobile, 2–3 cột trên desktop.

---

## 5. Thành phần UI (Components)

### 5.1 Navigation (Header)

```
[Logo]  [Mega-menu: About | Consumer | Driver | Merchant | Enterprise]  [What's New] [Be Our Partner ▾] [Help] [🌐 Country]
```

- **Sticky header**, nền trắng, đổ bóng nhẹ khi cuộn.
- Logo Grab: icon + wordmark màu xanh `#00B14F`.
- Mega-menu: dropdown chia cột với heading `<h4>` và mô tả ngắn.
- Mobile: hamburger menu → slide-in drawer.
- Country selector: dropdown với danh sách 8 quốc gia Đông Nam Á.

### 5.2 Hero Section

```
[Full-screen video background — autoplay, loop, muted]
  ┌─────────────────────────────────┐
  │  Grab.                          │
  │  Making every day better.       │
  │                                 │
  │  [Read About Us]  [Download App]│
  └─────────────────────────────────┘
```

- Video: `.webm` format, autoplay, loop, muted, object-fit cover.
- Overlay: gradient tối từ bottom-left để text dễ đọc.
- Headline: H1, trắng, 56–72px bold.
- 2 CTA nút: Primary (xanh solid) + Secondary (outline trắng).

### 5.3 Service Tab Switcher

```
[Consumer] [Driver] [Merchant] [Enterprise]
──────────────────────────────────────────
  Deliveries          Mobility     Financial Services
  [Food] [Mart]       [Rides]      [Pay] [Insurance]
  [Express] [Pabili]               [Loans] [Bills]
```

- Tab bar với 4 audience targets.
- Active tab: gạch chân xanh `#00B14F` + text đậm.
- Service items: icon + tên + mô tả ngắn, dạng link card.
- "Show More / Show Less" toggle với icon `+` / `−`.

### 5.4 Impact Cards (Carousel)

```
◀  [Card 1: Economic Impact]  [Card 2: Asenso]  [Card 3: ...] ▶
     Title (bold)
     Body text với **bold** highlights
     [Learn More →]
```

- Horizontal carousel với navigation arrows (`◀` `▶`).
- Card: nền trắng, border-radius 12px, box-shadow nhẹ.
- Nội dung dùng bullet list với số liệu được bold.
- CTA "Learn More" dạng text link xanh.
- Dot indicator hoặc arrow-only.

### 5.5 Newsroom Section

```
Section title: "Newsroom"

[DD/MM/YY]  Headline title text here...           [Read More →]
[DD/MM/YY]  Another news headline title           [Read More →]
[DD/MM/YY]  Third news item here                  [Read More →]
[DD/MM/YY]  Fourth news item                      [Read More →]

                              [More News Releases →]
```

- Danh sách đơn giản, không dùng card phức tạp.
- Date: small, gray, monospace hoặc tabular numbers.
- Headline: link, màu dark, hover → xanh Grab.
- "More News Releases": button outline hoặc text link.

### 5.6 Footer

```
┌─────────────────────────────────────────────────────────────┐
│ [Grab Logo]   Forward Together                               │
│ Address: Level 27F/28F Exquadra Tower, Ortigas, Pasig        │
│ [FB] [IG] [TW] [TT] [YT] [LI]                               │
│ [PH ▾] SG | MY | ID | TH | VN | PH | MM | KH                │
│──────────────────────────────────────────────────────────────│
│ About    Consumer    Driver    Merchant   Enterprise  Links   │
│ ...      ...         ...       ...        ...         ...     │
│──────────────────────────────────────────────────────────────│
│ [App Store]  [Google Play]  [AppGallery]                      │
│ Terms & Policies • Privacy Notice                            │
│ © Grab 2010 - 2026                                           │
└─────────────────────────────────────────────────────────────┘
```

- Nền: `#00212F` (dark teal near-black), text trắng/xám nhạt.
- 6 cột link: About, Consumer, Driver, Merchant, Enterprise, Quick Links.
- Social icons: circle hoặc flat, màu trắng.
- App badges: ảnh PNG chính thức (App Store, Google Play, AppGallery).

---

## 6. Nút bấm (Buttons)

| Variant | Style |
|---|---|
| **Primary** | Background `#00B14F`, text trắng, border-radius 8px, padding 12px 24px |
| **Secondary / Outline** | Border 2px `#00B14F`, text `#00B14F`, nền trong suốt |
| **Ghost (trên nền tối)** | Border 2px trắng, text trắng |
| **Text Link** | Text `#00B14F`, underline on hover |

- Hover: Primary → `#00873A` (darker green). Outline → fill xanh, text trắng.
- Transition: 200ms ease.
- Border-radius: 8px cho button thông thường, 24px cho pill-style CTA lớn.

---

## 7. Icons & Imagery

### Icons
- Style: Line icons với stroke 2px, đôi chỗ filled cho emphasis.
- Màu: thường xanh Grab hoặc dark gray — không dùng icon màu rực rỡ trừ service identity.
- Kích thước: 24px (nav/body), 32–48px (service tiles).

### Imagery
- **Hero video**: lifestyle footage, sống động, thể hiện người dùng thực tế ở Philippines.
- **Màu sắc ảnh**: warm, vibrant, phản ánh bối cảnh đô thị Philippine.
- **Service icons**: illustrated style thống nhất theo từng sub-brand (GrabFood, GrabMart, GrabExpress, GrabPay…).
- **Impact section**: infographic-style với số liệu rõ ràng.

---

## 8. Cấu trúc trang (Page Structure)

```
1. Header (sticky)
   └── Logo | Mega Nav | Utility Nav

2. Hero Section
   └── Full-bleed video | H1 Headline | 2 CTAs

3. Service Switcher
   └── 4 audience tabs | Service tiles grid | Show more toggle

4. Grab's Contribution to The Philippines
   └── Section title | Horizontal carousel of impact cards

5. Newsroom
   └── Section title | 4 news items list | More link

6. Footer
   └── Brand + Social | Country nav | Link columns | App badges | Legal
```

---

## 9. Sub-brands & Product Lines

| Sub-brand | Màu nhận diện | Dịch vụ |
|---|---|---|
| **GrabFood** | Đỏ cam `#FF6B35` | Giao đồ ăn |
| **GrabMart** | Xanh lá Grab | Giao hàng tạp hóa |
| **GrabExpress** | Xanh dương `#1A73E8` | Giao hàng nhanh |
| **GrabPay** | Tím `#7B5EA7` | Thanh toán |
| **GrabCar / Transport** | Xanh Grab | Di chuyển |
| **GrabAds** | Cam vàng | Quảng cáo |
| **GrabMaps** | Xanh đậm | Bản đồ & dữ liệu |

---

## 10. Ngôn ngữ thiết kế (Design Language)

### Nguyên tắc cốt lõi
1. **Tin cậy** — Giao diện sạch, có trật tự, không gây rối. Thông tin quan trọng dễ thấy.
2. **Trao quyền** — Mọi CTA đều rõ ràng về lợi ích người dùng nhận được.
3. **Cộng đồng** — Ngôn ngữ ấm, gần gũi; dùng từ địa phương (vd: "Pabili", "Diskarte").
4. **Tốc độ** — Layout thoáng, không rối mắt; hierarchy rõ để người dùng scan nhanh.

### Spacing System (8px base)
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 40px, 2xl: 64px, 3xl: 96px

### Elevation / Shadow
- Level 1 (card): `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`
- Level 2 (dropdown, modal): `box-shadow: 0 8px 24px rgba(0,0,0,0.14)`
- Level 3 (sticky header scroll): `box-shadow: 0 2px 12px rgba(0,0,0,0.10)`

### Border Radius
- Small (button, tag): 8px
- Medium (card): 12px
- Large (modal, drawer): 16px
- Pill (chip, badge): 999px

---

## 11. Motion & Animation

- **Durée chuẩn**: 200ms (micro), 300ms (transition), 500ms (modal)
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard)
- Carousel: slide horizontal, 300ms ease-in-out.
- Dropdown mega-menu: fade + translateY(−8px → 0), 200ms.
- Tab switcher: underline slide, 200ms.
- Hover CTA: background color transition, 200ms.

---

## 12. Accessibility

- Color contrast tối thiểu WCAG AA (4.5:1 cho text thường, 3:1 cho large text).
- Focus states rõ ràng: outline 2px xanh Grab.
- Skip-to-content link ẩn cho keyboard users.
- Alt text đầy đủ cho tất cả ảnh có nội dung.
- Video hero có `muted`, `autoplay` với option dừng cho người dùng.
- Mega-menu accessible bằng keyboard (Tab, Enter, Escape).

---

## 13. Tài nguyên kỹ thuật (Assets & CDN)

- **CDN chính**: `https://assets.grab.com/wp-content/uploads/media/`
- **Icons hệ thống**: `https://assets.grab.com/wp-content/uploads/media/grab21/icons/`
- **Video hero (WebM)**: `https://assets.grab.com/wp-content/uploads/media/videos/`
- **App badges**: AppStore.png, GooglePlay.png, AppGallery.png
- **Social icons**: SVG inline hoặc PNG từ CDN

---