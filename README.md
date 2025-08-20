# PolyHarmony Calendar App

A privacy-first calendar application designed specifically for polyamorous relationships. Coordinate schedules with multiple partners while maintaining complete control over privacy settings.

## 🚀 Quick Start

### Demo Mode (Recommended for first-time users)
The easiest way to explore PolyHarmony is through demo mode:

1. Visit the app
2. Click "Try Demo (No Account Required)"
3. Explore all features with sample data

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo>
   cd Calendar_app_01
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### Demo Mode (Default)
Without environment variables, the app runs in demo mode with:
- Sample relationships, events, groups, and group members
- Full CRUD through in-browser persistence (localStorage)
- Demo-only quick actions in Settings
- Safe evaluation without any backend required

### With Supabase Backend (Optional)
If you want to connect to a real Supabase database:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `schemas/mvp_schema.sql`
3. Copy your project URL and anon key to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

## ✨ Features

- Privacy-first event sharing and relationship-aware scheduling
- Month/Week/Day/Roadmap views
- Natural language event creation (scoped MVP)
- Mobile-friendly UI with dark mode and color themes

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS
- **Database**: Optional Supabase (PostgreSQL) or DemoStore (localStorage)
- **Auth**: Supabase Auth (email + password), demo mode fallback

## 📚 Documentation (Canonical)
- Setup Guide: [`docs/SETUP_GUIDE.md`](./docs/SETUP_GUIDE.md)
- Technical Stack: [`docs/TECH_STACK.md`](./docs/TECH_STACK.md)
- Product Requirements (includes roadmap items): [`docs/PRD.md`](./docs/PRD.md)
- Performance Guide: [`docs/PERFORMANCE_OPTIMIZATIONS.md`](./docs/PERFORMANCE_OPTIMIZATIONS.md)
- Handover: [`docs/Handover.md`](./docs/Handover.md)

> Note: The PRD contains aspirational roadmap items. The current shipped implementation is the web app (Next.js + optional Supabase). See the “Current vs Roadmap” section in the PRD.

## 🧪 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking
- `npm run analyze` - Bundle analysis

## 📄 Changelog
See [`CHANGELOG.md`](./CHANGELOG.md) for recent updates.

## 🆘 Support
- Check the [documentation](./docs/) first
- Open an issue for bugs or feature requests